"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/state/store";
import { useRouter } from "@/ui/router";
import { Badge, Button, cx } from "@/ui/kit";
import { DecadeStrip, GroupLegend } from "@/ui/charts";
import { Icon } from "@/ui/icons";
import { buildCharacter, buildDecades, buildYears, yearBlock } from "@/rules/interpret";
import { GROUP_COLOR, GROUP_LABEL } from "@/engine/constants";
import { j } from "@/rules/josa";

const NOW = new Date().getFullYear();

export function Landing() {
  const { go } = useRouter();
  const { chart, subject, state } = useStore();
  const decades = useMemo(() => buildDecades(chart), [chart]);
  const character = useMemo(() => buildCharacter(chart), [chart]);
  const currentIdx = decades.filter((d) => d.startYear <= NOW).at(-1)?.index ?? 0;
  const [sel, setSel] = useState<number | null>(null);
  const shown = decades.find((d) => d.index === (sel ?? currentIdx));
  const yearCell = useMemo(() => buildYears(chart).find((y) => y.year === NOW), [chart]);
  const name = subject.name || "나";

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-line/50">
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(60rem 30rem at 85% -10%, rgba(220,193,141,0.10), transparent 60%), radial-gradient(40rem 24rem at -10% 110%, rgba(45,134,200,0.10), transparent 60%)" }} />
        <div className="relative gutter mx-auto max-w-6xl pt-10 pb-12 lg:pt-20 lg:pb-20 grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center">
          <div className="flex flex-col gap-6">
            <p className="eyebrow">DESTINY OS · 운명OS</p>
            <h1 className="font-display text-[2.05rem] sm:text-[2.6rem] lg:text-[3.1rem] leading-[1.25] font-semibold text-ivory">
              당신의 인생에는<br />아직 읽지 않은<br className="sm:hidden" /> 이야기가 있습니다.
            </h1>
            <p className="text-[1.02rem] lg:text-[1.1rem] text-mist leading-relaxed max-w-[32rem]">
              태어난 순간부터 앞으로의 선택까지. 나의 성향과 관계, 인생의 흐름을 하나의 지도로 탐험하세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={() => go("start")}>무료로 내 인생 탐험하기 <Icon.arrow /></Button>
              <Button size="lg" variant="ghost" onClick={() => go("me")}>샘플 결과 먼저 보기</Button>
            </div>
            <p className="text-[0.8rem] text-faint">회원가입 없이 시작 · 입력 정보는 서버로 보내지 않습니다 · 약 1분</p>
          </div>

          {/* 인터랙티브 인생 지도 미리보기 */}
          <div className="rounded-3xl border border-line/80 bg-deep/90 p-5 sm:p-6 shadow-2xl shadow-black/30">
            <div className="flex items-center gap-2">
              <span className="text-[0.8rem] text-mist">0~90세 인생 지도 미리보기</span>
              <span className="ml-auto">{state.profileIsSample ? <Badge layer="sample">테스트 사용자</Badge> : <Badge layer="calc" />}</span>
            </div>
            <p className="mt-3 font-display text-[1.2rem] leading-snug text-ivory">{character.coreSentence}</p>
            <p className="mt-1 text-[0.78rem] text-faint tabular">{name} · {chart.solarDate.y}.{String(chart.solarDate.m).padStart(2, "0")}.{String(chart.solarDate.d).padStart(2, "0")} 출생 기준 계산</p>
            <div className="mt-5">
              <DecadeStrip decades={decades} birthYear={chart.solarDate.y} selected={sel ?? currentIdx} onSelect={setSel} nowYear={NOW} />
            </div>
            <div className="mt-3"><GroupLegend compact /></div>
            {shown && (
              <div className="mt-4 rounded-2xl bg-night/70 border border-line/70 p-4">
                <div className="flex items-center gap-2 text-[0.78rem] text-faint tabular">
                  <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: GROUP_COLOR[shown.stemGroup] }} aria-hidden />
                  {shown.startYear}~{shown.endYear} · {Math.floor(shown.startAge)}~{Math.floor(shown.startAge) + 9}세 무렵
                  {shown.index === currentIdx && <span className="text-ivory">· 지금</span>}
                </div>
                <p className="mt-1.5 text-ivory font-medium">{shown.block.title}</p>
                <p className="mt-1 text-[0.86rem] text-mist leading-relaxed">{shown.block.body}</p>
              </div>
            )}
            {sel === 0 && <p className="mt-3 text-[0.82rem] text-mist">10년 흐름이 시작되기 전 구간입니다. 이 시기는 태어난 달의 기운으로 읽습니다.</p>}
            <button onClick={() => go("map")} className="mt-4 text-[0.88rem] text-gold hover:underline underline-offset-4 cursor-pointer">연도별로 펼쳐 보기 →</button>
          </div>
        </div>
      </section>

      {/* 다른 이유 */}
      <section className="gutter mx-auto max-w-6xl py-14 lg:py-20">
        <p className="eyebrow">무엇이 다른가</p>
        <h2 className="mt-3 font-display text-[1.6rem] lg:text-[2rem] font-semibold leading-snug max-w-[36rem]">긴 운세 글 대신, 직접 탐험하는 인생 지도</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { t: "계산과 해설을 분리합니다", d: "사주 여덟 글자는 AI가 아닌 결정론적 계산 엔진이 만듭니다. 같은 정보를 넣으면 언제나 같은 결과가 나오고, 모든 해석에 근거 번호가 붙습니다." },
            { t: "읽는 것이 아니라 탐험합니다", d: "0~90세 흐름을 직접 넘겨 보고, 두 사람을 비교하고, 고민 중인 두 선택지를 나란히 놓아 봅니다. 질문을 잘 써야 답이 나오는 채팅이 아닙니다." },
            { t: "시간이 지날수록 쌓입니다", d: "실제로 겪은 일과 목표를 기록하면, 그해의 전통 해석과 나란히 놓고 돌아볼 수 있습니다. 맞혔는지가 아니라 내가 어떻게 지나왔는지를 봅니다." },
          ].map((x, i) => (
            <article key={x.t} className="rounded-2xl border border-line/70 bg-deep p-6">
              <p className="text-[0.75rem] text-faint tabular">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 font-display text-[1.15rem] font-semibold">{x.t}</h3>
              <p className="mt-2 text-[0.92rem] text-mist leading-relaxed">{x.d}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 무료로 볼 수 있는 것 */}
      <section className="border-y border-line/50 bg-deep/40">
        <div className="gutter mx-auto max-w-6xl py-14 lg:py-20 grid lg:grid-cols-[0.8fr_1.2fr] gap-10">
          <div>
            <p className="eyebrow">무료</p>
            <h2 className="mt-3 font-display text-[1.6rem] lg:text-[2rem] font-semibold leading-snug">결과를 감추지 않습니다</h2>
            <p className="mt-3 text-mist leading-relaxed">무료로도 하나의 완결된 이야기를 볼 수 있습니다. 결제는 더 깊이 탐험하고 싶을 때만 고르세요.</p>
          </div>
          <ul className="grid sm:grid-cols-2 gap-3">
            {[
              ["나의 인생 캐릭터", "핵심 문장, 세 가지 성향 이야기, 강점과 갈등 장면, 근거 보기"],
              ["10년 단위 인생 흐름", "0~90세 아홉 개의 10년 주제와 전통적 변화 지점"],
              ["올해 전후 3년", `${NOW - 1}~${NOW + 1}년의 연도별 해석`],
              ["돈과 일의 지도", "가치를 만드는 방식, 역할, 버는 것과 지키는 것"],
              ["관계 비교 기본", "서로 다르게 읽히는 성향과 대화해 볼 질문"],
              ["선택 실험실 기본", "두 선택지를 나란히 놓고 결정 전 질문 정리"],
            ].map(([t, d]) => (
              <li key={t} className="rounded-xl border border-line/70 bg-night/60 p-4">
                <p className="text-ivory font-medium">{t}</p>
                <p className="mt-1 text-[0.86rem] text-mist">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 프리미엄 실제 샘플 */}
      <section className="gutter mx-auto max-w-6xl py-14 lg:py-20">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[16rem]">
            <p className="eyebrow">인생 마스터 리포트 · 9,900원</p>
            <h2 className="mt-3 font-display text-[1.6rem] lg:text-[2rem] font-semibold leading-snug">실제 리포트의 한 페이지</h2>
            <p className="mt-2 text-mist">{state.profileIsSample ? "테스트 사용자" : j(name, "은/는")} 기준으로 지금 계산된 내용입니다. 예시용으로 꾸민 문장이 아닙니다.</p>
          </div>
          <Button variant="ghost" onClick={() => go("premium")}>포함 내용과 가격 보기</Button>
        </div>
        {yearCell && (() => {
          const b = yearBlock(chart, yearCell);
          return (
            <article className="paper mt-8 rounded-3xl p-6 sm:p-9 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-[0.78rem] text-ink-soft">
                <span className="tracking-[0.2em] font-semibold">CHAPTER 3</span><span>· 10년 연도별 해석</span>
                <span className="ml-auto tabular">{NOW}년 · {NOW - chart.solarDate.y}세</span>
              </div>
              <h3 className="mt-4 font-display text-[1.5rem] sm:text-[1.8rem] font-semibold leading-snug">{b.title}</h3>
              <div className="mt-3 flex gap-2">
                {[yearCell.stemGroup, yearCell.branchGroup].map((g, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 h-7 text-[0.78rem]">
                    <span className="h-2 w-2 rounded-full" style={{ background: GROUP_COLOR[g] }} aria-hidden />{i === 0 ? "드러나는 주제" : "생활 장면"} · {GROUP_LABEL[g]}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-[1rem] leading-[1.8] text-ink">{b.body}</p>
              <p className="mt-4 text-[0.95rem] text-ink"><span className="text-ink-soft">스스로에게 묻기 · </span>{b.question}</p>
              <p className="mt-6 pt-4 border-t border-ink/10 text-[0.75rem] text-ink-soft font-mono">근거 {b.ruleIds.join(" · ")} · {b.facts[0]}</p>
            </article>
          );
        })()}
      </section>

      {/* 개인정보 · 한계 */}
      <section className="border-t border-line/50">
        <div className="gutter mx-auto max-w-6xl py-14 lg:py-20 grid md:grid-cols-2 gap-6">
          <article className="rounded-2xl border border-line/70 bg-deep p-6">
            <div className="flex items-center gap-2 text-gold"><Icon.shield /><h2 className="font-display text-[1.2rem] font-semibold text-ivory">개인정보를 이렇게 다룹니다</h2></div>
            <ul className="mt-4 flex flex-col gap-2 text-[0.92rem] text-mist leading-relaxed">
              <li>· 계산에 꼭 필요한 정보만 묻습니다. 이름 대신 닉네임을 써도 됩니다.</li>
              <li>· 이 프로토타입은 입력 정보를 서버로 보내지 않습니다. 새로고침하면 사라집니다.</li>
              <li>· 정식 서비스에서는 저장 여부를 직접 고르고, 언제든 내려받거나 삭제할 수 있습니다.</li>
              <li>· 다른 사람의 출생 정보는 본인 동의를 받은 경우에만 입력해 주세요.</li>
            </ul>
          </article>
          <article className="rounded-2xl border border-line/70 bg-deep p-6">
            <h2 className="font-display text-[1.2rem] font-semibold">전통 해석의 한계</h2>
            <ul className="mt-4 flex flex-col gap-2 text-[0.92rem] text-mist leading-relaxed">
              <li>· 명리학은 오래된 해석 체계이며, 과학적으로 미래를 예측한다는 근거는 없습니다.</li>
              <li>· 운명OS는 사건을 예언하지 않고, 위험한 해나 수명 같은 단정을 표시하지 않습니다.</li>
              <li>· 학파마다 해석이 다른 부분은 다른 해석을 함께 보여 줍니다.</li>
              <li>· 돈, 건강, 법률에 관한 결정은 실제 근거와 전문가의 의견을 우선하세요.</li>
            </ul>
          </article>
        </div>
        <div className="gutter mx-auto max-w-6xl pb-16 flex flex-col items-start gap-4">
          <p className="font-display text-[1.3rem] lg:text-[1.6rem] text-ivory">운세를 읽는 시대에서, 내 인생을 탐험하는 시대로.</p>
          <Button size="lg" onClick={() => go("start")}>무료로 내 인생 탐험하기 <Icon.arrow /></Button>
        </div>
      </section>

      <footer className="border-t border-line/50">
        <div className="gutter mx-auto max-w-6xl py-8 flex flex-wrap gap-x-6 gap-y-2 text-[0.78rem] text-faint">
          <span>DESTINY OS · Phase 1 프로토타입</span>
          <button onClick={() => go("method")} className={cx("hover:text-mist cursor-pointer")}>계산 기준과 근거</button>
          <button onClick={() => go("premium")} className="hover:text-mist cursor-pointer">가격·환불 안내</button>
          <span>실제 결제·회원 기능 없음</span>
        </div>
      </footer>
    </div>
  );
}
