"use client";
import { useStore } from "@/state/store";
import { Page, ScreenTitle, SampleBanner, CalcStatus } from "@/ui/layout";
import { Badge, Card, Notice, SectionHead, Segmented, cx } from "@/ui/kit";
import { RULES, RULES_VERSION } from "@/rules/registry";
import { ENGINE_VERSION, TimeBasis, ZiPolicy, hiddenStemsOf } from "@/engine/chart";
import {
  BRANCHES, BRANCHES_KO, ELEMENT_HANJA, ELEMENT_KO, STEMS, STEMS_KO, TEN_GOD_HANJA, TEN_GOD_KO, branchMainStem, tenGod,
} from "@/engine/constants";
import { cityById } from "@/engine/cities";
import { equationOfTimeMinutes, fmtUtcAsKst, fmtWall, msToWall, pad2 } from "@/engine/time";

const BASIS_LABEL: Record<TimeBasis, string> = { clock: "표준시 그대로", lmt: "경도 보정", apparent: "진태양시" };
const BASIS_DESC: Record<TimeBasis, string> = {
  clock: "시계에 적힌 시각을 그대로 씁니다.",
  lmt: "출생 도시의 경도만큼 해의 위치를 반영합니다(평균태양시).",
  apparent: "경도 보정에 계절에 따른 해의 빠르고 느림(균시차)까지 반영합니다.",
};
const MIN = 60_000;

const fmtMin = (m: number) => `${m >= 0 ? "+" : "−"}${Math.abs(m).toFixed(1)}분`;
const hm = (w: { h: number; mi: number }) => `${pad2(w.h)}:${pad2(w.mi)}`;

export function Method() {
  const { chart, state, dispatch, subject } = useStore();
  const city = cityById(subject.cityId);
  const walls: Record<TimeBasis, ReturnType<typeof msToWall>> = {
    clock: msToWall(chart.utcMs + chart.tzOffsetMin * MIN),
    lmt: msToWall(chart.utcMs + Math.round(city.lon * 4 * MIN)),
    apparent: msToWall(chart.utcMs + Math.round((city.lon * 4 + equationOfTimeMinutes(chart.utcMs)) * MIN)),
  };
  const setPolicy = (p: Partial<typeof state.policy>) => dispatch({ type: "setPolicy", policy: { ...state.policy, ...p } });
  const hc = chart.hourCheck;
  const jie = chart.luck.direction === "backward" ? chart.prevJie : chart.nextJie;
  const diffDays = chart.luck.startYears * 3;
  const maxCount = Math.max(1, ...chart.elementCounts);

  const pillars = [
    { k: "태어난 시", p: chart.pillars.hour, pos: "hour" as const },
    { k: "태어난 날", p: chart.pillars.day, pos: "day" as const },
    { k: "태어난 달", p: chart.pillars.month, pos: "month" as const },
    { k: "태어난 해", p: chart.pillars.year, pos: "year" as const },
  ];

  const tests = [
    { name: "일반 날짜(일주 400일 표본 교차 확인)", auto: true },
    { name: "입춘 전후(2025-02-03 23:10 경계)", auto: true },
    { name: "절기 경계(독립 태양황경식과 30분 이내)", auto: true },
    { name: "음력 윤달(2023 윤2월, 없는 윤달 오류)", auto: true },
    { name: "자시 경계(23시 날짜 변경 정책 2종)", auto: true },
    { name: "출생시간 미상(시주 제외·경고)", auto: true },
    { name: "시간대 변경(1988 서머타임, 1954~61 UTC+8:30)", auto: true },
    { name: "1996-03-27 09:58 서울(세 기준 모두 丙子 辛卯 癸亥 丁巳)", auto: true },
  ];

  return (
    <Page>
      <SampleBanner />
      <ScreenTitle eyebrow="계산 기준과 근거" title="이 결과는 어떻게 만들어지나요"
        desc="운명OS는 계산과 설명을 분리합니다. 사주 글자는 정해진 규칙으로만 계산하고, 언어 모델은 계산에 관여하지 않습니다.">
        <CalcStatus />
      </ScreenTitle>

      {/* 1. 파이프라인 */}
      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="1 · 구조" title="계산과 설명은 서로 다른 단계입니다" />
        <ol className="flex flex-col sm:flex-row sm:flex-wrap items-stretch gap-2">
          {[
            { t: "출생 정보", d: "날짜·시간·도시", tag: "입력" },
            { t: "결정론적 계산 엔진", d: "절기·시간대·경도 보정", tag: "계산" },
            { t: "전통 규칙", d: "rule_id로 추적", tag: "규칙" },
            { t: "해설 계층", d: "지금은 편집 문안, Phase 3에 AI", tag: "설명" },
            { t: "화면", d: "근거 보기와 함께 표시", tag: "출력" },
          ].map((s, i, arr) => (
            <li key={s.t} className="flex sm:flex-1 sm:min-w-[8.5rem] items-center gap-2">
              <div className={cx("flex-1 rounded-xl border p-3", s.tag === "계산" ? "border-gold/50 bg-gold/5" : "border-line bg-deep")}>
                <p className="text-[0.68rem] tracking-[0.12em] text-faint">{s.tag}</p>
                <p className="text-[0.92rem] font-medium text-ivory">{s.t}</p>
                <p className="text-[0.78rem] text-mist">{s.d}</p>
              </div>
              {i < arr.length - 1 && <span aria-hidden className="text-faint sm:hidden">↓</span>}
              {i < arr.length - 1 && <span aria-hidden className="text-faint hidden sm:inline">→</span>}
            </li>
          ))}
        </ol>
        <p className="text-[0.86rem] text-mist">같은 출생 정보와 같은 규칙 버전이면 결과는 언제나 같습니다. 엔진 <span className="font-mono">{ENGINE_VERSION}</span> · 규칙 <span className="font-mono">{RULES_VERSION}</span></p>
      </section>

      {/* 2. 시간 기준 */}
      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="2 · 시간 기준" title="태어난 시각을 어떤 기준으로 읽을까요"
          desc={`한국 표준시는 동경 135도 기준이지만, ${city.name}은 동경 ${city.lon}도에 있습니다. 그래서 시계의 ${subject.timeKnown ? `${subject.hour}시 ${subject.minute}분` : "시각"}과 해의 위치로 본 시각이 다릅니다. 기준을 바꾸면 이 앱의 모든 결과가 다시 계산됩니다.`} />
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-[0.85rem] text-faint">시간 기준</p>
            <Segmented<TimeBasis> label="시간 기준" value={state.policy.timeBasis} onChange={(v) => setPolicy({ timeBasis: v })}
              options={(["clock", "lmt", "apparent"] as TimeBasis[]).map((v) => ({ value: v, label: BASIS_LABEL[v] }))} size="sm" />
            <p className="text-[0.82rem] text-mist">{BASIS_DESC[state.policy.timeBasis]}</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[0.85rem] text-faint">자정 무렵(23시대) 날짜 기준</p>
            <Segmented<ZiPolicy> label="자시 기준" value={state.policy.ziPolicy} onChange={(v) => setPolicy({ ziPolicy: v })}
              options={[{ value: "zi23", label: "23시에 날짜 변경" }, { value: "midnight", label: "0시에 날짜 변경(야자시)" }]} size="sm" />
          </div>
        </Card>

        {subject.timeKnown && hc ? (
          <>
            <div className="overflow-x-auto rounded-2xl border border-line/70">
              <table className="w-full min-w-[30rem] text-[0.88rem] tabular">
                <thead className="bg-raised text-left text-mist">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">기준</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">보정</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">계산에 쓰는 시각</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">태어난 시</th>
                  </tr>
                </thead>
                <tbody>
                  {(["clock", "lmt", "apparent"] as TimeBasis[]).map((b) => {
                    const corr = b === "clock" ? 0 : b === "lmt" ? chart.lonCorrectionMin : chart.lonCorrectionMin + chart.eotMin;
                    const active = state.policy.timeBasis === b;
                    return (
                      <tr key={b} className={cx("border-t border-line/60", active && "bg-gold/5")}>
                        <th scope="row" className={cx("px-4 py-2.5 text-left font-medium", active ? "text-gold" : "text-ivory")}>{BASIS_LABEL[b]}{active ? " · 사용 중" : ""}</th>
                        <td className="px-4 py-2.5 text-mist">{b === "clock" ? "없음" : fmtMin(corr)}</td>
                        <td className="px-4 py-2.5">{hm(walls[b])}</td>
                        <td className="px-4 py-2.5">{BRANCHES_KO[hc.byBasis[b]]}시 <span className="text-faint">{BRANCHES[hc.byBasis[b]]}時</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Notice tone={hc.consistent ? "info" : "warn"} title={hc.consistent ? "기준별 차이 없음" : "기준에 따라 결과가 달라집니다"}>
              시계 시각 {pad2(subject.hour)}:{pad2(subject.minute)}(UTC+{Math.floor(chart.tzOffsetMin / 60)}{chart.tzOffsetMin % 60 ? `:${pad2(chart.tzOffsetMin % 60)}` : ""}) → 경도 보정 {fmtMin(chart.lonCorrectionMin)} → 약 {hm(walls.lmt)}, 균시차 {fmtMin(chart.eotMin)}까지 더한 진태양시 약 {hm(walls.apparent)}.{" "}
              {hc.consistent
                ? `세 기준 모두 같은 '${BRANCHES_KO[hc.byBasis.clock]}시(${BRANCHES[hc.byBasis.clock]}時)'로 계산되어 기준 선택이 결과를 바꾸지 않습니다.`
                : "기준마다 태어난 시의 글자가 다릅니다. 출생 기록과 가족 기억을 함께 확인해 보세요."}{" "}
              현재 기준에서 가장 가까운 시 경계까지 약 {Math.round(hc.minutesFromBoundary)}분입니다.
            </Notice>
          </>
        ) : (
          <Notice tone="warn" title="출생시간 미상">태어난 시를 계산하지 않으므로 시간 기준은 날짜(일주)에만 영향을 줄 수 있습니다. 정오를 기준으로 날짜를 정했습니다.</Notice>
        )}
        <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-[0.84rem]">
          <dt className="text-faint">출생 도시</dt><dd className="text-mist">{city.name} · 동경 {city.lon.toFixed(2)}° (좌표 근사값)</dd>
          <dt className="text-faint">당시 시간대</dt><dd className="text-mist">UTC{chart.tzOffsetMin >= 0 ? "+" : ""}{(chart.tzOffsetMin / 60).toFixed(chart.tzOffsetMin % 60 ? 1 : 0)} (IANA Asia/Seoul 역사 규칙 자동 반영){chart.tzAnomaly !== "none" ? " · 서머타임 경계 주의" : ""}</dd>
          <dt className="text-faint">계산 기준 시각</dt><dd className="text-mist tabular">{fmtWall(chart.basisWall)}</dd>
          <dt className="text-faint">양력 / 음력</dt><dd className="text-mist tabular">{chart.solarDate.y}.{pad2(chart.solarDate.m)}.{pad2(chart.solarDate.d)} / 음력 {chart.lunarDate.y}.{chart.lunarDate.leap ? "윤" : ""}{pad2(chart.lunarDate.m)}.{pad2(chart.lunarDate.d)}</dd>
        </dl>
      </section>

      {/* 3. 원국 표 */}
      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="3 · 전문가 보기" title="여덟 글자 원국표" desc="이 화면에서만 한자와 명리 용어를 그대로 표시합니다. 위 칸은 드러난 글자(천간), 아래 칸은 바탕 글자(지지)입니다." />
        <div className="overflow-x-auto rounded-2xl border border-line/70">
          <table className="w-full min-w-[32rem] text-[0.86rem] text-center">
            <thead className="bg-raised text-mist">
              <tr><th scope="col" className="px-3 py-2.5 text-left font-medium">구분</th>{pillars.map((x) => <th key={x.k} scope="col" className="px-3 py-2.5 font-medium">{x.k}</th>)}</tr>
            </thead>
            <tbody>
              <tr className="border-t border-line/60">
                <th scope="row" className="px-3 py-2 text-left font-medium text-faint">천간 십성</th>
                {pillars.map(({ k, p, pos }) => <td key={k} className="px-3 py-2 text-mist">{p ? (pos === "day" ? "일간(나)" : `${TEN_GOD_KO[tenGod(chart.dayMaster, p.stem)]} ${TEN_GOD_HANJA[tenGod(chart.dayMaster, p.stem)]}`) : "—"}</td>)}
              </tr>
              <tr className="border-t border-line/60">
                <th scope="row" className="px-3 py-2 text-left font-medium text-faint">천간</th>
                {pillars.map(({ k, p }) => <td key={k} className="px-3 py-3">{p ? <><span className="font-display text-[1.5rem] text-ivory">{STEMS[p.stem]}</span><span className="block text-[0.75rem] text-mist">{STEMS_KO[p.stem]} · {ELEMENT_KO[Math.floor(p.stem / 2)]}</span></> : <span className="text-faint">미상</span>}</td>)}
              </tr>
              <tr className="border-t border-line/60">
                <th scope="row" className="px-3 py-2 text-left font-medium text-faint">지지</th>
                {pillars.map(({ k, p }) => <td key={k} className="px-3 py-3">{p ? <><span className="font-display text-[1.5rem] text-ivory">{BRANCHES[p.branch]}</span><span className="block text-[0.75rem] text-mist">{BRANCHES_KO[p.branch]} · {ELEMENT_KO[Math.floor(branchMainStem(p.branch) / 2)]}</span></> : <span className="text-faint">미상</span>}</td>)}
              </tr>
              <tr className="border-t border-line/60">
                <th scope="row" className="px-3 py-2 text-left font-medium text-faint">지지 십성</th>
                {pillars.map(({ k, p }) => <td key={k} className="px-3 py-2 text-mist">{p ? `${TEN_GOD_KO[tenGod(chart.dayMaster, branchMainStem(p.branch))]} ${TEN_GOD_HANJA[tenGod(chart.dayMaster, branchMainStem(p.branch))]}` : "—"}</td>)}
              </tr>
              <tr className="border-t border-line/60">
                <th scope="row" className="px-3 py-2 text-left font-medium text-faint">지장간</th>
                {pillars.map(({ k, p }) => <td key={k} className="px-3 py-2 text-mist font-mono text-[0.8rem]">{p ? hiddenStemsOf(p.branch).map((s) => STEMS[s]).join(" ") : "—"}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        {chart.relations.length > 0 && (
          <p className="text-[0.84rem] text-mist">원국 내 관계: <span className="font-mono text-ivory/90">{chart.relations.map((r) => r.label).join(" · ")}</span></p>
        )}
        <Card>
          <p className="text-[0.9rem] font-medium">오행 분포</p>
          <div className="mt-3 flex flex-col gap-2" role="img" aria-label={`오행 개수: ${ELEMENT_KO.map((k, i) => `${k} ${chart.elementCounts[i]}개`).join(", ")}`}>
            {ELEMENT_KO.map((k, i) => (
              <div key={k} className="grid grid-cols-[4.5rem_1fr_1.5rem] items-center gap-3">
                <span className="text-[0.84rem] text-mist">{k} <span className="text-faint">{ELEMENT_HANJA[i]}</span></span>
                <div className="h-3 rounded-r bg-night/60">
                  {chart.elementCounts[i] > 0 && <div className="h-3 rounded-r bg-gold" style={{ width: `${(chart.elementCounts[i] / maxCount) * 100}%` }} />}
                </div>
                <span className="text-[0.84rem] text-ivory tabular text-right">{chart.elementCounts[i]}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[0.78rem] text-faint">겉글자 8자 기준 개수 — 점수가 아님. 지장간 가중치는 학파마다 달라 반영하지 않았습니다. 일간 강약과 용신은 학파별 판단이 갈려 <b className="font-medium text-mist">미확정</b>으로 둡니다.</p>
        </Card>
      </section>

      {/* 4. 대운 기산 */}
      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="4 · 10년 흐름" title="10년 흐름(대운)은 언제부터 시작되나" />
        <Card className="text-[0.9rem] flex flex-col gap-2">
          <p>
            방향: <b className="font-medium text-ivory">{chart.luck.direction === "forward" ? "순행(앞으로)" : chart.luck.direction === "backward" ? "역행(뒤로)" : "미정 — 성별 미선택, 순행으로 임시 표시"}</b>
            <span className="text-faint"> · 태어난 해 천간 {STEMS[chart.pillars.year.stem]}({chart.pillars.year.stem % 2 === 0 ? "양" : "음"})과 전통 계산용 성별로 결정</span>
          </p>
          <p>
            시작: 약 <b className="font-medium text-ivory tabular">{chart.luck.startYears.toFixed(1)}년</b> = {jie.nameKo}까지 {diffDays.toFixed(2)}일 ÷ 3
            <span className="text-faint"> (전통 환산 3일 = 1년)</span>
          </p>
          <p className="text-mist tabular">직전 절기: {chart.prevJie.nameKo} {fmtUtcAsKst(chart.prevJie.utcMs)} · 다음 절기: {chart.nextJie.nameKo} {fmtUtcAsKst(chart.nextJie.utcMs)} (한국 시각)</p>
          <p className="text-mist tabular">첫 10년 시작 무렵: {fmtUtcAsKst(chart.luck.startUtcMs).slice(0, 10)}{chart.luck.approximate ? " · 출생시간 미상으로 근사" : ""}</p>
          <p className="text-[0.8rem] text-faint">나이 환산과 반올림 방식(만 나이·세는 나이, 월 단위 반올림)은 학파와 앱마다 달라 1년 정도 차이가 날 수 있습니다.</p>
        </Card>
      </section>

      {/* 5. 검증 상태 */}
      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="5 · 검증" title="검증 상태" desc="자동 테스트를 통과했지만, 독립 자료(천문연구원 역서, 상용 만세력)와의 대조 전이므로 모든 결과를 미검증으로 표시합니다." />
        <Card className="flex flex-col gap-3">
          <ul className="flex flex-col gap-1.5 text-[0.88rem]">
            {chart.verification.crossChecked.map((c) => <li key={c} className="flex gap-2"><span className="text-ok" aria-hidden>✓</span><span className="text-ivory/90">{c}</span></li>)}
            {chart.verification.pending.map((c) => <li key={c} className="flex gap-2"><span className="text-warn" aria-hidden>○</span><span className="text-mist">{c} <span className="text-faint">· 대기</span></span></li>)}
          </ul>
        </Card>
        <div className="overflow-x-auto rounded-2xl border border-line/70">
          <table className="w-full min-w-[28rem] text-[0.86rem]">
            <thead className="bg-raised text-left text-mist"><tr><th scope="col" className="px-4 py-2.5 font-medium">테스트 사례</th><th scope="col" className="px-4 py-2.5 font-medium">자동 테스트</th><th scope="col" className="px-4 py-2.5 font-medium">외부 대조</th></tr></thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.name} className="border-t border-line/60">
                  <td className="px-4 py-2.5 text-ivory/90">{t.name}</td>
                  <td className="px-4 py-2.5 text-ok">통과</td>
                  <td className="px-4 py-2.5 text-warn">대기</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. 규칙 레지스트리 */}
      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="6 · 규칙" title="해석 규칙 레지스트리" desc="화면의 모든 해석은 아래 규칙 중 하나 이상에 연결됩니다. 원문 위치는 검수자가 원문을 확인하기 전까지 비워 둡니다. 출처를 지어내지 않습니다." />
        <div className="flex flex-col gap-2">
          {RULES.map((r) => (
            <details key={r.rule_id} className="group rounded-xl border border-line/70 bg-deep open:border-gold/40">
              <summary className="cursor-pointer list-none px-4 py-3 flex flex-wrap items-center gap-2">
                <span aria-hidden className="text-faint group-open:rotate-90 transition-transform">›</span>
                <span className="font-mono text-[0.75rem] text-gold">{r.rule_id}</span>
                <span className="text-[0.9rem] text-ivory">{r.rule_name}</span>
                <span className="ml-auto"><Badge layer="unverified">{r.review_status === "draft" ? "초안" : r.review_status}</Badge></span>
              </summary>
              <dl className="px-4 pb-4 grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-1.5 text-[0.82rem]">
                {([
                  ["source_title", r.source_title],
                  ["source_location", r.source_location ?? "검수 전"],
                  ["school", r.school],
                  ["conditions", r.conditions],
                  ["interpretation", r.interpretation],
                  ["alternatives", r.alternative_interpretations.join(" / ") || "—"],
                  ["conflicts", r.conflicts.join(" / ") || "—"],
                  ["review_status", r.review_status],
                  ["confidence", r.confidence_in_source],
                  ["last_reviewed_at", r.last_reviewed_at ?? "—"],
                  ["version", r.version],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="font-mono text-[0.72rem] text-faint pt-0.5">{k}</dt>
                    <dd className="text-mist">{v}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ))}
        </div>
      </section>

      {/* 7. 라이브러리 */}
      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="7 · 의존성" title="사용한 라이브러리" />
        <Card className="text-[0.88rem] flex flex-col gap-2">
          <p className="text-ivory"><span className="font-mono">lunar-javascript 1.7.8</span> <span className="text-faint">· MIT · 6tail · 2026-11 갱신 확인</span></p>
          <p className="text-mist">절기 시각과 음력·양력 변환에만 사용합니다. 이 라이브러리는 중국 표준시(UTC+8) 기준이므로 엔진에서 UTC로 변환해 씁니다. 일주·시주·대운 계산은 운명OS 엔진이 직접 합니다.</p>
          <p className="text-mist">한국 음력(한국천문연구원 기준)과 드물게 하루 차이가 날 수 있어, 음력 입력 결과는 <Badge layer="unverified" /> 상태입니다.</p>
          <p className="text-mist">시간대 이력은 실행 환경의 IANA 시간대 데이터(Asia/Seoul)를 사용합니다.</p>
        </Card>
      </section>

      {/* 8. 한계 */}
      <Notice title="한계">
        명리학 해석은 오랜 전통에 근거한 설명 체계이며, 과학적으로 예측력이 검증된 것이 아닙니다. 운명OS는 미래 사건을 예언하지 않고, 성격을 단정하지 않습니다. 해석은 스스로를 돌아보는 질문의 재료로 사용하세요.
      </Notice>
    </Page>
  );
}
