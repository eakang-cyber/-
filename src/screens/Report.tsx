"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/state/store";
import { useRouter } from "@/ui/router";
import { Page, SampleBanner } from "@/ui/layout";
import { Badge, Button, Card, Notice, ReadingCard, SectionHead, Segmented, cx, inputCls } from "@/ui/kit";
import {
  Block, buildCharacter, buildDecades, buildPair, buildWork, buildYears, choiceThemes, pillarsFact, yearBlock,
} from "@/rules/interpret";
import { INTERESTS, Interest } from "@/rules/content";
import { RULES_VERSION } from "@/rules/registry";
import { ENGINE_VERSION, ChartResult } from "@/engine/chart";
import { BRANCHES, GROUP_COLOR, GROUP_LABEL, STEMS, STEMS_KO, BRANCHES_KO } from "@/engine/constants";

const CHAPTERS = [
  { id: "character", label: "인생 캐릭터 심층" },
  { id: "decades", label: "10년 흐름 전체" },
  { id: "years", label: "10년 연도별 해석" },
  { id: "work", label: "돈과 일 심층" },
  { id: "relation", label: "관계 심층" },
  { id: "lab", label: "선택 실험실 확장" },
  { id: "questions", label: "개인화 질문 3개" },
  { id: "appendix", label: "계산 근거 부록" },
] as const;
type ChapterId = (typeof CHAPTERS)[number]["id"];

export function Report() {
  const { state } = useStore();
  return state.premium ? <PremiumReport /> : <ReportPreview />;
}

// ---------------- 미결제: 소개 + 실제 샘플 발췌 ----------------
function ReportPreview() {
  const { chart } = useStore();
  const { go } = useRouter();
  const now = new Date().getFullYear();
  const years = useMemo(() => buildYears(chart), [chart]);
  const sample = years.filter((y) => y.year === now || y.year === now + 1);
  return (
    <Page>
      <SampleBanner />
      <header className="flex flex-col gap-3">
        <p className="eyebrow">인생 마스터 리포트</p>
        <h1 className="font-display text-[1.75rem] lg:text-[2.1rem] leading-[1.3] font-semibold">리포트는 8개 챕터로 구성됩니다</h1>
        <p className="text-mist text-[0.98rem] leading-relaxed max-w-[40rem]">
          아래는 실제 리포트의 ‘10년 연도별 해석’ 챕터 중 두 해를 그대로 옮긴 발췌입니다. 흐리게 가리거나 일부만 보여 주지 않습니다.
        </p>
      </header>
      <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CHAPTERS.map((c, i) => (
          <li key={c.id} className="flex items-center gap-3 rounded-xl border border-line/70 bg-deep px-4 py-3 text-[0.9rem]">
            <span className="font-mono text-[0.75rem] text-faint tabular">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-ivory/90">{c.label}</span>
          </li>
        ))}
      </ol>
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2"><Badge layer="sample">실제 발췌</Badge><span className="text-[0.8rem] text-faint">3장 · 10년 연도별 해석</span></div>
        {sample.map((y) => <ReadingCard key={y.year} eyebrow={`${y.year}년 · 만 ${y.age}세`} block={yearBlock(chart, y)} />)}
      </section>
      <div className="rounded-2xl border border-gold/30 bg-gradient-to-b from-raised to-deep p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2"><Badge layer="premium" /><span className="text-[0.8rem] text-faint">9,900원 · 1회 결제</span></div>
        <p className="font-display text-[1.1rem] font-semibold">0~90세 모든 해, 관심사 5종, 관계 대화 예시, 개인화 질문 3개</p>
        <Button onClick={() => go("premium")} className="self-start">포함 내용과 가격 보기</Button>
      </div>
    </Page>
  );
}

// ---------------- 데모 프리미엄 리포트 ----------------
function PremiumReport() {
  const { state, dispatch, chart, subject, toast } = useStore();
  const [chapter, setChapter] = useState<ChapterId>("character");
  const [generatedAt] = useState(() => new Date());
  const idx = CHAPTERS.findIndex((c) => c.id === chapter);
  const character = useMemo(() => buildCharacter(chart), [chart]);
  const decades = useMemo(() => buildDecades(chart), [chart]);
  const now = new Date().getFullYear();
  const current = decades.find((d) => d.startYear <= now && now <= d.endYear);

  const move = (i: number) => {
    setChapter(CHAPTERS[i].id);
    requestAnimationFrame(() => document.getElementById("report-body")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const save = () => {
    const d = new Date();
    dispatch({
      type: "upsertRecord",
      record: {
        id: `report-${d.getTime()}`,
        type: "review",
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        title: "마스터 리포트 저장본",
        note: `${character.coreSentence}${current ? ` 지금 지나는 10년(${current.startYear}~${current.endYear}): ${current.block.title}.` : ""}`,
        sample: false,
      },
    });
    toast("아카이브에 저장했습니다(데모 · 이 브라우저 메모리)");
  };

  return (
    <Page wide>
      <SampleBanner />
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2"><Badge layer="demo" /><Badge layer="premium" /><Badge layer="unverified" /></div>
        <p className="eyebrow">인생 마스터 리포트</p>
        <h1 className="font-display text-[1.75rem] lg:text-[2.1rem] leading-[1.3] font-semibold">{subject.name || "나"}님의 인생 마스터 리포트</h1>
        <p className="font-display text-[1.05rem] text-ivory/85 leading-relaxed">“{character.coreSentence}”</p>
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[0.78rem] text-faint tabular">
          <div className="flex gap-1.5"><dt>생성</dt><dd className="text-mist">{generatedAt.toLocaleString("ko-KR")}</dd></div>
          <div className="flex gap-1.5"><dt>엔진</dt><dd className="font-mono text-mist">{ENGINE_VERSION}</dd></div>
          <div className="flex gap-1.5"><dt>규칙</dt><dd className="font-mono text-mist">{RULES_VERSION}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={save}>리포트 저장 (데모)</Button>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[13rem_1fr] lg:gap-8">
        {/* 챕터 내비게이션 */}
        <nav aria-label="리포트 챕터" className="sticky z-30 -mx-4 px-4 py-2 bg-night/92 backdrop-blur-md border-b border-line/50 lg:static lg:mx-0 lg:px-0 lg:py-0 lg:bg-transparent lg:border-0 lg:backdrop-blur-none" style={{ top: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}>
          <ol className="flex gap-2 overflow-x-auto no-scrollbar lg:flex-col lg:gap-1 lg:sticky lg:top-24">
            {CHAPTERS.map((c, i) => (
              <li key={c.id} className="shrink-0">
                <button
                  onClick={() => move(i)}
                  aria-current={chapter === c.id ? "true" : undefined}
                  className={cx(
                    "h-9 lg:h-10 px-3.5 rounded-full lg:rounded-xl text-[0.84rem] whitespace-nowrap cursor-pointer w-full text-left flex items-center gap-2 border lg:border-0",
                    chapter === c.id ? "border-gold bg-gold/10 text-gold lg:bg-raised" : "border-line text-mist hover:text-ivory",
                  )}
                >
                  <span className="font-mono text-[0.7rem] text-faint tabular">{String(i + 1).padStart(2, "0")}</span>{c.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div id="report-body" className="flex flex-col gap-6 pt-6 lg:pt-0 scroll-mt-32 min-w-0">
          <ChapterContent id={chapter} />
          <div className="flex gap-2 pt-2 border-t border-line/60">
            <Button variant="ghost" size="sm" disabled={idx === 0} onClick={() => move(idx - 1)}>이전 챕터</Button>
            <span className="ml-auto" />
            <Button variant="ghost" size="sm" disabled={idx === CHAPTERS.length - 1} onClick={() => move(idx + 1)}>
              다음{idx < CHAPTERS.length - 1 ? ` · ${CHAPTERS[idx + 1].label}` : ""}
            </Button>
          </div>
        </div>
      </div>
      {state.premium && <p className="text-[0.75rem] text-faint">데모 프리미엄 화면입니다. 실제 결제나 서버 저장은 일어나지 않았습니다.</p>}
    </Page>
  );
}

function ChapterContent({ id }: { id: ChapterId }) {
  switch (id) {
    case "character": return <ChCharacter />;
    case "decades": return <ChDecades />;
    case "years": return <ChYears />;
    case "work": return <ChWork />;
    case "relation": return <ChRelation />;
    case "lab": return <ChLab />;
    case "questions": return <ChQuestions />;
    case "appendix": return <ChAppendix />;
  }
}

function ChCharacter() {
  const { chart } = useStore();
  const c = useMemo(() => buildCharacter(chart), [chart]);
  return (
    <>
      <SectionHead eyebrow="1장" title="인생 캐릭터 심층" desc={`'${c.image}'에 빗댄 기본 비유 위에, 서로 다른 이야기와 장면을 모두 펼칩니다.`} />
      <ReadingCard eyebrow="핵심" block={c.coreBlock} />
      <h3 className="font-display text-[1.1rem] font-semibold mt-2">세 가지 이야기</h3>
      {c.stories.map((s) => <ReadingCard key={s.id} block={s} />)}
      <h3 className="font-display text-[1.1rem] font-semibold mt-2">강점이 드러나는 장면</h3>
      {c.strengths.map((s) => <ReadingCard key={s.id} block={s} tone="raised" />)}
      <h3 className="font-display text-[1.1rem] font-semibold mt-2">조율이 필요할 수 있는 장면</h3>
      {c.frictions.map((s) => <ReadingCard key={s.id} block={s} tone="raised" />)}
      {c.observations.length > 0 && <h3 className="font-display text-[1.1rem] font-semibold mt-2">더 살펴볼 관찰</h3>}
      {c.observations.map((s) => <ReadingCard key={s.id} block={s} />)}
    </>
  );
}

function ChDecades() {
  const { chart } = useStore();
  const decades = useMemo(() => buildDecades(chart), [chart]);
  const now = new Date().getFullYear();
  return (
    <>
      <SectionHead eyebrow="2장" title="10년 흐름 전체" desc="10년 단위로 바깥에서 들어오는 주제입니다. 점수나 좋고 나쁨이 아니라 주제의 종류만 표시합니다." />
      {decades.map((d) => {
        const isNow = d.startYear <= now && now <= d.endYear;
        return (
          <ReadingCard key={d.index} eyebrow={`${d.startYear}~${d.endYear} · 만 ${Math.floor(d.startAge)}세부터${isNow ? " · 지금" : ""}`} block={d.block} tone={isNow ? "raised" : "deep"}>
            <div className="mt-3 flex flex-wrap gap-2 text-[0.78rem]">
              <GroupChip g={d.stemGroup} prefix="드러난 주제" />
              <GroupChip g={d.branchGroup} prefix="생활 환경" />
            </div>
          </ReadingCard>
        );
      })}
    </>
  );
}

function GroupChip({ g, prefix }: { g: keyof typeof GROUP_LABEL; prefix: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 h-7 text-mist">
      <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: GROUP_COLOR[g] }} />
      {prefix} · {GROUP_LABEL[g]}
    </span>
  );
}

function ChYears() {
  const { chart } = useStore();
  const years = useMemo(() => buildYears(chart), [chart]);
  const decades = useMemo(() => buildDecades(chart), [chart]);
  const now = new Date().getFullYear();
  const [sel, setSel] = useState(() => (years.some((y) => y.year === now) ? now : years[0].year));
  const cell = years.find((y) => y.year === sel)!;
  const decade = decades.find((d) => d.startYear <= sel && sel <= d.endYear);
  const range = decade ? years.filter((y) => y.year >= decade.startYear && y.year <= decade.endYear) : years.filter((y) => y.year < (decades[0]?.startYear ?? y.year + 1));
  return (
    <>
      <SectionHead eyebrow="3장" title="10년 연도별 해석" desc="0세부터 90세까지 모든 해를 열 수 있습니다. 해마다 바뀌는 주제와 근거를 확인하세요. 사건을 예언하지 않습니다." />
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="year-select" className="text-[0.85rem] text-mist">연도 선택</label>
        <select id="year-select" value={sel} onChange={(e) => setSel(+e.target.value)} className={cx(inputCls, "w-auto h-10 pr-8")}>
          {years.map((y) => <option key={y.year} value={y.year}>{y.year}년 (만 {y.age}세)</option>)}
        </select>
        <Button variant="ghost" size="sm" disabled={sel <= years[0].year} onClick={() => setSel(sel - 1)} aria-label="이전 해">‹</Button>
        <Button variant="ghost" size="sm" disabled={sel >= years[years.length - 1].year} onClick={() => setSel(sel + 1)} aria-label="다음 해">›</Button>
      </div>
      <div role="group" aria-label={decade ? `${decade.startYear}~${decade.endYear} 연도` : "대운 시작 전 연도"} className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
        {range.map((y) => (
          <button key={y.year} onClick={() => setSel(y.year)} aria-pressed={y.year === sel}
            className={cx("rounded-lg border px-1 py-2 text-center cursor-pointer tabular", y.year === sel ? "border-gold bg-gold/10" : "border-line hover:border-mist/50")}>
            <span aria-hidden className="block mx-auto h-1.5 w-6 rounded-full mb-1.5" style={{ background: GROUP_COLOR[y.stemGroup] }} />
            <span className="block text-[0.8rem] text-ivory">{y.year}</span>
            <span className="block text-[0.68rem] text-faint">{y.age}세{y.shift.length ? " ◇" : ""}</span>
          </button>
        ))}
      </div>
      <p className="text-[0.75rem] text-faint">색 막대 = 그해 드러난 주제 · ◇ = 전통적 변화 지점(좋고 나쁨 아님)</p>
      <ReadingCard eyebrow={`${cell.year}년 · 만 ${cell.age}세${cell.year === now ? " · 올해" : ""}`} block={yearBlock(chart, cell)} />
    </>
  );
}

function ChWork() {
  const { chart, state } = useStore();
  const [interest, setInterest] = useState<Interest>(state.interest);
  const sections = useMemo(() => buildWork(chart, interest), [chart, interest]);
  return (
    <>
      <SectionHead eyebrow="4장" title="돈과 일 심층" desc="관심사를 바꾸면 현실 조언과 검증 항목이 바뀝니다. 전통 해석 부분은 출생 정보로만 정해지므로 그대로입니다." />
      <Segmented label="관심사" value={interest} options={INTERESTS.map((i) => ({ value: i, label: i }))} onChange={setInterest} size="sm" />
      {sections.map((s) => (
        <div key={s.id} className="flex flex-col gap-3">
          <h3 className="font-display text-[1.08rem] font-semibold">{s.question}</h3>
          <ReadingCard block={s.traditional} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Card className="bg-raised">
              <Badge layer="practical" />
              <ul className="mt-2 flex flex-col gap-1.5 text-[0.9rem] text-ivory/90">{s.practical.map((p) => <li key={p}>· {p}</li>)}</ul>
            </Card>
            <Card className="bg-raised">
              <span className="text-[0.75rem] text-faint">확인해 볼 것</span>
              <ul className="mt-2 flex flex-col gap-1.5 text-[0.9rem] text-ivory/90">{s.verify.map((p) => <li key={p}>· {p}</li>)}</ul>
            </Card>
          </div>
        </div>
      ))}
    </>
  );
}

function ChRelation() {
  const { chart, partnerChart, state, subject } = useStore();
  const { go } = useRouter();
  if (!partnerChart || !state.partnerConsent) {
    return (
      <>
        <SectionHead eyebrow="5장" title="관계 심층" />
        <Notice title="관계 시뮬레이터에서 먼저 비교해 주세요">
          상대의 출생 정보 사용에 대한 확인(동의)이 필요합니다. 관계 시뮬레이터에서 정보를 확인하고 동의란을 선택하면 이 챕터가 채워집니다.
        </Notice>
        <Button className="self-start" onClick={() => go("relation")}>관계 시뮬레이터로 이동</Button>
      </>
    );
  }
  const nameA = subject.name || "나";
  const nameB = state.partner.name || "상대";
  const p = buildPair(chart, partnerChart, nameA, nameB);
  return (
    <>
      <SectionHead eyebrow="5장" title="관계 심층" desc={`${nameA}님과 ${nameB}님(${state.relationType})의 전통적 관계 해석입니다. 관계의 결과를 점수화하거나 예언하지 않습니다.`} />
      <ReadingCard block={p.aReadsB} />
      <ReadingCard block={p.bReadsA} />
      <ReadingCard block={p.dayBranch} tone="raised" />
      <ReadingCard block={p.complement} tone="raised" />
      <h3 className="font-display text-[1.1rem] font-semibold mt-2">갈등 상황별 대화 예시</h3>
      {p.scenarios.map((s) => (
        <Card key={s.situation}>
          <p className="font-medium text-ivory">{s.situation}</p>
          <p className="text-[0.86rem] text-mist mt-1">{s.tension}</p>
          <div className="mt-3 flex flex-col gap-2">
            {s.lines.map((l, i) => (
              <div key={i} className={cx("max-w-[85%] rounded-2xl px-4 py-2.5 text-[0.9rem]", l.who === "A" ? "bg-raised self-start" : "bg-gold/10 border border-gold/30 self-end")}>
                <span className="block text-[0.7rem] text-faint mb-0.5">{l.who === "A" ? nameA : nameB}</span>{l.text}
              </div>
            ))}
          </div>
        </Card>
      ))}
      <h3 className="font-display text-[1.1rem] font-semibold mt-2">함께 이야기해 볼 질문</h3>
      <ul className="flex flex-col gap-2">{p.questions.map((q) => <li key={q} className="rounded-xl border border-line/70 bg-deep px-4 py-3 text-[0.92rem]">{q}</li>)}</ul>
    </>
  );
}

function ChLab() {
  const { chart, state } = useStore();
  const { go } = useRouter();
  const c = state.choice;
  const theme = useMemo(() => choiceThemes(chart), [chart]);
  const keys = ["money", "growth", "stability", "time"] as const;
  const labels: Record<(typeof keys)[number], string> = { money: "수입", growth: "성장", stability: "안정", time: "시간 여유" };
  const total = (side: "a" | "b") => keys.reduce((sum, k) => sum + c.weights[k] * (c.ratings[side][k] ?? 0), 0);
  const max = keys.reduce((s, k) => s + c.weights[k] * 4, 0) || 1;
  return (
    <>
      <SectionHead eyebrow="6장" title="선택 실험실 확장" desc="직접 입력한 선택지와 직접 매긴 중요도를 요약합니다. 운명OS는 선택을 대신하지 않습니다." />
      <Card>
        <p className="text-[0.8rem] text-faint">질문</p>
        <p className="font-display text-[1.1rem] font-semibold mt-1">{c.question}</p>
        <p className="text-[0.86rem] text-mist mt-2">목표: {c.goals}</p>
        <p className="text-[0.86rem] text-mist">제약: {c.constraints}</p>
      </Card>
      <div className="grid sm:grid-cols-2 gap-3">
        {(["a", "b"] as const).map((side) => {
          const o = c[side];
          const t = total(side);
          return (
            <Card key={side} className="bg-raised">
              <div className="flex items-center gap-2"><Badge layer="user" /><span className="text-[0.75rem] text-faint">선택지 {side.toUpperCase()}</span></div>
              <p className="font-medium mt-2">{o.label}</p>
              <div className="mt-3 h-2 rounded-full bg-night overflow-hidden" aria-hidden>
                <div className="h-full bg-gold/80 rounded-full" style={{ width: `${(t / max) * 100}%` }} />
              </div>
              <p className="text-[0.78rem] text-faint mt-1.5 tabular">내가 매긴 가중 합계 {t} / {max} — 운세 점수가 아님</p>
              <ul className="mt-2 text-[0.8rem] text-mist tabular">
                {keys.map((k) => <li key={k}>{labels[k]}: 중요도 {c.weights[k]} × 평가 {c.ratings[side][k] ?? 0}</li>)}
              </ul>
            </Card>
          );
        })}
      </div>
      <ReadingCard block={theme} />
      <Card>
        <p className="font-medium">결정 전 점검 질문</p>
        <ul className="mt-2 flex flex-col gap-1.5 text-[0.9rem] text-ivory/90">
          <li>· 이 선택을 되돌리는 데 드는 비용은 얼마이며, 얼마나 걸리나요?</li>
          <li>· 10개월 뒤, 10년 뒤의 나는 이 선택을 어떻게 설명할까요?</li>
          <li>· “{c.constraints}” 조건이 바뀌면 판단도 바뀌나요?</li>
          <li>· 실패했다고 가정하면 가장 가능성 높은 이유는 무엇인가요?</li>
        </ul>
      </Card>
      <Button variant="ghost" className="self-start" onClick={() => go("lab")}>선택 실험실에서 수정하기</Button>
    </>
  );
}

// ---------- 개인화 질문 ----------
type Bucket = "money" | "work" | "relation" | "timing" | "self";
const BUCKET_LABEL: Record<Bucket, string> = { money: "돈", work: "일", relation: "관계", timing: "시기", self: "나" };
const BUCKET_WORDS: Record<Bucket, string[]> = {
  money: ["돈", "재정", "수입", "투자", "저축", "월급", "연봉", "재물", "지출"],
  work: ["일", "직장", "창업", "이직", "사업", "부업", "커리어", "회사", "직업"],
  relation: ["관계", "연애", "결혼", "친구", "사람", "가족", "동료", "상대", "궁합"],
  timing: ["올해", "내년", "언제", "시기", "몇 살", "나이", "년"],
  self: [],
};
function classify(q: string): Bucket[] {
  const hit = (Object.keys(BUCKET_WORDS) as Bucket[]).filter((b) => BUCKET_WORDS[b].some((w) => q.includes(w)));
  return hit.length ? hit.slice(0, 2) : ["self"];
}

function answerBlocks(chart: ChartResult, partner: ChartResult | null, nameA: string, nameB: string, consent: boolean, buckets: Bucket[]): Block[] {
  const now = new Date().getFullYear();
  const out: Block[] = [];
  for (const b of buckets) {
    if (b === "money") out.push(buildWork(chart, "재정관리").find((s) => s.id === "earn-keep")!.traditional);
    if (b === "work") {
      const w = buildWork(chart, "직장");
      out.push(w.find((s) => s.id === "value")!.traditional);
    }
    if (b === "relation") {
      if (partner && consent) out.push(buildPair(chart, partner, nameA, nameB).aReadsB);
      else out.push(buildCharacter(chart).frictions[0] ?? buildCharacter(chart).coreBlock);
    }
    if (b === "timing") {
      const ys = buildYears(chart).filter((y) => y.year === now || y.year === now + 1);
      ys.forEach((y) => out.push(yearBlock(chart, y)));
    }
    if (b === "self") out.push(buildCharacter(chart).stories[0]);
  }
  return out;
}

function ChQuestions() {
  const { chart, partnerChart, state, dispatch, subject, toast } = useStore();
  const [text, setText] = useState("");
  const n = state.questions.length;
  const full = n >= 3;
  const add = () => {
    const q = text.trim();
    if (!q || full) return;
    dispatch({ type: "addQuestion", q: { id: `q-${Date.now()}`, q, createdAt: new Date().toISOString() } });
    setText("");
    toast(`질문을 추가했습니다 (${n + 1}/3)`);
  };
  return (
    <>
      <SectionHead eyebrow="7장" title="개인화 질문 3개" desc="궁금한 것을 직접 물어보세요. 질문과 관련된 해석 규칙을 찾아 근거와 함께 보여 줍니다." />
      <Notice tone="demo" title="AI 설명 연동 전 데모 응답">
        지금은 질문의 단어로 관련 규칙을 고르는 규칙 기반 응답입니다. Phase 3에서 Claude API 설명자로 교체되며, 그때도 계산과 규칙 결과만을 입력으로 사용합니다.
      </Notice>
      <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex flex-col gap-2">
        <label htmlFor="pq" className="text-[0.9rem] font-medium flex items-center gap-2">새 질문 <span className="text-faint tabular text-[0.8rem]">{n}/3</span></label>
        <div className="flex gap-2">
          <input id="pq" value={text} onChange={(e) => setText(e.target.value)} disabled={full} maxLength={120}
            placeholder={full ? "질문 3개를 모두 사용했습니다" : "예: 올해 돈 관리는 어떻게 하면 좋을까요?"} className={cx(inputCls, "flex-1")} />
          <Button type="submit" disabled={full || !text.trim()}>묻기</Button>
        </div>
      </form>
      {state.questions.length === 0 && <p className="text-[0.88rem] text-faint">아직 질문이 없습니다. 돈, 일, 관계, 시기, 나에 관한 질문을 해 보세요.</p>}
      {state.questions.map((q, i) => {
        const buckets = classify(q.q);
        const blocks = answerBlocks(chart, partnerChart, subject.name || "나", state.partner.name || "상대", state.partnerConsent, buckets);
        return (
          <Card key={q.id} className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="font-mono text-[0.75rem] text-faint tabular mt-1">Q{i + 1}</span>
              <p className="flex-1 font-medium text-ivory">{q.q}</p>
              <button onClick={() => dispatch({ type: "deleteQuestion", id: q.id })} className="text-[0.8rem] text-faint hover:text-warn cursor-pointer">삭제</button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[0.78rem] text-faint">
              <Badge layer="demo">규칙 기반 데모 응답</Badge>
              연결된 주제: {buckets.map((b) => BUCKET_LABEL[b]).join(", ")}
            </div>
            {blocks.map((b) => <ReadingCard key={b.id} block={b} tone="raised" />)}
          </Card>
        );
      })}
    </>
  );
}

function ChAppendix() {
  const { chart } = useStore();
  const ps = [
    { k: "시", p: chart.pillars.hour }, { k: "일", p: chart.pillars.day }, { k: "월", p: chart.pillars.month }, { k: "년", p: chart.pillars.year },
  ];
  const basis = { clock: "표준시 그대로", lmt: "경도 보정(평균태양시)", apparent: "진태양시" }[chart.policy.timeBasis];
  return (
    <>
      <SectionHead eyebrow="8장" title="계산 근거 부록" desc="이 리포트의 모든 해석이 기대고 있는 계산 결과입니다." />
      <div className="grid grid-cols-4 gap-2">
        {ps.map(({ k, p }) => (
          <div key={k} className="rounded-xl border border-line/70 bg-deep p-3 text-center">
            <p className="text-[0.72rem] text-faint">{k}</p>
            {p ? (
              <>
                <p className="font-display text-[1.4rem] mt-1">{STEMS[p.stem]}{BRANCHES[p.branch]}</p>
                <p className="text-[0.75rem] text-mist">{STEMS_KO[p.stem]}{BRANCHES_KO[p.branch]}</p>
              </>
            ) : <p className="text-[0.85rem] text-faint mt-2">미상</p>}
          </div>
        ))}
      </div>
      <Card className="text-[0.88rem] flex flex-col gap-1.5">
        <p><span className="text-faint">원국 · </span><span className="font-mono">{pillarsFact(chart)}</span></p>
        <p><span className="text-faint">시간 기준 · </span>{basis} / {chart.policy.ziPolicy === "zi23" ? "23시 날짜 변경" : "0시 날짜 변경(야자시)"}</p>
        <p><span className="text-faint">10년 흐름 · </span>{chart.luck.direction === "forward" ? "순행" : chart.luck.direction === "backward" ? "역행" : "방향 미정"}, 약 {chart.luck.startYears.toFixed(1)}년부터</p>
      </Card>
      {chart.warnings.length > 0 && (
        <Notice tone="warn" title="계산 주의 사항">
          <ul className="list-disc pl-4">{chart.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </Notice>
      )}
      <Card>
        <div className="flex items-center gap-2"><Badge layer="unverified" /><span className="text-[0.85rem] text-mist">검증 대기 항목</span></div>
        <ul className="mt-2 flex flex-col gap-1 text-[0.88rem] text-ivory/90">{chart.verification.pending.map((p) => <li key={p}>· {p}</li>)}</ul>
      </Card>
    </>
  );
}
