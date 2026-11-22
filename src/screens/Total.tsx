"use client";
// 총운(#total): 결과 첫 화면. 운세 사이트처럼 총평 위주, 초등·중등학생도 읽을 수 있게.
// 본문에 한자·전문 용어·배지·규칙 번호를 보여 주지 않는다(근거는 맨 아래 접힌 곳에만).
import { useMemo } from "react";
import { useStore } from "@/state/store";
import { useRouter } from "@/ui/router";
import { Button, Evidence, cx } from "@/ui/kit";
import { Page, SampleBanner } from "@/ui/layout";
import { buildTotal, Weather } from "@/rules/total";
import { BRANCHES_KO, ELEMENT_KO, STEMS_KO, branchElement, stemElement } from "@/engine/constants";
import { pad2 } from "@/engine/time";

function WeatherIcon({ w }: { w: Weather }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const };
  if (w === "맑음") return (<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden {...p}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></svg>);
  if (w === "구름 조금") return (<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden {...p}><circle cx="8.5" cy="8.5" r="3" /><path d="M8.5 3v1.2M3 8.5h1.2M4.6 4.6l.9.9" /><path d="M8 19h9.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.4 1.5A2.8 2.8 0 0 0 8 19z" /></svg>);
  return (<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden {...p}><path d="M7 15h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.4 1.5A2.8 2.8 0 0 0 7 15z" /><path d="M9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5" /></svg>);
}
const W_COLOR: Record<Weather, string> = { "맑음": "text-gold", "구름 조금": "text-mist", "흐린 뒤 갬": "text-[#8fa9d6]" };

export function Total() {
  const { chart, subject, state } = useStore();
  const { go } = useRouter();
  const name = state.profileIsSample ? "예시 인물" : subject.name || "고객";
  const t = useMemo(() => buildTotal(chart, name), [chart, name]);
  const stages = t.sections.filter((s) => s.weather && ["early", "mid", "late"].includes(s.id));
  const rest = t.sections.filter((s) => !["early", "mid", "late"].includes(s.id));
  const ps = [chart.pillars.hour, chart.pillars.day, chart.pillars.month, chart.pillars.year];
  const ampm = subject.hour < 12 ? "오전" : "오후";
  const h12 = subject.hour % 12 === 0 ? 12 : subject.hour % 12;
  const maxEl = Math.max(...chart.elementCounts, 1);

  return (
    <Page>
      <SampleBanner />

      {/* 총평 */}
      <section className="paper rounded-3xl p-6 sm:p-9">
        <p className="text-[0.75rem] tracking-[0.25em] font-semibold text-ink-soft">평생 운세 총평</p>
        <p className="mt-1 text-[0.85rem] text-ink-soft">
          {name} · {subject.calendar === "lunar" ? "음력" : "양력"} {subject.year}년 {subject.month}월 {subject.day}일{subject.timeKnown ? ` ${ampm} ${h12}시 ${pad2(subject.minute)}분` : " · 태어난 시간 모름"}
        </p>
        <h1 className="mt-5 font-display text-[1.6rem] sm:text-[2rem] leading-[1.45] font-semibold">{t.headline}</h1>
        <div className="mt-4 flex flex-col gap-1.5 text-[1.02rem] leading-relaxed">
          {t.summary.map((s) => <p key={s}>{s}</p>)}
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          {[["행운의 색", t.lucky.color], ["행운의 숫자", t.lucky.number], ["좋은 방향", t.lucky.direction]].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-ink/10 py-3">
              <p className="text-[0.72rem] text-ink-soft">{k}</p>
              <p className="mt-0.5 font-semibold">{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 초년 · 중년 · 말년 */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[1.35rem] font-semibold">인생 흐름</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {stages.map((s) => (
            <article key={s.id} className="rounded-2xl border border-line/70 bg-deep p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className={W_COLOR[s.weather!]}><WeatherIcon w={s.weather!} /></span>
                <div>
                  <p className="text-[0.95rem] text-ivory font-medium">{s.title.split(" (")[0]}</p>
                  <p className="text-[0.72rem] text-faint">{s.title.match(/\((.+)\)/)?.[1]}</p>
                </div>
                <span className={cx("ml-auto text-[0.85rem] font-medium", W_COLOR[s.weather!])}>{s.weather}</span>
              </div>
              {s.lines.map((l) => <p key={l} className="text-[0.93rem] text-ivory/85 leading-relaxed">{l}</p>)}
            </article>
          ))}
        </div>
      </section>

      {/* 항목별 */}
      {rest.map((s) => (
        <section key={s.id} className="flex flex-col gap-2.5">
          <h2 className="font-display text-[1.3rem] font-semibold">{s.title}</h2>
          <div className="rounded-2xl border border-line/70 bg-deep p-5 flex flex-col gap-2">
            {s.lines.map((l) => <p key={l} className="text-[1rem] text-ivory/90 leading-[1.75]">{l}</p>)}
            {s.tips && s.tips.items.length > 0 && (
              <div className={cx(s.tips.label && "mt-2 rounded-xl bg-night/60 border border-line/60 p-4")}>
                {s.tips.label && <p className="text-[0.82rem] text-gold mb-1.5">{s.tips.label}</p>}
                <ul className="flex flex-col gap-1.5">
                  {s.tips.items.map((x) => <li key={x} className={cx("flex gap-2 leading-relaxed", s.tips!.label ? "text-[0.95rem] text-ivory/90" : "text-[0.82rem] text-faint")}>{s.tips!.label && <span className="text-gold" aria-hidden>·</span>}{x}</li>)}
                </ul>
              </div>
            )}
          </div>
        </section>
      ))}

      {/* 다음으로 */}
      <section className="grid sm:grid-cols-2 gap-3">
        <button onClick={() => go("ask")} className="text-left rounded-2xl border border-gold/50 bg-raised p-5 cursor-pointer hover:border-gold">
          <p className="text-[0.8rem] text-gold">지금 고민이 있다면</p>
          <p className="mt-1 font-display text-[1.1rem] font-semibold">고민상담소에서 바로 물어보기 →</p>
          <p className="mt-1 text-[0.85rem] text-mist">"언제 계약할까요?", "언제 연애할까요?" 같은 질문에 답해 드려요.</p>
        </button>
        <button onClick={() => go("map")} className="text-left rounded-2xl border border-line/70 bg-deep p-5 cursor-pointer hover:border-gold/50">
          <p className="text-[0.8rem] text-faint">해마다 어떻게 흘러갈까</p>
          <p className="mt-1 font-display text-[1.1rem] font-semibold">0~90세 인생 지도 보기 →</p>
          <p className="mt-1 text-[0.85rem] text-mist">한 해씩 넘기며 그해의 흐름을 볼 수 있어요.</p>
        </button>
      </section>

      {/* 내 사주 표: 한글 읽기만 */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[1.2rem] font-semibold">내 사주 표</h2>
        <div className="grid grid-cols-4 gap-2 text-center">
          {ps.map((p, i) => (
            <div key={i} className="rounded-xl border border-line/70 bg-deep py-3">
              <p className="text-[0.72rem] text-faint">{["태어난 시", "태어난 날", "태어난 달", "태어난 해"][i]}</p>
              {p ? (
                <>
                  <p className="mt-1 font-display text-[1.25rem] text-ivory">{STEMS_KO[p.stem]}{BRANCHES_KO[p.branch]}</p>
                  <p className="text-[0.72rem] text-mist">{ELEMENT_KO[stemElement(p.stem)]} · {ELEMENT_KO[branchElement(p.branch)]}</p>
                </>
              ) : <p className="mt-2 text-[0.8rem] text-faint">모름</p>}
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-line/70 bg-deep p-4">
          <p className="text-[0.8rem] text-mist mb-2.5">나무·불·흙·쇠·물, 다섯 기운이 몇 개씩 있는지</p>
          <ul className="flex flex-col gap-2">
            {ELEMENT_KO.map((k, i) => (
              <li key={k} className="grid grid-cols-[2.5rem_1fr_1.5rem] items-center gap-3 text-[0.85rem]">
                <span className="text-mist">{k}</span>
                <span className="h-2 rounded-full bg-night/80 overflow-hidden"><span className="block h-full rounded-full bg-gold" style={{ width: `${(chart.elementCounts[i] / maxEl) * 100}%`, minWidth: chart.elementCounts[i] ? 8 : 0 }} /></span>
                <span className="text-ivory tabular text-right">{chart.elementCounts[i]}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Evidence block={{ ruleIds: t.ruleIds, facts: ["이 총평은 아래 전통 규칙을 조합해 쉬운 말로 옮긴 것이에요."] }} label="이 풀이는 어떻게 나왔나요?" />
          <Button variant="quiet" size="sm" onClick={() => go("me")}>성향 자세히 보기</Button>
        </div>
        <p className="text-[0.75rem] text-faint">전통 명리학 해석을 바탕으로 한 풀이예요. 재미와 참고로 봐 주세요.</p>
      </section>
    </Page>
  );
}
