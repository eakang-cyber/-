"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/state/store";
import { useRouter } from "@/ui/router";
import { Badge, Button, Evidence, ReadingCard, SectionHead, cx } from "@/ui/kit";
import { CalcStatus, NextStep, Page, SampleBanner, ScreenTitle } from "@/ui/layout";
import { buildCharacter, Block } from "@/rules/interpret";
import {
  BRANCHES, BRANCHES_KO, ELEMENT_KO, GROUP_COLOR, GROUP_LABEL, STEMS, STEMS_KO, TEN_GOD_KO,
  branchElement, stemElement,
} from "@/engine/constants";
import { pillarLabel } from "@/engine/chart";

export function Character() {
  const { chart, subject, toast } = useStore();
  const { go } = useRouter();
  const c = useMemo(() => buildCharacter(chart), [chart]);
  const [tab, setTab] = useState(0);
  const [expert, setExpert] = useState(false);
  const story = c.stories[tab];
  const name = subject.name || "나";

  const shareText = `${c.coreSentence}\n\n나를 설명하는 세 가지 이야기\n${c.stories.map((s, i) => `${i + 1}. ${s.title}`).join("\n")}\n\n— DESTINY OS 운명OS`;
  const copyShare = async () => {
    try { await navigator.clipboard.writeText(shareText); toast("공유 문구를 복사했습니다"); }
    catch { toast("복사가 막혀 있어요. 아래 카드 문구를 직접 선택해 주세요"); }
  };

  const ps = [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour];
  const posLabel = ["태어난 해", "태어난 달", "태어난 날", "태어난 시"];
  const posMeaning = ["뿌리", "사회 무대", "나 · 생활", "미래 · 결과물"];
  const maxEl = Math.max(...chart.elementCounts, 1);

  return (
    <Page>
      <SampleBanner />
      <ScreenTitle eyebrow="나의 인생 캐릭터" title={`${name}님을 설명하는 첫 문장`}>
        <CalcStatus />
      </ScreenTitle>

      {/* 핵심 문장 */}
      <section className="relative overflow-hidden rounded-3xl border border-line/80 bg-deep p-6 sm:p-8">
        <div aria-hidden className="absolute -right-20 -top-24 h-64 w-64 rounded-full" style={{ background: "radial-gradient(circle, rgba(220,193,141,0.14), transparent 65%)" }} />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center gap-2"><span className="eyebrow">{c.image}</span><span className="ml-auto"><Badge layer="copy" /></span></div>
          <p className="font-display text-[1.55rem] sm:text-[1.9rem] leading-[1.45] font-semibold text-ivory">{c.coreSentence}</p>
          <p className="text-[0.92rem] text-mist leading-relaxed">{c.coreBlock.body}</p>
          <p className="text-[0.82rem] text-faint">전통적 비유입니다. 성격 검사 결과처럼 단정하지 않습니다. 맞는 부분과 아닌 부분을 직접 가려 보세요.</p>
          <Evidence block={c.coreBlock} />
        </div>
      </section>

      {/* 여덟 글자 */}
      <section className="flex flex-col gap-4">
        <div className="flex items-end gap-3">
          <SectionHead eyebrow="계산 결과" title="나의 여덟 글자" desc="네 개의 기둥, 각 기둥의 위아래 두 글자. 자리마다 읽는 영역이 다릅니다." />
          <button onClick={() => setExpert((e) => !e)} aria-pressed={expert} className={cx("ml-auto shrink-0 h-9 px-3.5 rounded-full border text-[0.8rem] cursor-pointer", expert ? "border-gold text-gold" : "border-line text-mist hover:text-ivory")}>
            {expert ? "쉬운 보기" : "전문가 보기"}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {ps.map((p, i) => (
            <div key={i} className={cx("rounded-2xl border p-3 text-center flex flex-col gap-1", i === 2 ? "border-gold/50 bg-raised" : "border-line/70 bg-deep")}>
              <p className="text-[0.7rem] text-faint">{posLabel[i]}</p>
              <p className="text-[0.72rem] text-mist">{posMeaning[i]}</p>
              {p ? (
                <>
                  <p className="mt-1 font-display text-[1.35rem] text-ivory leading-tight">{expert ? STEMS[p.stem] : STEMS_KO[p.stem]}</p>
                  <p className="font-display text-[1.35rem] text-ivory leading-tight">{expert ? BRANCHES[p.branch] : BRANCHES_KO[p.branch]}</p>
                  <p className="text-[0.7rem] text-mist">{ELEMENT_KO[stemElement(p.stem)]} · {ELEMENT_KO[branchElement(p.branch)]}</p>
                  {expert && (
                    <p className="text-[0.66rem] text-faint leading-tight">
                      {p.pos === "day" ? "일간(나)" : TEN_GOD_KO[chart.tenGods.find((t) => t.pos === p.pos && t.part === "stem")!.god]}<br />
                      {TEN_GOD_KO[chart.tenGods.find((t) => t.pos === p.pos && t.part === "branch")!.god]}
                    </p>
                  )}
                </>
              ) : <p className="mt-3 text-[0.78rem] text-faint">시간 미상</p>}
            </div>
          ))}
        </div>
        {/* 오행 개수: 단일 색 막대, 점수 아님 */}
        <div className="rounded-2xl border border-line/70 bg-deep p-4">
          <div className="flex items-center gap-2 mb-3"><Badge layer="calc" /><p className="text-[0.82rem] text-mist">다섯 기운의 개수 <span className="text-faint">· 겉글자 {chart.pillars.hour ? 8 : 6}자 기준, 점수가 아님</span></p></div>
          <ul className="flex flex-col gap-2">
            {ELEMENT_KO.map((k, i) => (
              <li key={k} className="grid grid-cols-[2.5rem_1fr_1.5rem] items-center gap-3 text-[0.85rem]">
                <span className="text-mist">{k}</span>
                <span className="h-2 rounded-full bg-night/80 overflow-hidden">
                  <span className="block h-full rounded-full bg-gold" style={{ width: `${(chart.elementCounts[i] / maxEl) * 100}%`, minWidth: chart.elementCounts[i] ? 8 : 0 }} />
                </span>
                <span className="text-ivory tabular text-right">{chart.elementCounts[i]}</span>
              </li>
            ))}
          </ul>
          {expert && <p className="mt-3 text-[0.75rem] text-faint font-mono">{pillarLabel(chart.pillars.year).hanja} {pillarLabel(chart.pillars.month).hanja} {pillarLabel(chart.pillars.day).hanja} {chart.pillars.hour ? pillarLabel(chart.pillars.hour).hanja : "--"} · 숨은 글자(지장간)는 개수에 넣지 않았습니다.</p>}
        </div>
      </section>

      {/* 세 가지 이야기 */}
      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="세 가지 이야기" title="서로 다른 방향의 세 이야기" desc="한 사람 안에는 여러 이야기가 함께 있습니다. 각 이야기가 어떤 계산과 규칙에서 나왔는지 근거를 펼쳐 볼 수 있습니다." />
        <div role="tablist" aria-label="성향 이야기" className="grid grid-cols-3 gap-2">
          {c.stories.map((s, i) => (
            <button key={s.id} role="tab" aria-selected={tab === i} onClick={() => setTab(i)}
              className={cx("rounded-xl border px-3 py-3 text-left cursor-pointer transition-colors", tab === i ? "border-gold bg-gold/10" : "border-line/70 bg-deep hover:border-mist/50")}>
              <span className={cx("block text-[0.7rem] tabular", tab === i ? "text-gold" : "text-faint")}>이야기 {i + 1}</span>
              <span className={cx("block mt-1 text-[0.84rem] leading-snug", tab === i ? "text-ivory" : "text-mist")}>{s.title}</span>
            </button>
          ))}
        </div>
        {story && <ReadingCard key={story.id} block={story} />}
      </section>

      {/* 강점 / 갈등 */}
      <section className="grid md:grid-cols-2 gap-4">
        <SceneList title="강점이 드러나는 상황" items={c.strengths} tone="ok" />
        <SceneList title="갈등이 생길 수 있는 상황" items={c.frictions} tone="warn" />
      </section>

      {c.observations.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHead eyebrow="더 살펴볼 점" title="구조에서 보이는 특징" />
          <div className="flex flex-col gap-3">
            {c.observations.map((o) => <ReadingCard key={o.id} block={o} tone="raised" />)}
          </div>
        </section>
      )}

      {/* 공유 카드 */}
      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="공유" title="개인정보가 빠진 공유 카드" desc="이름, 생년월일, 출생시간, 여덟 글자는 카드에 들어가지 않습니다." />
        <div className="paper rounded-3xl p-6 sm:p-8 max-w-md select-text">
          <p className="text-[0.7rem] tracking-[0.3em] font-semibold text-ink-soft">DESTINY OS</p>
          <p className="mt-5 text-[0.78rem] text-ink-soft">{c.image}</p>
          <p className="mt-1 font-display text-[1.3rem] leading-[1.5] font-semibold">{c.coreSentence}</p>
          <ul className="mt-5 flex flex-col gap-1.5 text-[0.88rem]">
            {c.stories.map((s, i) => <li key={s.id} className="flex gap-2"><span className="text-ink-soft tabular">{i + 1}</span>{s.title}</li>)}
          </ul>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {c.topGroups.slice(0, 3).map((g) => (
              <span key={g} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 h-7 px-3 text-[0.75rem]">
                <span className="h-2 w-2 rounded-full" style={{ background: GROUP_COLOR[g] }} aria-hidden />{GROUP_LABEL[g]}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={copyShare}>카드 문구 복사</Button>
          <Button size="sm" variant="ghost" disabled title="Phase 3에서 이미지 생성 서버 연동">이미지로 저장 (준비 중)</Button>
        </div>
      </section>

      <NextStep title="0~90세 인생 지도" desc="이 이야기가 시간에 따라 어떻게 흘러가는지 연도별로 넘겨 보세요." onClick={() => go("map")} />
    </Page>
  );
}

function SceneList({ title, items, tone }: { title: string; items: Block[]; tone: "ok" | "warn" }) {
  return (
    <article className="rounded-2xl border border-line/70 bg-deep p-5">
      <h3 className="flex items-center gap-2 font-display text-[1.05rem] font-semibold">
        <span aria-hidden className={cx("h-2 w-2 rounded-full", tone === "ok" ? "bg-ok" : "bg-warn")} />{title}
      </h3>
      <ul className="mt-3 flex flex-col divide-y divide-line/60">
        {items.map((it) => (
          <li key={it.id} className="py-3">
            <p className="text-[0.93rem] text-ivory leading-snug">{it.title}</p>
            <p className="mt-1 text-[0.82rem] text-mist leading-relaxed">{it.body}</p>
            <Evidence block={it} label="근거" />
          </li>
        ))}
      </ul>
    </article>
  );
}
