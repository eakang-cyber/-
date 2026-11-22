# 04. 데이터 모델 설계 (Phase 3 대상, PostgreSQL / Supabase)

DDL 초안: [`schema.sql`](./schema.sql). 코드상 타입 원본: `src/engine/chart.ts`(BirthInput·ChartResult), `src/rules/registry.ts`(RuleRecord), `src/content/sample.ts`(ArchiveRecord·ChoiceInput).

## 원칙
1. **계산 결과는 저장하지 않고 재계산할 수 있어야 한다.** 저장하는 것은 입력 + `engine_version` + `rules_version` + `policy`. 리포트 스냅샷만 예외(구매 당시 내용 보존).
2. **출생 정보·관계 정보·기록은 민감 정보**로 보고 컬럼 단위 암호화(pgcrypto 또는 KMS envelope), 행 단위 접근 통제(RLS: `owner_id = auth.uid()`).
3. **제3자(상대방) 정보는 최소 수집**: 이름 대신 별칭, 동의 확인 시각과 방식 기록, 기본 보관 30일 후 자동 삭제(정책 확정 필요).
4. **삭제 요청은 실제 삭제**(soft delete 금지, 결제 기록은 법정 보관 항목만 분리 보관).
5. 로그·분석 이벤트에 생년월일·시각·이름을 넣지 않는다(이벤트는 화면·행동만).

## 엔터티

```
users ─┬─ birth_profiles (본인 1 + 필요 시 추가)
       ├─ partners (제3자, 동의 기록 필수)
       ├─ archive_records (사건·목표·질문·회고)
       ├─ choices (선택 실험실)
       ├─ personal_questions (리포트 개인화 질문, 최대 3/구매)
       ├─ orders ── payments (Toss 결제 승인·취소 이력)
       ├─ entitlements (구매로 열린 리포트 권한)
       └─ report_snapshots (구매 시점 리포트 고정본)

interpretation_rules (규칙 레지스트리, 버전 관리) ── rule_reviews (검수 이력)
engine_releases (엔진 버전·검증 결과 요약)
```

| 테이블 | 핵심 컬럼 | 비고 |
|---|---|---|
| `birth_profiles` | owner_id, nickname, calendar, birth_date_enc, birth_time_enc(null=모름), is_leap_month, city_id, sex(nullable), policy jsonb | 원본 입력만 저장 |
| `partners` | owner_id, alias, birth_*_enc, relation_type, consent_method, consented_at, expires_at | 만료 자동 삭제 |
| `archive_records` | owner_id, type, year, month, title_enc, note_enc, linked_profile_id | 사용자 작성 사실 |
| `interpretation_rules` | rule_id, version, rule_name, source_title, source_location, school, conditions jsonb, interpretation, alternative_interpretations[], conflicts[], review_status, confidence_in_source, last_reviewed_at | `(rule_id, version)` PK, 승인본만 운영 노출 |
| `orders` | id, owner_id, product_code, amount, status, idempotency_key UNIQUE | 중복 결제 방지 |
| `payments` | order_id, provider='toss', payment_key UNIQUE, approved_at, raw_masked jsonb | 서버 승인 API 결과만 신뢰 |
| `report_snapshots` | owner_id, profile_id, engine_version, rules_version, content jsonb, created_at | 구매 당시 내용 |

## 결제 흐름 (Toss Payments)
1. 서버에서 `orders` 생성(금액은 서버 상수, 클라이언트 값 무시) + `idempotency_key`.
2. 클라이언트 결제창 → successUrl로 `paymentKey, orderId, amount` 수신.
3. 서버가 `orders.amount`와 비교 후 Toss **승인 API** 호출(비밀 키는 서버 환경 변수만).
4. 승인 성공 시 트랜잭션으로 `payments` 기록 + `entitlements` 부여. 같은 `paymentKey` 재요청은 무시.
5. 웹훅으로 취소·환불 동기화. 환불 시 entitlement 회수.

## AI 설명자 입출력 (Claude API 어댑터)
- 입력: `{chart(검증된 계산 결과), ruleHits[{rule_id, facts}], interest, consentedRecords[], style}` — **원국 계산을 모델에 맡기지 않음.**
- 출력 JSON 스키마: `{title, body, evidenceRuleIds[], alternatives[], reflectionQuestion, practicalSuggestion}`.
- 사후 검사: 금지어(사망·파산·확률·반드시 등), 등록되지 않은 rule_id, 한자 비율, 문장 반복, 입력과 무관한 범용 문장(다른 출생정보 입력 시 유사도 비교).
- 어댑터 인터페이스: `ExplainerProvider.explain(input): Promise<Output>` — 모델·공급자 교체 가능, 키는 서버 전용.
