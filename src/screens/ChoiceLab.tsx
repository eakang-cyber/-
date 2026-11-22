"use client";
// 화면 G — 인생 선택 실험실. 선택을 대신하지 않고, 사용자가 쓴 근거를 구조화해 비교한다.
import { useMemo, useState } from "react";
import { useStore } from "@/state/store";
import { useRouter } from "@/ui/router";
import { Page, ScreenTitle, SampleBanner, CalcStatus, NextStep } from "@/ui/layout";
import { Badge, Button, Evidence, Field, Notice, PremiumGate, SectionHead, cx, inputCls } from "@/ui/kit";
import { SAMPLE_CHOICE, ChoiceInput, ChoiceOption } from "@/content/sample";
import { buildYears, choiceThemes, yearBlock } from "@/rules/interpret";
import { j } from "@/rules/josa";

const CRITERIA: { key: keyof ChoiceInput["weights"]; label: string }[] = [
  { key: "money", label: "돈(수입·비용)" },
  { key: "growth", label: "성장·배움" },
  { key: "stability", label: "안정감" },
  { key: "time", label: "시간 여유·몰입" },
];

const textareaCls = "w-full min-h-[5.5rem] rounded-xl bg-night border border-line px-4 py-3 text-ivory placeholder:text-faint focus:border-gold/70 outline-none leading-relaxed";

function buildQuestions(c: ChoiceInput): string[] {
  const A = c.a.label.trim() || "선택지 A";
  const B = c.b.label.trim() || "선택지 B";
  const out: string[] = [];
  if (c.goals.trim()) out.push(`“${c.goals.trim()}” — 이 목표에 ${j(A, "와/과")} ${B} 중 어느 쪽이 더 가까이 데려다주는지, 그렇게 판단한 숫자나 사례는 무엇인가요?`);
  if (c.constraints.trim()) out.push(`“${c.constraints.trim()}” — 이 제약이 먼저 한계에 닿는 쪽은 어느 선택지이고, 그 시점은 언제인가요?`);
  if (c.a.risks.trim()) out.push(`${A}의 위험(“${c.a.risks.trim()}”)이 실제로 일어나면, 내가 감당할 수 있는 최대 손실은 얼마인가요?`);
  if (c.b.risks.trim()) out.push(`${B}의 위험(“${c.b.risks.trim()}”)이 실제로 일어나면, 그때 쓸 수 있는 대안은 무엇인가요?`);
  out.push("6개월 뒤 이 결정을 되돌린다면, 각 선택지에서 되돌리는 데 드는 비용은 얼마인가요?");
  if (c.b.prep.trim() || c.a.prep.trim()) out.push(`필요한 준비 중 이번 달 안에 시작할 수 있는 한 가지는 무엇인가요? (${(c.a.prep.trim() || c.b.prep.trim()).slice(0, 40)}${(c.a.prep.trim() || c.b.prep.trim()).length > 40 ? "…" : ""})`);
  return out.slice(0, 5);
}

function OptionEditor({ side, value, onChange }: { side: "a" | "b"; value: ChoiceOption; onChange: (o: ChoiceOption) => void }) {
  const tag = side === "a" ? "A" : "B";
  const set = (k: keyof ChoiceOption, v: string) => onChange({ ...value, [k]: v });
  return (
    <fieldset className="rounded-2xl border border-line/70 bg-deep p-4 flex flex-col gap-4 min-w-0">
      <legend className="px-2 text-[0.8rem] text-gold font-medium">선택지 {tag}</legend>
      <Field label="이름" htmlFor={`opt-${side}-label`}>
        <input id={`opt-${side}-label`} className={inputCls} maxLength={30} value={value.label} onChange={(e) => set("label", e.target.value)} placeholder="예: 직장 유지하며 준비" />
      </Field>
      <Field label="현실적인 장점" htmlFor={`opt-${side}-pros`}>
        <textarea id={`opt-${side}-pros`} className={textareaCls} value={value.pros} onChange={(e) => set("pros", e.target.value)} placeholder="이 선택으로 확실히 얻는 것" />
      </Field>
      <Field label="현실적인 위험" htmlFor={`opt-${side}-risks`}>
        <textarea id={`opt-${side}-risks`} className={textareaCls} value={value.risks} onChange={(e) => set("risks", e.target.value)} placeholder="잘못되면 잃는 것" />
      </Field>
      <Field label="필요한 준비" htmlFor={`opt-${side}-prep`}>
        <textarea id={`opt-${side}-prep`} className={textareaCls} value={value.prep} onChange={(e) => set("prep", e.target.value)} placeholder="시작 전에 갖춰야 할 것" />
      </Field>
    </fieldset>
  );
}

function CompareRow({ label, a, b, badge }: { label: string; a: string; b: string; badge?: React.ReactNode }) {
  const empty = <span className="text-faint">아직 적지 않았습니다</span>;
  return (
    <div className="border-t border-line/60 pt-4">
      <div className="flex items-center gap-2 mb-2.5"><h3 className="text-[0.9rem] font-medium text-ivory">{label}</h3>{badge}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-night/60 border border-line/60 p-3.5 min-w-0">
          <p className="text-[0.72rem] text-gold mb-1">A</p>
          <p className="text-[0.9rem] text-ivory/90 leading-relaxed whitespace-pre-wrap">{a.trim() || empty}</p>
        </div>
        <div className="rounded-xl bg-night/60 border border-line/60 p-3.5 min-w-0">
          <p className="text-[0.72rem] text-mist mb-1">B</p>
          <p className="text-[0.9rem] text-ivory/90 leading-relaxed whitespace-pre-wrap">{b.trim() || empty}</p>
        </div>
      </div>
    </div>
  );
}

function Slider({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="text-[0.85rem] text-mist w-[7.5rem] shrink-0">{label}</label>
      <input id={id} type="range" min={0} max={4} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 min-w-0" />
      <span className="tabular text-[0.85rem] text-ivory w-5 text-right">{value}</span>
    </div>
  );
}

export function ChoiceLab() {
  const { state, dispatch, chart, toast } = useStore();
  const { go } = useRouter();
  const c = state.choice;
  const [editing, setEditing] = useState(false);
  const setC = (next: Partial<ChoiceInput>) => dispatch({ type: "setChoice", choice: { ...c, ...next } });
  const theme = useMemo(() => choiceThemes(chart), [chart]);
  const questions = buildQuestions(c);
  const A = c.a.label.trim() || "선택지 A";
  const B = c.b.label.trim() || "선택지 B";

  const maxSum = CRITERIA.reduce((s, k) => s + c.weights[k.key] * 4, 0);
  const sumOf = (side: "a" | "b") => CRITERIA.reduce((s, k) => s + c.weights[k.key] * (c.ratings[side][k.key] ?? 0), 0);

  const checkpoints = useMemo(() => {
    const years = buildYears(chart);
    const now = new Date();
    return [3, 6, 12].map((m) => {
      const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
      const cell = years.find((y) => y.year === d.getFullYear());
      return { months: m, label: `${d.getFullYear()}년 ${d.getMonth() + 1}월`, theme: cell ? yearBlock(chart, cell).title : null };
    });
  }, [chart]);

  return (
    <Page>
      <ScreenTitle
        eyebrow="인생 선택 실험실"
        title="두 갈래 길을 나란히 놓고 보기"
        desc="고민 중인 선택지를 적으면, 전통 해석의 시기 주제와 당신이 쓴 현실 근거를 한 화면에 정리합니다."
      />
      <SampleBanner />
      <CalcStatus />

      <Notice tone="warn" title="운명OS는 선택을 대신하지 않습니다">
        사주를 근거로 어느 쪽을 고르라고 권하지 않습니다. 재정·건강·법률처럼 중요한 결정은 실제 숫자와 전문가의 조언을 먼저 확인하세요.
      </Notice>

      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="01 · 질문" title={c.question.trim() || "무엇을 고민하고 있나요?"} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>{editing ? "편집 닫기" : "선택지 직접 쓰기"}</Button>
          <Button size="sm" variant="quiet" onClick={() => { dispatch({ type: "setChoice", choice: SAMPLE_CHOICE }); toast("샘플 질문을 불러왔습니다."); }}>샘플 질문 불러오기</Button>
          <Button size="sm" variant="quiet" onClick={() => {
            const blank: ChoiceOption = { label: "", pros: "", risks: "", prep: "" };
            dispatch({ type: "setChoice", choice: { ...c, question: "", a: blank, b: blank, goals: "", constraints: "" } });
            setEditing(true);
          }}>모두 비우기</Button>
        </div>
        {editing && (
          <div className="flex flex-col gap-4">
            <Field label="고민하는 질문" htmlFor="choice-q">
              <input id="choice-q" className={inputCls} maxLength={80} value={c.question} onChange={(e) => setC({ question: e.target.value })} placeholder="예: 현재 직장을 유지할까, 창업을 준비할까?" />
            </Field>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <OptionEditor side="a" value={c.a} onChange={(o) => setC({ a: o })} />
              <OptionEditor side="b" value={c.b} onChange={(o) => setC({ b: o })} />
            </div>
            <Field label="내 목표" htmlFor="choice-goals" hint="이 선택으로 결국 얻고 싶은 것">
              <textarea id="choice-goals" className={textareaCls} value={c.goals} onChange={(e) => setC({ goals: e.target.value })} />
            </Field>
            <Field label="내 제약" htmlFor="choice-cons" hint="돈, 시간, 가족, 건강 등 바꾸기 어려운 조건">
              <textarea id="choice-cons" className={textareaCls} value={c.constraints} onChange={(e) => setC({ constraints: e.target.value })} />
            </Field>
            <Button className="self-start" onClick={() => { setEditing(false); toast("비교표에 반영했습니다."); }}>비교표 보기</Button>
          </div>
        )}
        {state.choice === SAMPLE_CHOICE && <p className="text-[0.8rem] text-faint"><Badge layer="sample" className="mr-2" />아래 내용은 예시로 적어 둔 질문입니다. 내 고민으로 바꿔 보세요.</p>}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="02 · 나란히 비교" title={`${A}  ·  ${B}`} />
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-gold/40 bg-gold/5 px-3.5 py-3"><p className="text-[0.72rem] text-gold">A</p><p className="text-ivory font-medium text-[0.95rem]">{A}</p></div>
          <div className="rounded-xl border border-line bg-deep px-3.5 py-3"><p className="text-[0.72rem] text-mist">B</p><p className="text-ivory font-medium text-[0.95rem]">{B}</p></div>
        </div>

        <div className="border-t border-line/60 pt-4">
          <div className="flex items-center gap-2 mb-2.5"><h3 className="text-[0.9rem] font-medium text-ivory">{theme.title}</h3><Badge layer="rule" /></div>
          <div className="rounded-xl bg-raised border border-line/60 p-4">
            <p className="text-[0.92rem] text-ivory/90 leading-relaxed">{theme.body}</p>
            <p className="mt-2 text-[0.8rem] text-faint">두 선택지에 똑같이 적용되는 시기 주제입니다. 어느 쪽이 맞는지 판단하지 않습니다.</p>
            <Evidence block={theme} />
          </div>
        </div>

        <CompareRow label="현실적인 장점" a={c.a.pros} b={c.b.pros} badge={<Badge layer="user" />} />
        <CompareRow label="현실적인 위험" a={c.a.risks} b={c.b.risks} badge={<Badge layer="user" />} />
        <CompareRow label="필요한 준비" a={c.a.prep} b={c.b.prep} badge={<Badge layer="user" />} />

        <div className="border-t border-line/60 pt-4">
          <div className="flex items-center gap-2 mb-2.5"><h3 className="text-[0.9rem] font-medium text-ivory">내 목표와 제약</h3><Badge layer="user" /></div>
          <dl className="rounded-xl bg-night/60 border border-line/60 p-4 grid grid-cols-[3.5rem_1fr] gap-x-3 gap-y-2 text-[0.9rem]">
            <dt className="text-faint">목표</dt><dd className="text-ivory/90">{c.goals.trim() || "아직 적지 않았습니다"}</dd>
            <dt className="text-faint">제약</dt><dd className="text-ivory/90">{c.constraints.trim() || "아직 적지 않았습니다"}</dd>
          </dl>
        </div>

        <div className="border-t border-line/60 pt-4">
          <div className="flex items-center gap-2 mb-2.5"><h3 className="text-[0.9rem] font-medium text-ivory">결정하기 전에 확인할 질문</h3><Badge layer="practical" /></div>
          <ol className="flex flex-col gap-2">
            {questions.map((q, i) => (
              <li key={q} className="flex gap-3 rounded-xl border border-line/60 bg-deep px-4 py-3">
                <span className="text-gold font-display tabular">{i + 1}</span>
                <span className="text-[0.9rem] text-ivory/90 leading-relaxed">{q}</span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[0.78rem] text-faint">당신이 적은 목표·제약·위험 문장으로 만든 질문입니다. 사주 해석이 아닙니다.</p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="03 · 확장 분석" title="내 기준으로 무게를 달아 보기" desc="중요도와 평가는 모두 당신이 정합니다. 운명OS가 매기는 점수가 아닙니다." />
        {state.premium ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2"><Badge layer="premium" /><Badge layer="demo" /><span className="text-[0.8rem] text-faint">선택 실험실 확장 분석</span></div>
            <div className="rounded-2xl border border-line/70 bg-deep p-5 flex flex-col gap-3">
              <h3 className="text-[0.92rem] font-medium">기준별 중요도 <span className="text-faint font-normal">(0 = 상관없음 · 4 = 매우 중요)</span></h3>
              {CRITERIA.map((k) => (
                <Slider key={k.key} id={`w-${k.key}`} label={k.label} value={c.weights[k.key]} onChange={(n) => setC({ weights: { ...c.weights, [k.key]: n } })} />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {(["a", "b"] as const).map((side) => (
                <div key={side} className="rounded-2xl border border-line/70 bg-deep p-5 flex flex-col gap-3 min-w-0">
                  <h3 className="text-[0.92rem] font-medium"><span className={side === "a" ? "text-gold" : "text-mist"}>{side.toUpperCase()}</span> · {side === "a" ? A : B} <span className="text-faint font-normal">기준별 내 평가</span></h3>
                  {CRITERIA.map((k) => (
                    <Slider key={k.key} id={`r-${side}-${k.key}`} label={k.label} value={c.ratings[side][k.key] ?? 0}
                      onChange={(n) => setC({ ratings: { ...c.ratings, [side]: { ...c.ratings[side], [k.key]: n } } })} />
                  ))}
                </div>
              ))}
            </div>
            <figure className="rounded-2xl border border-line/70 bg-deep p-5">
              <figcaption className="text-[0.92rem] font-medium text-ivory">내가 매긴 기준의 합계 <span className="text-faint font-normal">(운세 점수 아님 · 중요도 × 평가, 최대 {maxSum})</span></figcaption>
              <div className="mt-4 flex flex-col gap-4">
                {(["a", "b"] as const).map((side) => {
                  const v = sumOf(side);
                  const pct = maxSum ? (v / maxSum) * 100 : 0;
                  return (
                    <div key={side} className="flex flex-col gap-1.5" title={`${side === "a" ? A : B}: ${v} / ${maxSum}`}>
                      <div className="flex items-baseline gap-2 text-[0.85rem]">
                        <span className="text-ivory">{side.toUpperCase()} · {side === "a" ? A : B}</span>
                        <span className="ml-auto tabular text-ivory">{v}<span className="text-faint"> / {maxSum}</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-night border border-line/60 overflow-hidden" role="img" aria-label={`${side === "a" ? A : B} 합계 ${v}, 최대 ${maxSum}`}>
                        <div className={cx("h-full rounded-full transition-[width] duration-300", side === "a" ? "bg-gold" : "bg-mist")} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[0.8rem] text-faint leading-relaxed">합계가 높은 쪽이 정답이라는 뜻이 아닙니다. 숫자가 마음과 다르게 나왔다면, 아직 적지 않은 기준이 있다는 신호일 수 있습니다.</p>
            </figure>
            <div className="rounded-2xl border border-line/70 bg-deep p-5">
              <h3 className="text-[0.92rem] font-medium">사전 부검: 1년 뒤 이 선택이 실패했다고 가정하면</h3>
              <ul className="mt-3 flex flex-col gap-2 text-[0.9rem] text-ivory/90">
                <li>· 실패의 가장 큰 이유 세 가지는 무엇이었을까요?</li>
                <li>· 그중 지금 미리 막을 수 있는 것은 무엇인가요?</li>
                <li>· 실패를 가장 먼저 알려 줄 신호(숫자·상황)는 무엇인가요?</li>
                <li>· 그 신호가 보이면 언제, 무엇으로 방향을 바꿀 건가요?</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-line/70 bg-deep p-5">
              <h3 className="text-[0.92rem] font-medium">점검 시점</h3>
              <ol className="mt-3 flex flex-col">
                {checkpoints.map((cp) => (
                  <li key={cp.months} className="flex gap-4 border-l border-gold/40 pl-4 pb-4 last:pb-0 relative">
                    <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-gold" aria-hidden />
                    <div>
                      <p className="text-[0.88rem] text-ivory"><span className="tabular">{cp.months}개월 뒤</span> · {cp.label}</p>
                      <p className="text-[0.82rem] text-mist mt-0.5">내가 정한 신호를 확인하고 계속·수정·중단 중 하나를 고릅니다.{cp.theme && <> 그해 전통 해석 주제: <span className="text-ivory/80">{cp.theme}</span></>}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <PremiumGate
            title="선택 실험실 확장 분석"
            items={["내가 정한 기준과 중요도로 두 선택지 비교", "사전 부검 질문으로 실패 시나리오 점검", "3·6·12개월 점검 시점과 그해 전통 주제 연결", "비교 결과를 아카이브에 저장하고 다시 보기"]}
            onOpen={() => go("premium")}
          />
        )}
      </section>

      <NextStep title="인생 아카이브" desc="이 고민과 결정을 기록해 두고, 나중에 돌아보세요." onClick={() => go("archive")} />
    </Page>
  );
}
