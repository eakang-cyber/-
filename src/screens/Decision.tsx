"use client";
// 화면: 중요한 결정 리포트.
// 무료: 내 결정 한 줄 → 12개월 주제 달력, 지금 단계와 맞물리는 달, 현실 확인 3가지, '어디'에 대한 정직한 답.
// 유료(데모): 24개월 단계별 예시 흐름, 후보 A·B 비교, 확인 목록 전체, 질문 10개, 결정 일지.
import { useEffect, useMemo, useState } from "react";
import { useStore, PRICE_VARIANTS } from "@/state/store";
import { useRouter } from "@/ui/router";
import { Badge, Button, Evidence, Field, Notice, SectionHead, Segmented, cx, inputCls } from "@/ui/kit";
import { CalcStatus, Page, ScreenTitle } from "@/ui/layout";
import { BetaCard } from "./Feedback";
import { GROUP_COLOR, GROUP_LABEL } from "@/engine/constants";
import {
  CHECKLIST, DECISION_TYPES, DecisionType, MonthCell, PHASES, buildMonths, buildRoadmap, guessType, monthBlock,
} from "@/rules/decision";
import { j } from "@/rules/josa";

const fmtPrice = (n: number) => n.toLocaleString("ko-KR");

const CRITERIA: Record<DecisionType, string[]> = {
  realestate: ["가격", "입지·물류", "규제·인허가", "확장 가능성", "자금 부담(낮을수록 높게)"],
  business: ["수요", "비용(낮을수록 높게)", "경쟁(약할수록 높게)", "내 역량", "회수 기간"],
  job: ["성장", "보상", "안정성", "함께할 사람", "생활 균형"],
  invest: ["기대 수익", "손실 위험(낮을수록 높게)", "유동성", "내가 이해하는 정도", "비용(낮을수록 높게)"],
  partner: ["신뢰", "역량 보완", "조건", "이탈 위험(낮을수록 높게)", "소통"],
};

function questionsFor(type: DecisionType, text: string, place: string, budget: string): string[] {
  const target = place || "이 대상";
  const specific: Record<DecisionType, string[]> = {
    realestate: [
      `${target}에 지으려는 시설이 용도지역상 가능한지, 지번으로 직접 확인했나요?`,
      "같은 예산으로 살 수 있는 다른 후보지 두 곳은 어디인가요?",
      "금리가 2%p 오르면 월 부담은 얼마가 되나요?",
      "인허가를 포함해 실제 가동까지 몇 개월이 걸린다고 보나요?",
      "5년 뒤 확장이 필요하면 이 부지에서 가능한가요?",
      "팔아야 할 때 얼마나 빨리, 얼마에 팔 수 있는 땅인가요?",
    ],
    business: [
      "돈을 내겠다고 말한 고객은 지금 몇 명인가요?",
      "매출이 0이어도 몇 개월을 버틸 수 있나요?",
      "가장 강한 경쟁자가 내일 가격을 30% 내리면 어떻게 하나요?",
      "첫 3개월 동안 반드시 확인할 숫자 하나는 무엇인가요?",
      "혼자 할 일과 맡길 일을 나눠 적어 봤나요?",
      "지원 사업 공고 일정과 내 일정이 맞물리나요?",
    ],
    job: [
      "떠나는 이유와 가고 싶은 이유를 따로 적으면 각각 몇 개인가요?",
      "목표 회사의 현직자와 이야기해 봤나요?",
      "6개월 뒤에도 같은 이유로 옮기고 싶을까요?",
      "공백이 생기면 생활비 몇 개월 분이 있나요?",
      "지금 회사에서 바꿀 수 있는 조건은 이미 요청해 봤나요?",
      "새 회사에서 첫 3개월 안에 보여 줄 결과는 무엇인가요?",
    ],
    invest: [
      "최악의 경우 잃을 수 있는 금액은 얼마이고, 감당할 수 있나요?",
      "이 상품의 수익 구조를 다른 사람에게 3문장으로 설명할 수 있나요?",
      "돈이 급히 필요할 때 얼마나 빨리 찾을 수 있나요?",
      "손실이 얼마가 되면 멈추겠다는 기준을 적어 두었나요?",
      "추천한 사람은 이 거래로 무엇을 얻나요?",
      "비상금 6개월 분은 따로 있나요?",
    ],
    partner: [
      "상대와 크게 의견이 갈렸던 적이 있나요? 어떻게 풀었나요?",
      "최종 결정권은 누구에게 있나요?",
      "한쪽이 나갈 때 지분은 어떻게 처리하나요?",
      "비용 승인 한도와 정산 주기를 정했나요?",
      "상대의 재무 상태를 서류로 확인했나요?",
      "1년 뒤 둘의 역할은 어떻게 달라져 있을까요?",
    ],
  };
  return [
    ...specific[type],
    `이 결정을 6개월 미루면 잃는 것과 얻는 것은 무엇인가요?`,
    "가장 믿을 만한 반대 의견을 준 사람은 누구이고, 무엇이라고 했나요?",
    budget ? `'${budget}' 조건이 깨지는 상황은 어떤 경우인가요?` : "예산이 20% 늘어나도 진행하겠습니까?",
    `1년 뒤 '${text || "이 결정"}'이 실패했다면, 가장 그럴듯한 이유는 무엇일까요?`,
  ];
}

export function Decision() {
  const { state, dispatch, chart, toast } = useStore();
  const { go } = useRouter();
  const d = state.decision;
  const set = (patch: Partial<typeof d>) => dispatch({ type: "setDecision", patch });
  const type: DecisionType | null = d.type;
  const phases = type ? PHASES[type] : [];
  const phase = phases.find((p) => p.id === d.phase) ?? phases[0] ?? null;
  const now = useMemo(() => new Date(), []);
  const months12 = useMemo(() => (type ? buildMonths(chart, type, now, 12) : []), [chart, type, now]);
  const months24 = useMemo(() => (type ? buildMonths(chart, type, now, 24) : []), [chart, type, now]);
  const roadmap = useMemo(() => (type ? buildRoadmap(months24, type) : []), [months24, type]);
  const [sel, setSel] = useState<number>(0);
  const selCell = months12[sel] ?? null;
  const price = state.beta.priceVariant ?? PRICE_VARIANTS[1];
  const ready = !!(d.text.trim() && type);
  const unlocked = state.decisionUnlocked;

  // 결정 종류 자동 추정(사용자가 바꿀 수 있음)
  useEffect(() => {
    if (!d.type && d.text.trim()) {
      const g = guessType(d.text);
      if (g) set({ type: g, phase: PHASES[g][0].id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.text]);

  const aligned = phase ? months12.filter((m) => m.strong.includes(phase.id) || m.weak.includes(phase.id)) : [];
  const title = d.text.trim() || "앞둔 결정";

  return (
    <Page wide>
      <ScreenTitle eyebrow="중요한 결정 리포트" title={ready ? `“${title}”` : "앞둔 결정을 한 줄로 적어 보세요"}
        desc="내 사주의 앞으로 12개월 주제와 결정 단계를 맞대어 봅니다. 사라, 사지 마라는 말은 하지 않습니다. 대신 무엇을 언제 확인할지 정리해 드립니다.">
        <CalcStatus />
      </ScreenTitle>

      {state.profileIsSample && (
        <div className="rounded-2xl border border-gold/50 bg-gold/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-ivory font-medium">지금은 가상의 예시 인물 사주로 계산하고 있어요</p>
            <p className="text-[0.88rem] text-mist mt-1">내 생년월일을 넣으면 같은 결정이라도 완전히 다른 달력이 나옵니다. 1분이면 됩니다.</p>
          </div>
          <Button onClick={() => { dispatch({ type: "setReturnTo", value: "decide" }); go("start"); }}>내 사주로 보기</Button>
        </div>
      )}

      {/* 입력 */}
      <section className="rounded-3xl border border-line/70 bg-deep p-5 sm:p-6 flex flex-col gap-5">
        <Field label="어떤 결정을 앞두고 있나요?" htmlFor="dc-text" hint="예시를 눌러 채워도 됩니다. 입력 내용은 이 브라우저 밖으로 나가지 않습니다.">
          <input id="dc-text" className={inputCls} maxLength={60} value={d.text} placeholder="예: 대전 신탄진에 공장 부지 매입"
            onChange={(e) => set({ text: e.target.value })} />
        </Field>
        <div className="flex flex-wrap gap-2 -mt-2">
          {DECISION_TYPES.map((t) => (
            <button key={t.id} onClick={() => set({ text: t.example, type: t.id, phase: PHASES[t.id][0].id })}
              className="h-8 px-3 rounded-full border border-line text-[0.8rem] text-mist hover:text-ivory hover:border-mist/50 cursor-pointer">{t.example}</button>
          ))}
        </div>
        <Field label="결정 종류">
          <Segmented size="sm" label="결정 종류" value={type ?? ("" as DecisionType)} onChange={(v) => set({ type: v, phase: PHASES[v][0].id })}
            options={DECISION_TYPES.map((t) => ({ value: t.id, label: t.label }))} />
        </Field>
        {type && (
          <Field label="지금 어느 단계인가요?">
            <Segmented size="sm" label="지금 단계" value={phase?.id ?? ""} onChange={(v) => set({ phase: v })}
              options={phases.map((p) => ({ value: p.id, label: p.label }))} />
          </Field>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="장소·대상 (선택)" htmlFor="dc-place">
            <input id="dc-place" className={inputCls} maxLength={40} value={d.place} placeholder="예: 대전 대덕구 신탄진" onChange={(e) => set({ place: e.target.value })} />
          </Field>
          <Field label="예산·조건 (선택)" htmlFor="dc-budget">
            <input id="dc-budget" className={inputCls} maxLength={40} value={d.budget} placeholder="예: 대출 포함 8억, 2년 안에 가동" onChange={(e) => set({ budget: e.target.value })} />
          </Field>
        </div>
      </section>

      {!ready ? (
        <Notice>결정 한 줄과 종류를 정하면 바로 아래에 내 달력이 나옵니다.</Notice>
      ) : (
        <>
          {/* 무료 1: 핵심 한 줄 */}
          <section className="rounded-3xl border border-gold/40 bg-raised p-6 flex flex-col gap-3">
            <p className="eyebrow">지금 단계 · {phase?.label}</p>
            <p className="font-display text-[1.35rem] sm:text-[1.6rem] leading-snug font-semibold">
              앞으로 12개월 중 <span className="text-gold">{aligned.length}개월</span>이 '{phase?.label}' 단계와 주제가 맞물립니다
            </p>
            <div className="flex flex-wrap gap-2">
              {aligned.length ? aligned.map((m) => (
                <button key={`${m.period.y}-${m.period.m}`} onClick={() => setSel(months12.indexOf(m))}
                  className={cx("h-9 px-3.5 rounded-full border text-[0.85rem] tabular cursor-pointer", m.strong.includes(phase!.id) ? "border-gold text-gold bg-gold/10" : "border-line text-mist")}>
                  {m.period.y}.{String(m.period.m).padStart(2, "0")} {m.strong.includes(phase!.id) ? "· 강" : "· 약"}
                </button>
              )) : <p className="text-mist text-[0.92rem]">12개월 안에는 이 단계와 직접 겹치는 달이 없습니다. 준비와 점검에 시간을 쓰기 좋은 흐름으로 읽습니다.</p>}
            </div>
            <p className="text-[0.82rem] text-faint">'{phase?.label}'은 전통적으로 {phase?.why}와 연결됩니다. 강 = 그달의 드러나는 주제와 겹침, 약 = 생활 속 장면과 겹침. 날짜를 골라 주는 택일이 아닙니다.</p>
          </section>

          {/* 무료 2: 12개월 달력 */}
          <section className="flex flex-col gap-4">
            <SectionHead eyebrow="무료" title="앞으로 12개월, 내 주제 달력" desc="달을 누르면 그달의 해석과 근거가 나옵니다. 색은 주제이지 좋고 나쁨이 아닙니다." />
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2" role="listbox" aria-label="월 선택">
              {months12.map((m, i) => (
                <MonthTile key={i} m={m} active={i === sel} hit={phase ? (m.strong.includes(phase.id) ? "strong" : m.weak.includes(phase.id) ? "weak" : null) : null} onClick={() => setSel(i)} />
              ))}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem] text-faint">
              <li><span className="text-gold">●</span> 지금 단계와 강하게 맞물림</li>
              <li><span className="text-mist">○</span> 약하게 맞물림</li>
              <li><span className="text-warn">!</span> 큰돈 움직이기 전 이중 확인</li>
            </ul>
            {selCell && type && (() => {
              const b = monthBlock(chart, selCell, type);
              return (
                <article className="rounded-2xl border border-line/70 bg-deep p-5">
                  <div className="flex items-center gap-2"><Badge layer="rule" /><span className="ml-auto text-[0.75rem] text-faint">{selCell.label.ko}월</span></div>
                  <h3 className="mt-2 font-display text-[1.1rem] font-semibold">{b.title}</h3>
                  <p className="mt-2 text-[0.93rem] text-ivory/85 leading-relaxed">{b.body}</p>
                  <Evidence block={b} />
                </article>
              );
            })()}
          </section>

          {/* 무료 3: 어디? */}
          <section className="grid md:grid-cols-2 gap-4">
            <article className="rounded-2xl border border-line/70 bg-deep p-5">
              <h3 className="font-display text-[1.05rem] font-semibold">“어디가 맞나요?”에 대한 정직한 답</h3>
              <p className="mt-2 text-[0.9rem] text-mist leading-relaxed">
                사주로 {d.place ? j(d.place, "이/가") : "특정 지역이나 부지가"} 나에게 맞는 땅이라고 말할 근거는 없습니다. 전통 방위론은 학파마다 판단이 갈려 아직 검수 중이며, 큰돈이 걸린 선택에 쓰지 않도록 설계했습니다.
                장소는 아래 확인 목록과 후보 비교로 정하세요.
              </p>
            </article>
            <article className="rounded-2xl border border-line/70 bg-deep p-5">
              <h3 className="font-display text-[1.05rem] font-semibold">“언제가 시즌인가요?”</h3>
              <p className="mt-2 text-[0.9rem] text-mist leading-relaxed">
                실제 '시즌'은 금리, 정책자금 공고, 매물이 나오는 시기, 인허가 기간이 정합니다. 위 달력은 그 일정 안에서 <b className="text-ivory">어느 달에 어떤 주제를 의식할지</b>를 보여 주는 보조 도구입니다.
              </p>
            </article>
          </section>

          {/* 무료 4: 확인 목록 3개 */}
          {type && <Checklist type={type} limit={unlocked ? undefined : 3} />}

          {/* 리포트 */}
          {!unlocked ? (
            <Paywall title={title} type={type!} price={price} roadmap={roadmap} />
          ) : (
            <UnlockedReport title={title} type={type!} roadmap={roadmap} />
          )}
        </>
      )}

      <button onClick={() => go("lab")} className="text-left text-[0.88rem] text-mist hover:text-gold cursor-pointer">두 선택지를 내 기준으로 자세히 비교하고 싶다면 → 선택 실험실</button>
      <BetaCard />
    </Page>
  );
}

function MonthTile({ m, active, hit, onClick }: { m: MonthCell; active: boolean; hit: "strong" | "weak" | null; onClick: () => void }) {
  return (
    <button role="option" aria-selected={active} onClick={onClick}
      aria-label={`${m.period.y}년 ${m.period.m}월: ${GROUP_LABEL[m.stemGroup]}${hit === "strong" ? ", 지금 단계와 강하게 맞물림" : hit === "weak" ? ", 약하게 맞물림" : ""}${m.moneyCaution ? ", 큰돈 이중 확인" : ""}`}
      className={cx("relative rounded-xl border p-3 text-left cursor-pointer transition-colors", active ? "border-ivory/70 bg-raised" : "border-line/70 bg-deep hover:border-mist/50")}>
      <div className="flex items-center justify-between">
        <span className="text-[0.75rem] text-faint tabular">{m.period.y !== new Date().getFullYear() ? `${String(m.period.y).slice(2)}.` : ""}{m.period.m}월</span>
        <span className="text-[0.8rem]">
          {hit === "strong" && <span className="text-gold" aria-hidden>●</span>}
          {hit === "weak" && <span className="text-mist" aria-hidden>○</span>}
          {m.moneyCaution && <span className="text-warn ml-1" aria-hidden>!</span>}
        </span>
      </div>
      <span className="mt-2 block h-1.5 rounded-full" style={{ background: GROUP_COLOR[m.stemGroup] }} aria-hidden />
      <span className="mt-1.5 block text-[0.78rem] text-ivory leading-tight">{GROUP_LABEL[m.stemGroup]}</span>
    </button>
  );
}

function Checklist({ type, limit }: { type: DecisionType; limit?: number }) {
  const all = CHECKLIST[type];
  const items = limit ? all.slice(0, limit) : all;
  const [done, setDone] = useState<Record<number, boolean>>({});
  const n = Object.values(done).filter(Boolean).length;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end gap-3">
        <SectionHead eyebrow={limit ? "무료 · 현실 확인" : "리포트 · 현실 확인 전체"} title="사주보다 먼저 확인할 것" />
        <span className="ml-auto text-[0.8rem] text-faint tabular">{n}/{items.length} 확인</span>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((c, i) => (
          <li key={c.title} className="rounded-xl border border-ok/25 bg-deep p-4 flex gap-3">
            <input type="checkbox" aria-label={`${c.title} 확인함`} className="mt-1 h-4 w-4 shrink-0 accent-[#6fbf9a]" checked={!!done[i]} onChange={(e) => setDone((x) => ({ ...x, [i]: e.target.checked }))} />
            <div className="min-w-0">
              <p className={cx("text-[0.95rem]", done[i] ? "text-faint line-through" : "text-ivory")}>{c.title}</p>
              <p className="text-[0.85rem] text-mist mt-0.5 leading-relaxed">{c.detail}</p>
              {c.source && <a href={c.source.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-1.5 text-[0.8rem] text-ok underline underline-offset-4">{c.source.name}에서 확인 ↗</a>}
            </div>
          </li>
        ))}
      </ul>
      {limit && all.length > limit && <p className="text-[0.82rem] text-faint">나머지 {all.length - limit}개 항목(공식 확인처 포함)은 결정 리포트에 들어 있습니다.</p>}
    </section>
  );
}

type Road = ReturnType<typeof buildRoadmap>;

function Paywall({ title, type, price, roadmap }: { title: string; type: DecisionType; price: number; roadmap: Road }) {
  const { dispatch, toast } = useStore();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const first = roadmap[0];
  const pay = () => {
    if (!agree || busy) return;
    setBusy(true);
    setTimeout(() => {
      dispatch({ type: "unlockDecision", value: true });
      toast("데모 결제 완료 — 실제 청구는 없습니다");
      setBusy(false);
      requestAnimationFrame(() => document.getElementById("decision-report")?.scrollIntoView({ behavior: "smooth" }));
    }, 800);
  };
  return (
    <section className="rounded-3xl border border-gold/40 bg-gradient-to-b from-raised to-deep p-6 sm:p-8 flex flex-col gap-6">
      <div>
        <p className="eyebrow">결정 리포트 · 이 결정 1건</p>
        <h2 className="mt-2 font-display text-[1.45rem] sm:text-[1.7rem] font-semibold leading-snug">“{title}” 결정 리포트</h2>
        <p className="mt-2 text-mist text-[0.93rem]">무료 달력은 한 단계씩 봅니다. 리포트는 모든 단계를 24개월에 이어 붙이고, 후보 비교와 확인 목록 전체까지 한 화면에 정리합니다.</p>
      </div>

      {/* 실제 내용 미리보기: 첫 단계 */}
      <div className="rounded-2xl border border-line/70 bg-night/60 p-5">
        <p className="text-[0.78rem] text-faint">미리보기 · 단계별 흐름 1/{roadmap.length}</p>
        {first && <RoadStep step={first} index={0} />}
        <ol className="mt-3 flex flex-col gap-1.5">
          {roadmap.slice(1).map((r, i) => (
            <li key={r.phase.id} className="flex items-center gap-3 text-[0.88rem] text-mist">
              <span className="tabular text-faint w-5">{i + 2}</span>{r.phase.label}<span className="ml-auto text-[0.75rem] text-faint">리포트에서 열림</span>
            </li>
          ))}
        </ol>
      </div>

      <ul className="grid sm:grid-cols-2 gap-2 text-[0.9rem]">
        {[
          "24개월 단계별 흐름 — 모든 단계",
          "후보 A·B를 내 기준으로 비교",
          `현실 확인 목록 전체 ${CHECKLIST[type].length}개 + 공식 확인처`,
          "결정 전 스스로에게 던질 질문 10개",
          "결정 일지: 이유를 남기고 3·6·12개월 뒤 돌아보기",
          "아카이브에 저장하고 다시 보기",
        ].map((x) => <li key={x} className="flex gap-2 text-ivory/90"><span className="text-gold" aria-hidden>✓</span>{x}</li>)}
      </ul>

      <div className="paper rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[2rem] font-semibold tabular">{fmtPrice(price)}</span><span>원</span>
          <span className="ml-auto text-[0.78rem] text-ink-soft">이 결정 1건 · 1회 결제 · 구독 아님</span>
        </div>
        <p className="text-[0.8rem] text-ink-soft">결제 후 7일 이내·미열람 시 전액 환불(초안, 법률 검토 필요). 계산 오류가 확인되면 전액 환불.</p>
        <label className="flex items-start gap-2.5 text-[0.85rem] cursor-pointer">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#101827]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          전통 해석은 참고용이며 투자·법률 자문이 아님을 이해했습니다.
        </label>
        <Button variant="paper" onClick={pay} disabled={!agree || busy}>{busy ? "데모 결제 처리 중…" : `${fmtPrice(price)}원 모의 결제 (데모)`}</Button>
        <p className="text-[0.75rem] text-ink-soft">베타 데모입니다. 카드 정보를 받지 않으며 실제로 청구되지 않습니다.</p>
      </div>
    </section>
  );
}

function RoadStep({ step, index }: { step: Road[number]; index: number }) {
  const c = step.cell;
  return (
    <div className="mt-2 flex gap-4">
      <div className="flex flex-col items-center">
        <span className="h-7 w-7 rounded-full grid place-items-center text-[0.8rem] tabular border border-gold/60 text-gold">{index + 1}</span>
      </div>
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="text-ivory font-medium">{step.phase.label}</p>
          <p className="text-[0.85rem] tabular text-gold">{c ? `${c.period.y}년 ${c.period.m}월 무렵` : "24개월 안에 겹치는 달 없음"}</p>
          {c && <span className="text-[0.72rem] text-faint">주제 겹침 {step.strength === "strong" ? "강" : "약"}</span>}
        </div>
        <p className="text-[0.86rem] text-mist mt-1">{step.phase.doThis}. 전통적으로 {step.phase.why}와 겹치는 달입니다.</p>
      </div>
    </div>
  );
}

function UnlockedReport({ title, type, roadmap }: { title: string; type: DecisionType; roadmap: Road }) {
  const { state, dispatch, toast } = useStore();
  const d = state.decision;
  const criteria = CRITERIA[type];
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const r = (opt: "a" | "b", c: string) => ratings[`${opt}:${c}`] ?? 2;
  const total = (opt: "a" | "b") => criteria.reduce((s, c) => s + r(opt, c), 0);
  const max = criteria.length * 4;
  const qs = questionsFor(type, d.text.trim(), d.place.trim(), d.budget.trim());
  const nameA = d.optionA.trim() || "후보 A";
  const nameB = d.optionB.trim() || "후보 B";

  const saveJournal = () => {
    const y = new Date().getFullYear(), m = new Date().getMonth() + 1;
    dispatch({ type: "upsertRecord", record: {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: "question", year: y, month: m,
      title: `결정: ${title}`,
      note: `단계 흐름 — ${roadmap.map((x) => `${x.phase.label} ${x.cell ? `${x.cell.period.y}.${x.cell.period.m}` : "-"}`).join(" → ")}${d.optionA || d.optionB ? ` / 비교: ${nameA} ${total("a")}점 vs ${nameB} ${total("b")}점(내가 매긴 점수)` : ""}`,
      sample: false,
    } });
    toast("결정 일지를 아카이브에 남겼습니다");
  };

  return (
    <section id="decision-report" className="flex flex-col gap-8 scroll-mt-20">
      <div className="flex flex-wrap items-center gap-2"><Badge layer="premium">결정 리포트</Badge><Badge layer="demo" /><span className="text-[0.8rem] text-faint">“{title}”</span></div>

      <div className="flex flex-col gap-3">
        <SectionHead eyebrow="리포트 1" title="24개월 단계별 흐름" desc="전통 주제가 맞물리는 달을 단계 순서대로 이어 본 예시입니다. 실제 일정은 인허가·자금·시장 조건으로 정하세요." />
        <div className="rounded-2xl border border-line/70 bg-deep p-5 flex flex-col gap-2">
          {roadmap.map((s, i) => <RoadStep key={s.phase.id} step={s} index={i} />)}
          <Evidence block={{ ruleIds: ["DEC-PHASE-001", "LUCK-MONTH-001"], facts: roadmap.map((s) => `${s.phase.label}: ${s.cell ? s.cell.label.hanja + "월" : "해당 없음"}`) }} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionHead eyebrow="리포트 2" title="후보 비교 — 내가 매긴 기준으로" desc="점수는 당신이 매깁니다. 운세 점수가 아닙니다." />
        <div className="grid sm:grid-cols-2 gap-3">
          <input aria-label="후보 A 이름" className={inputCls} placeholder="후보 A (예: 신탄진 ○○리)" value={d.optionA} maxLength={30} onChange={(e) => dispatch({ type: "setDecision", patch: { optionA: e.target.value } })} />
          <input aria-label="후보 B 이름" className={inputCls} placeholder="후보 B (예: 다른 산업단지)" value={d.optionB} maxLength={30} onChange={(e) => dispatch({ type: "setDecision", patch: { optionB: e.target.value } })} />
        </div>
        <div className="rounded-2xl border border-line/70 bg-deep p-4 flex flex-col gap-4">
          {criteria.map((c) => (
            <div key={c} className="grid grid-cols-[1fr] sm:grid-cols-[9rem_1fr_1fr] gap-2 sm:items-center">
              <span className="text-[0.88rem] text-ivory">{c}</span>
              {(["a", "b"] as const).map((o) => (
                <label key={o} className="flex items-center gap-2 text-[0.8rem] text-mist">
                  <span className="w-14 truncate">{o === "a" ? nameA : nameB}</span>
                  <input type="range" min={0} max={4} value={r(o, c)} onChange={(e) => setRatings((x) => ({ ...x, [`${o}:${c}`]: Number(e.target.value) }))} className="flex-1" aria-label={`${o === "a" ? nameA : nameB} ${c}`} />
                  <span className="w-4 tabular text-ivory text-right">{r(o, c)}</span>
                </label>
              ))}
            </div>
          ))}
          <div className="border-t border-line/60 pt-3 flex flex-col gap-2">
            {(["a", "b"] as const).map((o) => (
              <div key={o} className="grid grid-cols-[5rem_1fr_3rem] items-center gap-3 text-[0.85rem]">
                <span className="truncate text-mist">{o === "a" ? nameA : nameB}</span>
                <span className="h-2 rounded-full bg-night overflow-hidden"><span className={cx("block h-full rounded-full", o === "a" ? "bg-gold" : "bg-mist")} style={{ width: `${(total(o) / max) * 100}%` }} /></span>
                <span className="tabular text-ivory text-right">{total(o)}/{max}</span>
              </div>
            ))}
            <p className="text-[0.75rem] text-faint">내가 매긴 기준의 합계 · 운세 점수 아님</p>
          </div>
        </div>
      </div>

      <Checklist type={type} />

      <div className="flex flex-col gap-3">
        <SectionHead eyebrow="리포트 4" title="결정 전 스스로에게 던질 질문 10개" />
        <ol className="rounded-2xl border border-line/70 bg-deep p-5 flex flex-col gap-2.5">
          {qs.map((q, i) => <li key={q} className="flex gap-3 text-[0.92rem] text-ivory/90"><span className="tabular text-faint w-5 shrink-0">{i + 1}</span>{q}</li>)}
        </ol>
      </div>

      <div className="rounded-2xl border border-gold/30 bg-raised p-5 flex flex-col gap-3">
        <p className="eyebrow">리포트 5 · 결정 일지</p>
        <p className="text-ivory">결정 이유와 지금의 흐름을 남겨 두면, 나중에 그때의 나와 비교할 수 있습니다.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={saveJournal}>아카이브에 결정 일지 남기기</Button>
          <Button size="sm" variant="ghost" disabled title="정식 서비스에서 알림 제공">3·6·12개월 뒤 알림 (준비 중)</Button>
        </div>
      </div>
      <Button variant="quiet" size="sm" onClick={() => dispatch({ type: "unlockDecision", value: false })}>데모 결제 해제</Button>
    </section>
  );
}
