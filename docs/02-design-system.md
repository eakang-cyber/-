# 02. 디자인 시스템

토큰 원본: `src/app/globals.css`의 `@theme`. 컴포넌트: `src/ui/kit.tsx`, `src/ui/layout.tsx`, `src/ui/charts.tsx`.

## 색

| 토큰 | 값 | 용도 |
|---|---|---|
| `night` | #101827 Midnight Navy | 바탕 |
| `deep` | #172238 Deep Navy | 카드·면 |
| `raised` | #1d2a44 | 선택·강조 면 |
| `line` | #2a3a5a | 구분선 |
| `gold` | #DCC18D Champagne Gold | 주요 버튼, 선택 상태, 아이브로 — **한 화면에 한두 곳만** |
| `ivory` | #F6F2EA | 본문 글자, '종이' 카드(공유 카드·리포트 샘플·가격) |
| `mist` | #AAB6C8 Soft Gray | 보조 글자 |
| `faint` | #7d8aa1 | 3차 글자(night 위 5.1:1) |
| `ok` / `warn` | #6fbf9a / #e3b25c | 현실 조언·내 기록 / 데모·샘플·미검증 상태 |

대비(실측): ivory/night 15.9:1 · mist/night 8.7:1 · faint/night 5.1:1, faint/deep 4.6:1 · ink-soft/ivory 6.8:1 · ink/gold 버튼 10.2:1 — 모두 WCAG AA(4.5:1) 이상.

### 인생 지도 범주색 (주제군 5종)
dataviz 검증기로 다크 면(#172238) 기준 **명도 대역·채도·색각이상 분리·정상시 분리·대비 모두 통과**한 고정 순서:
표현과 생산 `#118659` → 배움과 보호 `#8962c5` → 현실과 성과 `#b88c2e` → 나와 동료 `#2d86c8` → 책임과 규칙 `#d4675b`.
- 색은 **범주**(주제)이지 높낮이가 아니다. 범례는 항상 표시하고 선택한 칸에는 이름을 글자로 함께 쓴다(색 단독 전달 금지).
- 오행 개수 막대는 단일 색(gold) + 숫자 직접 표기, "점수가 아님" 캡션.

## 타이포그래피

| 역할 | 서체 | 사용 |
|---|---|---|
| 디스플레이 | Noto Serif KR 600/700 | 화면 제목, 핵심 문장, 카드 제목(에디토리얼 톤) |
| 본문 | IBM Plex Sans KR 400/500/600 | 본문·UI |
| 데이터 | IBM Plex Mono | rule_id, 계산 근거 |

크기: 히어로 2.05→3.1rem, 화면 제목 1.75→2.1rem, 섹션 1.45rem, 카드 제목 1.05~1.12rem, 본문 0.92~1rem(행간 1.65), 캡션 0.72~0.82rem. 한국어 줄바꿈은 `word-break: keep-all`.

## 레이어 배지 — 계산과 해설을 시각적으로 분리
`계산`(gold) · `전통 해석`(mist) · `해설 문안`(faint) · `내 기록`(ok) · `현실 조언`(ok) · `데모`/`샘플`/`미검증`(warn) · `프리미엄`(gold).
모든 해석 카드 하단에는 **해석의 근거 보기**(계산 근거 → rule 레코드 → 다른 해석)가 있다.

## 컴포넌트
`Button`(primary/ghost/quiet/paper) · `Segmented`(라디오 그룹) · `Field`+`inputCls` · `ReadingCard` · `Evidence` · `Notice`(info/warn/demo) · `PremiumGate`(무엇이 열리는지 설명, 내용을 흐리게 가리지 않음) · `DecadeStrip` · `YearRibbon` · `GroupLegend` · `SampleBanner` · `CalcStatus` · `NextStep`.

## 레이아웃·모션·접근성
- 모바일 단일 컬럼(최대 46rem), 좌우 여백 `max(16px, safe-area)`, 하단 탭 5개(엄지 영역), 입력 단계는 하단 고정 버튼.
- 데스크톱(≥1024px) 좌측 내비게이션 16rem + 넓은 읽기 컬럼.
- 화면 전환은 420ms 페이드·6px 상승 한 가지. `prefers-reduced-motion`에서 제거.
- 모든 컨트롤 키보드 접근, `:focus-visible` 금색 외곽선, 탭/라디오/옵션 ARIA 역할, 토스트 `aria-live`.

## 금지
챗봇 대화창 중심 UI, 운세 점수, 별·반짝임·과도한 금장, 한자 본문 노출(전문가 보기·근거에서만), 가짜 후기·실시간 결제 알림, 근거 없는 그래프.
