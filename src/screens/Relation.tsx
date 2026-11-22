"use client";
// 화면 F — 관계 시뮬레이터. 점수·확률·결과 예언 없이 '서로 다르게 읽히는 지점'과 대화 주제를 제공한다.
import { useEffect, useState } from "react";
import { useStore, RelationType } from "@/state/store";
import { useRouter } from "@/ui/router";
import { Page, ScreenTitle, SampleBanner, CalcStatus, NextStep } from "@/ui/layout";
import { Badge, Button, Card, Field, Notice, PremiumGate, ReadingCard, SectionHead, Segmented, cx, inputCls } from "@/ui/kit";
import { BirthInput, ChartResult, computeChart } from "@/engine/chart";
import { CITIES } from "@/engine/cities";
import { BRANCHES_KO, ELEMENT_KO, STEMS_KO, branchElement, stemElement } from "@/engine/constants";
import { buildPair } from "@/rules/interpret";
import { j } from "@/rules/josa";

const REL_TYPES: RelationType[] = ["연인·배우자", "친구", "동료", "가족"];
const POS_LABEL = { hour: "시", day: "일", month: "월", year: "연" } as const;

function PillarStrip({ chart, name, tag }: { chart: ChartResult; name: string; tag?: React.ReactNode }) {
  const order = ["hour", "day", "month", "year"] as const;
  return (
    <div className="rounded-2xl border border-line/70 bg-deep p-4 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[0.95rem] font-medium text-ivory">{name}</span>
        {tag}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {order.map((pos) => {
          const p = chart.pillars[pos];
          return (
            <div key={pos} className={cx("rounded-lg border px-1 py-2 text-center", pos === "day" ? "border-gold/50 bg-gold/5" : "border-line/60 bg-night/50")}>
              <div className="text-[0.68rem] text-faint">{POS_LABEL[pos]}</div>
              {p ? (
                <>
                  <div className="font-display text-[1.05rem] text-ivory mt-0.5">{STEMS_KO[p.stem]}{BRANCHES_KO[p.branch]}</div>
                  <div className="text-[0.66rem] text-mist leading-tight mt-0.5">{ELEMENT_KO[stemElement(p.stem)]}·{ELEMENT_KO[branchElement(p.branch)]}</div>
                </>
              ) : (
                <div className="text-[0.75rem] text-faint mt-1.5">미상</div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[0.72rem] text-faint">강조된 칸이 태어난 날(나 자신의 자리)입니다.</p>
    </div>
  );
}

function PartnerForm({ onApplied }: { onApplied: () => void }) {
  const { state, dispatch } = useStore();
  const [d, setD] = useState<BirthInput>(state.partner);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setD(state.partner), [state.partner]);
  const set = <K extends keyof BirthInput>(k: K, v: BirthInput[K]) => setD((x) => ({ ...x, [k]: v }));
  const num = (v: string) => (v === "" ? NaN : Number(v));

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.name.trim()) return setErr("상대를 부를 이름이나 별칭을 적어 주세요.");
    if ([d.year, d.month, d.day].some((x) => !Number.isFinite(x))) return setErr("생년월일을 모두 입력해 주세요.");
    if (d.timeKnown && (!(d.hour >= 0 && d.hour <= 23) || !(d.minute >= 0 && d.minute <= 59))) return setErr("시간은 0~23시, 분은 0~59분으로 입력해 주세요.");
    try {
      computeChart(d, state.policy);
    } catch (x) {
      return setErr((x as Error).message);
    }
    setErr(null);
    dispatch({ type: "setPartner", partner: { ...d, name: d.name.trim() }, isSample: false });
    onApplied();
  };

  return (
    <form onSubmit={apply} className="flex flex-col gap-5" noValidate>
      <Field label="상대 이름 또는 별칭" htmlFor="pf-name" hint="실명이 아니어도 됩니다.">
        <input id="pf-name" className={inputCls} value={d.name} maxLength={20} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field label="달력">
        <Segmented<"solar" | "lunar"> label="달력" size="sm" value={d.calendar}
          options={[{ value: "solar", label: "양력" }, { value: "lunar", label: "음력" }]}
          onChange={(v) => setD((x) => ({ ...x, calendar: v, isLeapMonth: v === "solar" ? false : x.isLeapMonth }))} />
      </Field>
      <Field label="생년월일" htmlFor="pf-y">
        <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
          <input id="pf-y" aria-label="출생 연도" inputMode="numeric" className={inputCls} placeholder="연도" value={Number.isFinite(d.year) ? d.year : ""} onChange={(e) => set("year", num(e.target.value))} />
          <input aria-label="출생 월" inputMode="numeric" className={inputCls} placeholder="월" value={Number.isFinite(d.month) ? d.month : ""} onChange={(e) => set("month", num(e.target.value))} />
          <input aria-label="출생 일" inputMode="numeric" className={inputCls} placeholder="일" value={Number.isFinite(d.day) ? d.day : ""} onChange={(e) => set("day", num(e.target.value))} />
        </div>
        {d.calendar === "lunar" && (
          <label className="flex items-center gap-2 text-[0.88rem] text-mist mt-1 cursor-pointer">
            <input type="checkbox" checked={d.isLeapMonth} onChange={(e) => set("isLeapMonth", e.target.checked)} className="h-4 w-4 accent-[#dcc18d]" />
            윤달이에요
          </label>
        )}
      </Field>
      <Field label="태어난 시간" htmlFor="pf-h" hint={d.timeKnown ? undefined : "시간을 모르면 태어난 시 두 글자는 비교에서 빠집니다."}>
        <div className="grid grid-cols-2 gap-2">
          <input id="pf-h" aria-label="시" inputMode="numeric" disabled={!d.timeKnown} className={cx(inputCls, !d.timeKnown && "opacity-40")} placeholder="시(0~23)" value={d.timeKnown && Number.isFinite(d.hour) ? d.hour : ""} onChange={(e) => set("hour", num(e.target.value))} />
          <input aria-label="분" inputMode="numeric" disabled={!d.timeKnown} className={cx(inputCls, !d.timeKnown && "opacity-40")} placeholder="분" value={d.timeKnown && Number.isFinite(d.minute) ? d.minute : ""} onChange={(e) => set("minute", num(e.target.value))} />
        </div>
        <label className="flex items-center gap-2 text-[0.88rem] text-mist mt-1 cursor-pointer">
          <input type="checkbox" checked={!d.timeKnown} onChange={(e) => setD((x) => ({ ...x, timeKnown: !e.target.checked, hour: e.target.checked ? 12 : x.hour, minute: e.target.checked ? 0 : x.minute }))} className="h-4 w-4 accent-[#dcc18d]" />
          시간을 몰라요
        </label>
      </Field>
      <Field label="태어난 도시" htmlFor="pf-city">
        <select id="pf-city" className={inputCls} value={d.cityId} onChange={(e) => set("cityId", e.target.value)}>
          {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      {err && <p role="alert" className="text-[0.85rem] text-warn">{err}</p>}
      <div className="flex gap-2">
        <Button type="submit">이 정보로 비교하기</Button>
        <Button type="button" variant="quiet" onClick={() => { setD(state.partner); setErr(null); }}>되돌리기</Button>
      </div>
    </form>
  );
}

function Script({ s, nameA, nameB }: { s: { situation: string; tension: string; lines: { who: "A" | "B"; text: string }[] }; nameA: string; nameB: string }) {
  return (
    <article className="rounded-2xl border border-line/70 bg-deep p-5">
      <h3 className="font-display text-[1.05rem] font-semibold text-ivory">{s.situation}</h3>
      <p className="mt-1.5 text-[0.88rem] text-mist leading-relaxed"><span className="text-faint">전통 해석에서 본 지점 · </span>{s.tension}</p>
      <div className="mt-4 border-l border-gold/40 pl-4 flex flex-col gap-3">
        {s.lines.map((l, i) => (
          <p key={i} className="text-[0.93rem] leading-relaxed">
            <span className={cx("mr-2 text-[0.78rem] font-medium", l.who === "A" ? "text-gold" : "text-mist")}>{l.who === "A" ? nameA : nameB}</span>
            <span className="text-ivory/90">“{l.text}”</span>
          </p>
        ))}
      </div>
      <p className="mt-3 text-[0.75rem] text-faint">대화 예시는 편집팀이 쓴 연습용 문장입니다. 두 사람의 실제 말투로 바꿔 써 보세요.</p>
    </article>
  );
}

export function Relation() {
  const { state, dispatch, chart, subject, partnerChart, partnerError, toast } = useStore();
  const { go } = useRouter();
  const [editing, setEditing] = useState(false);
  const myName = subject.name || "나";
  const partnerName = state.partner.name || "상대";
  const pair = partnerChart && state.partnerConsent ? buildPair(chart, partnerChart, myName, partnerName) : null;

  return (
    <Page>
      <ScreenTitle
        eyebrow="관계 시뮬레이터"
        title="같은 관계도, 서로 다르게 읽힙니다"
        desc="두 사람의 출생 정보를 나란히 놓고, 서로를 어떤 방식으로 읽는지와 대화해 볼 주제를 정리합니다. 궁합 점수는 만들지 않습니다."
      />
      <SampleBanner />
      <CalcStatus />

      <Notice title="이 화면이 하지 않는 일">
        관계의 성공 확률이나 궁합 점수를 계산하지 않습니다. 이별, 외도, 결혼 여부를 예언하지 않습니다. 전통 해석은 대화를 시작하는 재료로만 씁니다.
      </Notice>

      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="01 · 두 사람" title="비교할 상대" />
        <Field label="관계">
          <Segmented<RelationType> label="관계 유형" size="sm" value={state.relationType}
            options={REL_TYPES.map((r) => ({ value: r, label: r }))}
            onChange={(v) => dispatch({ type: "setRelationType", value: v })} />
        </Field>
        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ivory font-medium">{partnerName}</span>
            {state.partnerIsSample && <Badge layer="sample">데모 인물</Badge>}
            <span className="text-[0.85rem] text-faint tabular">
              {state.partner.calendar === "lunar" ? "음력 " : ""}{state.partner.year}.{String(state.partner.month).padStart(2, "0")}.{String(state.partner.day).padStart(2, "0")}
              {state.partner.isLeapMonth ? "(윤달)" : ""} · {state.partner.timeKnown ? `${String(state.partner.hour).padStart(2, "0")}:${String(state.partner.minute).padStart(2, "0")}` : "시간 미상"} · {CITIES.find((c) => c.id === state.partner.cityId)?.name}
            </span>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
              {editing ? "입력 닫기" : "상대 정보 입력"}
            </Button>
          </div>
          {state.partnerIsSample && <p className="text-[0.82rem] text-mist">실존 인물이 아닌 데모용 출생 정보입니다. 실제 상대의 정보로 바꿔 볼 수 있습니다.</p>}
          {editing && (
            <div className="border-t border-line/60 pt-4">
              <PartnerForm onApplied={() => { setEditing(false); toast("상대 정보를 반영했습니다. 저장되지 않습니다."); }} />
            </div>
          )}
          {partnerError && <p role="alert" className="text-[0.85rem] text-warn">{partnerError}</p>}
        </Card>

        <label className="flex items-start gap-3 rounded-xl border border-line bg-deep/60 px-4 py-3.5 cursor-pointer">
          <input type="checkbox" checked={state.partnerConsent} onChange={(e) => dispatch({ type: "setConsent", value: e.target.checked })} className="mt-1 h-5 w-5 shrink-0 accent-[#dcc18d]" />
          <span className="text-[0.86rem] text-ivory/90 leading-relaxed">
            상대방의 출생 정보는 그 사람의 개인정보입니다. 상대에게 이 비교를 해 본다고 알리고 동의를 받았거나, 데모 인물로만 체험합니다.
            <span className="block text-faint mt-1">이 데모에서는 상대 정보를 저장하거나 서버로 보내지 않습니다. 실제 서비스에서는 제3자 정보 수집·이용 기준을 법률 검토 후 적용합니다.</span>
          </span>
        </label>
      </section>

      {!state.partnerConsent && (
        <Notice tone="warn" title="확인이 필요합니다">위 내용에 동의하면 두 사람의 비교 결과가 열립니다.</Notice>
      )}

      {state.partnerConsent && !partnerChart && (
        <Notice tone="warn" title="상대 정보를 계산할 수 없습니다">{partnerError ?? "입력을 확인해 주세요."}</Notice>
      )}

      {pair && partnerChart && (
        <>
          <section className="flex flex-col gap-4">
            <SectionHead eyebrow="02 · 나란히 보기" title="두 사람의 여덟 글자" desc="각 칸은 위 글자와 아래 글자의 기운(나무·불·흙·쇠·물)을 함께 보여 줍니다." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PillarStrip chart={chart} name={myName} tag={state.profileIsSample ? <Badge layer="sample" /> : undefined} />
              <PillarStrip chart={partnerChart} name={partnerName} tag={state.partnerIsSample ? <Badge layer="sample">데모 인물</Badge> : undefined} />
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <SectionHead eyebrow="03 · 서로 다르게 읽히는 성향" title="같은 자리, 다른 모양" />
            <div className="rounded-2xl border border-line/70 bg-deep overflow-hidden">
              <table className="w-full text-[0.88rem] table-fixed">
                <caption className="sr-only">두 사람의 성향 비교</caption>
                <thead>
                  <tr className="text-left text-faint text-[0.78rem]">
                    <th scope="col" className="px-4 py-3 font-normal w-[28%]">항목</th>
                    <th scope="col" className="px-3 py-3 font-normal">{myName}</th>
                    <th scope="col" className="px-3 py-3 font-normal">{partnerName}</th>
                  </tr>
                </thead>
                <tbody>
                  {pair.differences.map((d) => (
                    <tr key={d.topic} className="border-t border-line/60 align-top">
                      <th scope="row" className="px-4 py-3 text-left font-normal text-mist">{d.topic}</th>
                      <td className="px-3 py-3 text-ivory">{d.a}</td>
                      <td className="px-3 py-3 text-ivory">{d.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-4">
              <ReadingCard block={pair.aReadsB} eyebrow={`${myName} → ${partnerName}`} />
              <ReadingCard block={pair.bReadsA} eyebrow={`${partnerName} → ${myName}`} />
              <ReadingCard block={pair.dayBranch} eyebrow="생활 리듬" />
              <ReadingCard block={pair.complement} eyebrow="기운의 보완" />
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <SectionHead eyebrow="04 · 대화해 볼 질문" title="해석보다 중요한 건 직접 묻는 일" desc={`${j(state.relationType, "으로/로")} 지내는 두 사람이 서로에게 물어볼 만한 질문입니다.`} />
            <ol className="flex flex-col gap-2.5">
              {pair.questions.map((q, i) => (
                <li key={q} className="flex gap-3 rounded-xl border border-line/60 bg-deep px-4 py-3.5">
                  <span className="text-gold font-display tabular">{i + 1}</span>
                  <span className="text-[0.93rem] text-ivory/90 leading-relaxed">{q}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="flex flex-col gap-4">
            <SectionHead eyebrow="05 · 갈등 상황별 대화 예시" title="부딪힐 때 꺼내 볼 문장" desc="전통 해석이 짚는 지점과, 그 상황에서 연습해 볼 대화 예시입니다." />
            <Script s={pair.scenarios[0]} nameA={myName} nameB={partnerName} />
            {state.premium ? (
              <>
                <div className="flex items-center gap-2"><Badge layer="premium" /><Badge layer="demo" /><span className="text-[0.8rem] text-faint">관계 심층 분석</span></div>
                {pair.scenarios.slice(1).map((s) => <Script key={s.situation} s={s} nameA={myName} nameB={partnerName} />)}
              </>
            ) : (
              <PremiumGate
                title={`나머지 ${pair.scenarios.length - 1}가지 상황의 대화 예시`}
                items={pair.scenarios.slice(1).map((s) => s.situation).concat(["두 사람의 10년 흐름을 겹쳐 본 관계 타임라인", "상황별 근거와 다른 해석 보기"])}
                onOpen={() => go("premium")}
              />
            )}
          </section>
        </>
      )}

      <NextStep title="인생 선택 실험실" desc="고민 중인 두 가지 선택지를 나란히 놓고 비교해 보세요." onClick={() => go("lab")} />
    </Page>
  );
}
