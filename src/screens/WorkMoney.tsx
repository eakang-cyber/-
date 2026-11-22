"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/state/store";
import { useRouter } from "@/ui/router";
import { Badge, Evidence, Notice, PremiumGate, SectionHead, Segmented, cx } from "@/ui/kit";
import { CalcStatus, NextStep, Page, SampleBanner, ScreenTitle } from "@/ui/layout";
import { buildWork, buildYears } from "@/rules/interpret";
import { INTERESTS, Interest } from "@/rules/content";
import { GROUP_COLOR, GROUP_LABEL } from "@/engine/constants";

const NOW = new Date().getFullYear();

export function WorkMoney() {
  const { chart, state, dispatch } = useStore();
  const { go } = useRouter();
  const sections = useMemo(() => buildWork(chart, state.interest, NOW), [chart, state.interest]);
  const [open, setOpen] = useState<string>(sections[0].id);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const decadeYears = useMemo(() => buildYears(chart).filter((y) => y.year >= NOW && y.year < NOW + 10), [chart]);

  return (
    <Page>
      <SampleBanner />
      <ScreenTitle eyebrow="돈과 일의 지도" title="'운이 좋다'가 아니라, 무엇을 확인할지"
        desc="같은 출생 구조를 다섯 가지 질문으로 다시 읽습니다. 전통 해석과 현실 실행 조언은 섞지 않고 나란히 둡니다.">
        <CalcStatus />
      </ScreenTitle>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2"><Badge layer="user">내가 고른 관심사</Badge><span className="text-[0.8rem] text-faint">출생 정보와 무관하며, 현실 조언에만 반영됩니다.</span></div>
        <Segmented label="관심사" value={state.interest} onChange={(v) => dispatch({ type: "setInterest", value: v as Interest })}
          options={INTERESTS.map((i) => ({ value: i, label: i }))} />
      </section>

      <section className="flex flex-col gap-3">
        {sections.map((s, i) => {
          const isOpen = open === s.id;
          return (
            <article key={s.id} className={cx("rounded-2xl border bg-deep transition-colors", isOpen ? "border-gold/40" : "border-line/70")}>
              <button onClick={() => setOpen(isOpen ? "" : s.id)} aria-expanded={isOpen} className="w-full flex items-center gap-4 p-5 text-left cursor-pointer">
                <span className="text-[0.75rem] text-faint tabular w-5">Q{i + 1}</span>
                <span className="flex-1 font-display text-[1.05rem] font-semibold text-ivory leading-snug">{s.question}</span>
                <span aria-hidden className={cx("text-mist transition-transform", isOpen && "rotate-90")}>›</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 grid md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-line/60 bg-night/50 p-4">
                    <div className="flex items-center gap-2"><Badge layer="rule" /><span className="text-[0.78rem] text-faint">{s.traditional.title}</span></div>
                    <p className="mt-2 text-[0.93rem] text-ivory/90 leading-relaxed">{s.traditional.body}</p>
                    <Evidence block={s.traditional} label="근거" />
                  </div>
                  <div className="rounded-xl border border-ok/25 bg-night/50 p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2"><Badge layer="practical" /><span className="text-[0.78rem] text-faint">{state.interest} 기준 · 사주와 무관</span></div>
                    <ul className="flex flex-col gap-2 text-[0.9rem] text-ivory/90">
                      {s.practical.map((p) => <li key={p} className="flex gap-2"><span className="text-ok" aria-hidden>→</span>{p}</li>)}
                    </ul>
                    <div className="border-t border-line/60 pt-3">
                      <p className="text-[0.78rem] text-faint mb-2">직접 확인할 것</p>
                      <ul className="flex flex-col gap-2">
                        {s.verify.map((v) => {
                          const k = `${s.id}:${v}`;
                          return (
                            <li key={k}>
                              <label className="flex gap-2.5 items-start text-[0.88rem] text-mist cursor-pointer">
                                <input type="checkbox" className="mt-1 h-4 w-4 accent-[#6fbf9a]" checked={!!checked[k]} onChange={(e) => setChecked((c) => ({ ...c, [k]: e.target.checked }))} />
                                <span className={cx(checked[k] && "line-through text-faint")}>{v}</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>

      {/* 프리미엄: 앞으로 10년 일과 돈의 주제 달력 */}
      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="심층 분석" title={`앞으로 10년, 일과 돈의 주제 달력`} desc="해마다 일과 돈에 관련된 주제가 어떤 순서로 오는지 봅니다. 수익을 예측하지 않습니다." />
        {state.premium ? (
          <div className="rounded-2xl border border-line/70 bg-deep p-4 overflow-x-auto">
            <div className="flex items-center gap-2 mb-3"><Badge layer="premium" /><Badge layer="demo" /></div>
            <table className="w-full text-[0.85rem] min-w-[30rem]">
              <thead><tr className="text-faint text-left"><th className="font-normal py-2 pr-3">연도</th><th className="font-normal pr-3">나이</th><th className="font-normal pr-3">드러나는 주제</th><th className="font-normal">일·돈 관점의 질문</th></tr></thead>
              <tbody>
                {decadeYears.map((y) => (
                  <tr key={y.year} className="border-t border-line/50">
                    <td className="py-2.5 pr-3 tabular text-ivory">{y.year}</td>
                    <td className="pr-3 tabular text-mist">{y.age}</td>
                    <td className="pr-3"><span className="inline-flex items-center gap-1.5 text-ivory"><span className="h-2 w-2 rounded-full" style={{ background: GROUP_COLOR[y.stemGroup] }} aria-hidden />{GROUP_LABEL[y.stemGroup]}</span></td>
                    <td className="text-mist">{WORK_Q[y.stemGroup]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PremiumGate title="10년 일·돈 주제 달력과 관심사별 검증 계획" items={["앞으로 10년, 해마다 일과 돈에 관한 질문", "관심사 5가지 전체의 전통 해석 · 현실 조언 비교", "리포트로 저장하고 다시 보기"]} onOpen={() => go("premium")} />
        )}
      </section>

      <Notice title="중요한 결정에 대해">
        투자, 대출, 퇴사, 창업 같은 결정은 실제 숫자와 전문가 의견을 우선하세요. 운명OS의 전통 해석은 무엇을 확인할지 고르는 데에만 참고하도록 설계했습니다.
      </Notice>

      <NextStep title="관계 시뮬레이터" desc="나와 다른 사람의 구조를 나란히 놓고 비교해 봅니다." onClick={() => go("relation")} />
    </Page>
  );
}

const WORK_Q: Record<keyof typeof GROUP_LABEL, string> = {
  self: "누구와 손잡고, 무엇을 혼자 할 것인가",
  create: "올해 내놓을 결과물은 무엇인가",
  result: "들어온 것을 어떻게 나누고 지킬 것인가",
  structure: "어떤 역할과 책임을 받아들일 것인가",
  learn: "무엇을 깊이 배워 다음 단계를 준비할 것인가",
};
