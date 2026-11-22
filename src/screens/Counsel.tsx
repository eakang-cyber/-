"use client";
// 고민상담소(#ask): 고객이 자기 상황을 직접 쓰고, 몇 가지를 탭으로 답하면, 사주 근거의 '상담지'를 받는다.
// 챗봇 화면이 아니라 상담지(문서) 형태. 무료 상담지는 완결되어 있고,
// 심층 상담(데모 결제)은 AI 상담사 풀이 · 추가 질문 3번 · 결정 리포트를 연다.
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, PRICE_VARIANTS } from "@/state/store";
import { useRouter } from "@/ui/router";
import { Badge, Button, Evidence, Field, Notice, ReadingCard, SectionHead, Segmented, cx } from "@/ui/kit";
import { CalcStatus, Page, ScreenTitle } from "@/ui/layout";
import { BetaCard } from "./Feedback";
import { GROUP_COLOR, GROUP_LABEL } from "@/engine/constants";
import { CONCERNS, DEADLINES, FEELINGS, TOPICS, Topic, hasCrisisSignal, buildCounsel, checkAiAnswer, counselPrompt, guessTopic, CounselAnswer, CounselInput } from "@/rules/counsel";
import { PHASES } from "@/rules/decision";
import { CITIES } from "@/engine/cities";
import { findPlace } from "@/engine/places";
import { STEMS, BRANCHES } from "@/engine/constants";

const EXAMPLES = [
  "대전 신탄진에 공장 부지를 사려고 하는데, 지금 움직여도 될지 모르겠어요.",
  "3년 다닌 회사를 그만두고 이직할지 고민이에요. 연봉은 오르지만 불안해요.",
  "친구가 같이 카페를 차리자고 하는데 돈을 넣어도 될까요?",
  "2년 사귄 사람과 결혼 얘기가 나오는데 확신이 안 서요.",
  "부모님 가게를 물려받을지, 내 일을 계속할지 고민입니다.",
];

const fmtPrice = (n: number) => n.toLocaleString("ko-KR");
const textareaCls = "w-full rounded-xl bg-night border border-line px-4 py-3 text-ivory placeholder:text-faint focus:border-gold/70 outline-none text-[0.98rem] leading-relaxed";

type Sampler = ((input: unknown, opts?: unknown) => Promise<{ text: string }>) & { json: <T>(input: unknown, opts?: unknown) => Promise<T> };

function useSampler() {
  const [s, setS] = useState<Sampler | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    const c = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
    if (!c?.use) { setS(null); return; }
    Promise.race([c.use("sample"), new Promise((r) => setTimeout(() => r(null), 10000))])
      .then((x) => alive && setS((x as Sampler) ?? null)).catch(() => alive && setS(null));
    return () => { alive = false; };
  }, []);
  return s;
}

export function Counsel() {
  const { state, dispatch, chart, subject } = useStore();
  const { go } = useRouter();
  const c = state.counsel;
  const set = (patch: Partial<CounselInput>) => dispatch({ type: "setCounsel", patch });
  const who = state.profileIsSample ? "예시 인물" : subject.name || "고객";
  const answer = useMemo(() => buildCounsel(chart, c, new Date(), who), [chart, c, who]);
  const answerRef = useRef<HTMLDivElement>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!c.topic && c.text.trim().length >= 6) {
      const g = guessTopic(c.text);
      if (g) set({ topic: g });
    }
    const pl = findPlace(c.text);
    if (pl && !c.place) set({ place: pl.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.text]);

  const canSubmit = c.text.trim().length >= 6 && !!c.topic;
  const submit = () => {
    setTouched(true);
    if (!canSubmit) return;
    dispatch({ type: "submitCounsel", value: true });
    requestAnimationFrame(() => answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const crisis = hasCrisisSignal(c.text);
  const showAnswer = state.counselSubmitted && answer && !crisis;

  return (
    <Page>
      <ScreenTitle eyebrow="고민상담소" title="지금 어떤 고민이 있나요?"
        desc="상황을 내 말로 적고 몇 가지만 눌러 주세요. 내 사주 기준으로 언제가 좋은지, 그 장소가 나와 맞는지, 인연은 언제 오는지 바로 말씀드려요.">
        <CalcStatus />
      </ScreenTitle>

      {state.profileIsSample && (
        <div className="rounded-2xl border border-gold/50 bg-gold/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-ivory font-medium">지금은 가상의 예시 인물 사주로 답해요</p>
            <p className="text-[0.88rem] text-mist mt-1">내 생년월일을 넣으면 같은 고민에도 나에게 맞춘 상담지가 나옵니다. 적어 둔 고민은 그대로 남아 있어요.</p>
          </div>
          <Button onClick={() => { dispatch({ type: "setReturnTo", value: "ask" }); go("start"); }}>내 사주로 상담받기</Button>
        </div>
      )}

      {/* 1. 고민 적기 */}
      <section className="flex flex-col gap-3">
        <p className="eyebrow">1 · 고민 적기</p>
        <label htmlFor="cs-text" className="sr-only">고민 내용</label>
        <textarea id="cs-text" rows={5} maxLength={600} className={textareaCls} value={c.text}
          placeholder="예: 대전 신탄진에 공장 부지를 사려고 하는데, 지금 움직여도 될지 모르겠어요."
          onChange={(e) => { set({ text: e.target.value }); if (state.counselSubmitted) dispatch({ type: "submitCounsel", value: false }); }} />
        <div className="flex items-center justify-between text-[0.75rem] text-faint">
          <span>이름·연락처 같은 개인정보는 적지 마세요. 이 브라우저 밖으로 나가지 않습니다.</span>
          <span className="tabular">{c.text.length}/600</span>
        </div>
        {!c.text && (
          <div className="flex flex-col gap-2">
            <p className="text-[0.8rem] text-faint">이런 고민도 괜찮아요</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((x) => (
                <button key={x} onClick={() => set({ text: x, topic: guessTopic(x) })} className="text-left rounded-xl border border-line px-3.5 py-2 text-[0.83rem] text-mist hover:text-ivory hover:border-mist/50 cursor-pointer">{x}</button>
              ))}
            </div>
          </div>
        )}
      </section>

      {crisis && (
        <section role="alert" className="rounded-2xl border border-warn/60 bg-warn/10 p-5 flex flex-col gap-3">
          <p className="text-ivory font-medium">지금 많이 힘드신 것 같아요. 이 고민은 사주보다 사람과 먼저 이야기해 주세요.</p>
          <p className="text-[0.92rem] text-ivory/90 leading-relaxed">24시간 언제든 전화할 수 있습니다.</p>
          <ul className="text-[0.95rem] text-ivory flex flex-col gap-1 select-text">
            <li>자살예방 상담전화 <b className="tabular">109</b></li>
            <li>정신건강 위기상담 <b className="tabular">1577-0199</b></li>
            <li>긴급한 위험이 있다면 <b className="tabular">112 · 119</b></li>
          </ul>
          <p className="text-[0.8rem] text-mist">운명OS는 이런 고민에 사주 상담지를 쓰지 않습니다.</p>
        </section>
      )}

      {/* 2. 참여형 질문 */}
      {c.text.trim().length >= 6 && !crisis && (
        <section className="flex flex-col gap-6 rounded-3xl border border-line/70 bg-deep p-5 sm:p-6">
          <p className="eyebrow">2 · 몇 가지만 눌러 주세요</p>
          <Field label="어떤 분야의 고민인가요?" error={touched && !c.topic ? "분야를 하나 골라 주세요." : null}>
            <Segmented size="sm" label="고민 분야" value={c.topic ?? ("" as Topic)} onChange={(v) => set({ topic: v })}
              options={TOPICS.map((t) => ({ value: t.id, label: t.label }))} />
          </Field>
          <Field label="언제까지 정해야 하나요?">
            <Segmented size="sm" label="마감" value={c.deadline ?? ""} onChange={(v) => set({ deadline: v as CounselInput["deadline"] })} options={DEADLINES.map((x) => ({ value: x, label: x }))} />
          </Field>
          <Field label="지금 마음은 어느 쪽에 가까운가요?">
            <Segmented size="sm" label="지금 마음" value={c.feeling ?? ""} onChange={(v) => set({ feeling: v as CounselInput["feeling"] })} options={FEELINGS.map((x) => ({ value: x, label: x }))} />
          </Field>
          <Field label="가장 걸리는 건 무엇인가요?">
            <Segmented size="sm" label="걸리는 것" value={c.concern ?? ""} onChange={(v) => set({ concern: v as CounselInput["concern"] })} options={CONCERNS.map((x) => ({ value: x, label: x }))} />
          </Field>
          {c.topic && ["realestate", "business", "career", "money"].includes(c.topic) && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="지금 사는 곳" htmlFor="cs-base">
                <select id="cs-base" className="h-11 rounded-xl bg-night border border-line px-3 text-ivory text-[0.92rem]" value={c.baseCityId || subject.cityId} onChange={(e) => set({ baseCityId: e.target.value })}>
                  {CITIES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </Field>
              <Field label="관련 장소 (선택)" htmlFor="cs-place">
                <input id="cs-place" className="h-11 rounded-xl bg-night border border-line px-3.5 text-ivory placeholder:text-faint text-[0.92rem] focus:border-gold/70 outline-none" placeholder="예: 신탄진" maxLength={20} value={c.place} onChange={(e) => set({ place: e.target.value })} />
              </Field>
              {c.place && !findPlace(c.place) && <p className="col-span-2 text-[0.78rem] text-faint">'{c.place}'은 아직 방위 목록에 없어요. 가까운 시·구 이름(예: 천안, 신탄진)으로 적으면 나와 맞는지 봐 드려요.</p>}
            </div>
          )}
          {c.topic === "love" && (
            <Field label="만나고 싶은 상대">
              <Segmented size="sm" label="만나고 싶은 상대" value={c.seek ?? (subject.sex === "male" ? "여성" : subject.sex === "female" ? "남성" : "사람")} onChange={(v) => set({ seek: v as CounselInput["seek"] })}
                options={[{ value: "여성", label: "여성" }, { value: "남성", label: "남성" }, { value: "사람", label: "상관없음" }]} />
            </Field>
          )}
          <Field label="고민 중인 선택지가 있다면 (선택)">
            <div className="grid grid-cols-2 gap-2">
              <input aria-label="선택지 A" className="h-11 rounded-xl bg-night border border-line px-3.5 text-ivory placeholder:text-faint text-[0.92rem] focus:border-gold/70 outline-none" placeholder="예: 지금 산다" maxLength={30} value={c.optionA} onChange={(e) => set({ optionA: e.target.value })} />
              <input aria-label="선택지 B" className="h-11 rounded-xl bg-night border border-line px-3.5 text-ivory placeholder:text-faint text-[0.92rem] focus:border-gold/70 outline-none" placeholder="예: 1년 더 본다" maxLength={30} value={c.optionB} onChange={(e) => set({ optionB: e.target.value })} />
            </div>
          </Field>
          <Button size="lg" onClick={submit}>상담지 받기</Button>
        </section>
      )}

      {/* 3. 상담지 */}
      <div ref={answerRef} className="scroll-mt-20">
        {showAnswer && <AnswerSheet a={answer} />}
      </div>

      <BetaCard />
    </Page>
  );
}

function AnswerSheet({ a }: { a: CounselAnswer }) {
  const { state, dispatch, toast } = useStore();
  const { go } = useRouter();
  const c = state.counsel;
  const [why, setWhy] = useState("");
  const relevant = new Set(a.months.filter((m) => a.focusGroups.includes(m.group)).map((m) => `${m.y}-${m.m}`));

  const react = (v: string) => {
    dispatch({ type: "reactCounsel", value: v });
    const now = new Date();
    dispatch({ type: "upsertRecord", record: {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: "question", year: now.getFullYear(), month: now.getMonth() + 1,
      title: c.text.trim().slice(0, 40) + (c.text.trim().length > 40 ? "…" : ""),
      note: `${a.topic.label} · 상담지 반응: ${v}${why.trim() ? ` · ${why.trim()}` : ""}`, sample: false,
    } });
    toast("아카이브의 '질문'에 남겼습니다");
  };

  return (
    <section className="flex flex-col gap-7">
      <div className="paper rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-2 text-[0.75rem] text-ink-soft"><span className="tracking-[0.25em] font-semibold">DESTINY OS 상담지</span><span className="ml-auto">{a.topic.label}</span></div>
        <p className="mt-4 text-[0.8rem] text-ink-soft">이렇게 이해했어요</p>
        <p className="mt-1 font-display text-[1.15rem] sm:text-[1.3rem] leading-[1.6] font-semibold">{a.understood}</p>
        <button onClick={() => document.getElementById("cs-text")?.focus()} className="mt-3 text-[0.82rem] text-ink-soft underline underline-offset-4 cursor-pointer">고쳐 쓰기</button>
      </div>

      <div className="rounded-3xl border border-gold/60 bg-raised p-6 sm:p-7 flex flex-col gap-3">
        <div className="flex items-center gap-2"><p className="eyebrow">결론</p><span className="ml-auto"><Badge layer="rule">사주 기준 추천</Badge></span></div>
        <p className="font-display text-[1.3rem] sm:text-[1.55rem] leading-[1.55] font-semibold text-ivory">{a.rec.headline}</p>
        <p className="text-[0.95rem] text-ivory/85 leading-relaxed">{a.rec.why}</p>
        {a.rec.avoid && <p className="text-[0.92rem] text-mist">{a.rec.avoid}</p>}
        <Evidence block={{ ruleIds: a.rec.ruleIds, facts: a.rec.facts }} label="이 추천의 근거" />
        <p className="text-[0.75rem] text-faint">전통 명리 해석에 근거한 추천이에요. 계약·투자는 아래 현실 조건도 함께 확인하세요.</p>
      </div>

      <div className="flex flex-col gap-3">
        <SectionHead eyebrow="전통 해석" title="이 고민 앞의 나" desc={a.topic.why} />
        {a.me.map((b) => <ReadingCard key={b.id} block={b} />)}
      </div>

      <div className="flex flex-col gap-3">
        <SectionHead eyebrow="전통 해석" title="시기의 흐름" />
        <ReadingCard block={a.timing}>
          <div className="mt-4 grid grid-cols-6 sm:grid-cols-12 gap-1.5" aria-label="앞으로 12개월 주제">
            {a.months.map((m) => {
              const hit = relevant.has(`${m.y}-${m.m}`);
              return (
                <div key={`${m.y}-${m.m}`} className={cx("rounded-lg border px-1 py-1.5 text-center", hit ? "border-gold/60 bg-gold/10" : "border-line/60")} title={`${m.y}년 ${m.m}월 · ${GROUP_LABEL[m.group]}`}>
                  <span className={cx("block text-[0.68rem] tabular", hit ? "text-gold" : "text-faint")}>{m.m}월</span>
                  <span className="mx-auto mt-1 block h-1.5 w-5 rounded-full" style={{ background: GROUP_COLOR[m.group] }} aria-hidden />
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[0.75rem] text-faint">금색 테두리 = 이 고민의 주제가 그달에 드러남. 색은 주제이지 좋고 나쁨이 아닙니다.</p>
        </ReadingCard>
      </div>

      {a.heart.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionHead eyebrow="현실 조언 · 사주와 무관" title="지금 마음에 대해" />
          <div className="rounded-2xl border border-ok/25 bg-deep p-5 flex flex-col gap-3">
            {a.heart.map((h) => <p key={h} className="text-[0.95rem] text-ivory/90 leading-relaxed">{h}</p>)}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <SectionHead eyebrow="현실 조언 · 사주와 무관" title="사주보다 먼저 확인할 것" />
        <ul className="flex flex-col gap-2">
          {a.checks.map((k) => (
            <li key={k.title} className="rounded-xl border border-ok/25 bg-deep p-4">
              <p className="text-ivory">{k.title}</p>
              <p className="text-[0.86rem] text-mist mt-0.5">{k.detail}</p>
              {k.source && <a href={k.source.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-1.5 text-[0.8rem] text-ok underline underline-offset-4">{k.source.name}에서 확인 ↗</a>}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-gold/30 bg-raised p-5 flex flex-col gap-3">
        <p className="eyebrow">이번 주에 해 볼 작은 실험</p>
        <p className="text-ivory text-[1rem]">{a.experiment}</p>
        <p className="text-[0.8rem] text-faint mt-2">스스로에게 물어볼 것</p>
        <ul className="flex flex-col gap-1.5">{a.questions.map((q) => <li key={q} className="text-[0.92rem] text-mist">· {q}</li>)}</ul>
      </div>

      {/* 참여: 반응 */}
      <div className="rounded-2xl border border-line/70 bg-deep p-5 flex flex-col gap-3">
        <p className="text-ivory font-medium">이 상담지가 내 상황에 맞나요?</p>
        <input aria-label="어떤 점이 맞거나 다른지" className="h-11 rounded-xl bg-night border border-line px-3.5 text-ivory placeholder:text-faint text-[0.9rem] focus:border-gold/70 outline-none" maxLength={120}
          placeholder="어떤 점이 맞았거나 달랐는지 (선택)" value={why} onChange={(e) => setWhy(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {["맞아요", "일부만 맞아요", "제 상황과 달라요"].map((v) => (
            <Button key={v} size="sm" variant={state.counselReaction === v ? "primary" : "ghost"} onClick={() => react(v)}>{v}</Button>
          ))}
        </div>
        <p className="text-[0.75rem] text-faint">고른 반응은 아카이브의 '질문' 기록으로 남아, 나중에 이 고민이 어떻게 됐는지 이어 적을 수 있어요.</p>
      </div>

      {state.decisionUnlocked ? <DeepCounsel a={a} /> : <DeepPaywall a={a} />}
    </section>
  );
}

function DeepPaywall({ a }: { a: CounselAnswer }) {
  const { state, dispatch, toast } = useStore();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const price = state.beta.priceVariant ?? PRICE_VARIANTS[1];
  const pay = () => {
    if (!agree || busy) return;
    setBusy(true);
    setTimeout(() => { dispatch({ type: "unlockDecision", value: true }); toast("데모 결제 완료 — 실제 청구는 없습니다"); setBusy(false); }, 800);
  };
  return (
    <section className="rounded-3xl border border-gold/40 bg-gradient-to-b from-raised to-deep p-6 sm:p-8 flex flex-col gap-5">
      <div>
        <p className="eyebrow">심층 상담 · 이 고민 1건</p>
        <h2 className="mt-2 font-display text-[1.4rem] sm:text-[1.65rem] font-semibold leading-snug">이 고민을 끝까지 같이 정리해 볼까요?</h2>
        <p className="mt-2 text-mist text-[0.93rem]">위 상담지는 무료로 완결됩니다. 심층 상담은 내 말과 사주 근거를 엮어 다시 풀어 주고, 이어지는 질문에 답합니다.</p>
      </div>
      <ul className="flex flex-col gap-2 text-[0.92rem]">
        {[
          "월별 추천 순위 TOP 5 — 앞으로 24개월 중 가장 좋은 달과 그 이유",
          "AI 상담사 풀이 — 내가 쓴 문장과 사주 근거를 엮은 맞춤 답변 (근거 규칙 밖의 말은 걸러 냄)",
          "추가 질문 3번 — '그럼 이건요?'를 이어서 물어보기",
          ...(a.topic.decision ? [`결정 리포트 — 24개월 단계별 흐름, 후보 비교, 확인 목록 전체, 질문 10개`] : []),
          "상담 기록 저장 — 3·6·12개월 뒤 다시 꺼내 보기",
        ].map((x) => <li key={x} className="flex gap-2 text-ivory/90"><span className="text-gold" aria-hidden>✓</span>{x}</li>)}
      </ul>
      <div className="paper rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[2rem] font-semibold tabular">{fmtPrice(price)}</span><span>원</span>
          <span className="ml-auto text-[0.78rem] text-ink-soft">고민 1건 · 1회 결제</span>
        </div>
        <p className="text-[0.8rem] text-ink-soft">결제 후 7일 이내·미열람 시 전액 환불(초안, 법률 검토 필요).</p>
        <label className="flex items-start gap-2.5 text-[0.85rem] cursor-pointer">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#101827]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          전통 해석은 참고용이며 투자·법률·의료 자문이 아님을 이해했습니다.
        </label>
        <Button variant="paper" onClick={pay} disabled={!agree || busy}>{busy ? "데모 결제 처리 중…" : `${fmtPrice(price)}원 모의 결제 (데모)`}</Button>
        <p className="text-[0.75rem] text-ink-soft">베타 데모입니다. 카드 정보를 받지 않으며 실제로 청구되지 않습니다.</p>
      </div>
    </section>
  );
}

type Ai = Record<"opening" | "tradition" | "timing" | "practical" | "question", string>;

function DeepCounsel({ a }: { a: CounselAnswer }) {
  const { state, dispatch } = useStore();
  const { go } = useRouter();
  const sampler = useSampler();
  const c = state.counsel;
  const [ai, setAi] = useState<Ai | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "blocked" | "error">("idle");
  const [turns, setTurns] = useState<{ q: string; a: string }[]>([]);
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);
  const prompt = useMemo(() => counselPrompt(c, a), [c, a]);

  const run = async () => {
    if (!sampler) return;
    setStatus("loading");
    try {
      const res = await sampler.json<unknown>(prompt, { modelTier: "default" });
      if (checkAiAnswer(res)) { setAi(res); setStatus("idle"); } else setStatus("blocked");
    } catch { setStatus("error"); }
  };

  const ask = async () => {
    if (!sampler || !ai || !q.trim() || turns.length >= 3) return;
    setAsking(true);
    const history = turns.map((t) => `고객: ${t.q}\n상담사: ${t.a}`).join("\n");
    const input = `${prompt}\n\n[앞선 상담 답변]\n${JSON.stringify(ai)}\n${history}\n\n고객의 추가 질문: ${q.trim().slice(0, 300)}\n\n같은 규칙으로, JSON 없이 한국어 3~5문장으로만 답하세요. 근거에 없는 사주 해석은 만들지 마세요.`;
    try {
      const { text } = await sampler(input, { modelTier: "default" });
      const ok = checkAiAnswer({ opening: text, tradition: "-", timing: "-", practical: "-", question: "-" });
      setTurns((t) => [...t, { q: q.trim(), a: ok ? text.trim() : "이 답변은 운명OS 기준(예언·단정 금지)을 통과하지 못해 표시하지 않았습니다. 질문을 바꿔 다시 물어봐 주세요." }]);
      setQ("");
    } catch {
      setTurns((t) => [...t, { q: q.trim(), a: "지금은 답을 받을 수 없어요. 잠시 뒤 다시 시도해 주세요." }]);
    } finally { setAsking(false); }
  };

  const openDecision = () => {
    if (!a.topic.decision) return;
    dispatch({ type: "setDecision", patch: { text: c.text.trim().slice(0, 60), type: a.topic.decision, phase: PHASES[a.topic.decision][0].id } });
    go("decide");
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center gap-2"><Badge layer="premium">심층 상담</Badge><Badge layer="demo" /></div>

      <div className="rounded-3xl border border-line/70 bg-deep p-6 flex flex-col gap-3">
        <p className="eyebrow">월별 추천 순위 TOP 5</p>
        <ol className="flex flex-col gap-2.5">
          {(a.rec.love ? [...a.rec.love.when.months].sort((x, y) => y.score - x.score) : a.rec.timing.ranked).slice(0, 5).map((m, i) => (
            <li key={`${m.p.y}-${m.p.m}`} className="flex gap-3 items-baseline">
              <span className={cx("tabular w-5 shrink-0", i === 0 ? "text-gold" : "text-faint")}>{i + 1}</span>
              <span className="text-ivory tabular w-24 shrink-0">{m.p.y}년 {m.p.m}월</span>
              <span className="text-[0.86rem] text-mist">{m.why.join(", ") || "무난한 흐름"} <span className="text-faint font-mono text-[0.75rem]">{STEMS[m.p.stem]}{BRANCHES[m.p.branch]}</span></span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-3xl border border-gold/40 bg-raised p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2"><p className="eyebrow">AI 상담사 풀이</p><span className="ml-auto"><Badge layer="copy">AI 해설</Badge></span></div>
        {sampler === undefined && <p className="text-mist text-[0.9rem]">AI 상담사를 연결하는 중…</p>}
        {sampler === null && (
          <Notice>이 화면에서는 AI 상담사를 쓸 수 없어요. claude.ai에 로그인한 상태로 이 페이지를 열면 내 Claude 계정으로 풀이를 받을 수 있습니다. 위의 상담지는 그대로 유효합니다.</Notice>
        )}
        {sampler && !ai && (
          <>
            <p className="text-[0.88rem] text-mist">버튼을 누르면 <b className="text-ivory">고민 글과 위 상담지의 근거</b>가 Claude에게 전달됩니다. 이름과 생년월일은 보내지 않습니다. 처음 한 번 사용 허락을 묻습니다.</p>
            <Button onClick={run} disabled={status === "loading"}>{status === "loading" ? "풀이를 쓰는 중…" : "내 고민 풀이 받기"}</Button>
            {status === "blocked" && <p className="text-[0.85rem] text-warn">답변이 운명OS 기준(예언·단정·전문 용어 금지)을 통과하지 못해 표시하지 않았습니다. 다시 시도해 주세요.</p>}
            {status === "error" && <p className="text-[0.85rem] text-warn">지금은 풀이를 받을 수 없어요. 사용을 허락하지 않았거나 잠시 사용량이 많습니다.</p>}
          </>
        )}
        {ai && (
          <div className="flex flex-col gap-4 text-[0.97rem] leading-relaxed">
            <p className="text-ivory">{ai.opening}</p>
            <div><p className="text-[0.75rem] text-faint mb-1">전통 해석으로 보면</p><p className="text-ivory/90">{ai.tradition}</p></div>
            <div><p className="text-[0.75rem] text-faint mb-1">시기로 보면</p><p className="text-ivory/90">{ai.timing}</p></div>
            <div><p className="text-[0.75rem] text-ok mb-1">현실의 다음 한 걸음 · 사주와 무관</p><p className="text-ivory/90">{ai.practical}</p></div>
            <p className="text-gold/90"><span className="text-faint">스스로에게 묻기 · </span>{ai.question}</p>
            <Evidence block={{ ruleIds: [...new Set([...a.me.flatMap((b) => b.ruleIds), ...a.timing.ruleIds])], facts: ["AI는 위 상담지의 근거 블록만 받아 문장을 다시 썼습니다", "예언·확률·단정·한자 표현은 자동으로 걸러 냅니다"] }} label="이 풀이의 근거" />
          </div>
        )}
      </div>

      {ai && (
        <div className="rounded-2xl border border-line/70 bg-deep p-5 flex flex-col gap-3">
          <div className="flex items-center"><p className="text-ivory font-medium">이어서 묻기</p><span className="ml-auto text-[0.8rem] text-faint tabular">{turns.length}/3</span></div>
          {turns.map((t, i) => (
            <div key={i} className="flex flex-col gap-1.5 border-t border-line/60 pt-3">
              <p className="text-[0.88rem] text-gold">Q. {t.q}</p>
              <p className="text-[0.93rem] text-ivory/90 leading-relaxed">{t.a}</p>
            </div>
          ))}
          {turns.length < 3 && (
            <div className="flex gap-2">
              <input aria-label="추가 질문" className="flex-1 h-11 rounded-xl bg-night border border-line px-3.5 text-ivory placeholder:text-faint text-[0.92rem] focus:border-gold/70 outline-none" maxLength={300}
                placeholder="예: 그럼 자금은 언제 준비하는 게 좋을까요?" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} />
              <Button size="md" onClick={ask} disabled={asking || !q.trim()}>{asking ? "…" : "묻기"}</Button>
            </div>
          )}
        </div>
      )}

      {a.topic.decision && (
        <button onClick={openDecision} className="group w-full text-left rounded-2xl border border-gold/40 bg-deep hover:border-gold/70 p-5 flex items-center gap-4 cursor-pointer">
          <div className="flex-1">
            <p className="text-[0.78rem] text-gold">포함됨 · 결정 리포트</p>
            <p className="font-display text-[1.1rem] font-semibold text-ivory mt-0.5">이 고민을 24개월 단계별로 정리하기</p>
            <p className="text-[0.86rem] text-mist mt-1">조사·협상·계약·실행 단계와 주제가 맞물리는 달, 후보 비교, 확인 목록 전체</p>
          </div>
          <span className="text-gold transition-transform group-hover:translate-x-1" aria-hidden>→</span>
        </button>
      )}
    </section>
  );
}
