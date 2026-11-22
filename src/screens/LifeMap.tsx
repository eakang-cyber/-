"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/state/store";
import { useRouter } from "@/ui/router";
import { Badge, Button, Evidence, Notice, PremiumGate, ReadingCard, SectionHead, cx, inputCls } from "@/ui/kit";
import { CalcStatus, NextStep, Page, SampleBanner, ScreenTitle } from "@/ui/layout";
import { DecadeStrip, GroupLegend, YearRibbon } from "@/ui/charts";
import { buildDecades, buildYears, yearBlock } from "@/rules/interpret";
import { GROUP_COLOR, GROUP_LABEL } from "@/engine/constants";
import { GROUP_TEXT } from "@/rules/content";
import { RECORD_TYPE_LABEL } from "@/content/sample";

const NOW = new Date().getFullYear();

export function LifeMap() {
  const { chart, state, dispatch, toast, subject } = useStore();
  const { go } = useRouter();
  const decades = useMemo(() => buildDecades(chart), [chart]);
  const years = useMemo(() => buildYears(chart), [chart]);
  const by = chart.solarDate.y;
  const initialYear = Math.min(Math.max(NOW, by), by + 90);
  const [year, setYear] = useState(initialYear);
  const cell = years.find((y) => y.year === year)!;
  const decade = decades.filter((d) => d.startYear <= year).at(-1) ?? null;
  const [decadeSel, setDecadeSel] = useState<number | null>(null);
  const shownDecade = decades.find((d) => d.index === (decadeSel ?? decade?.index ?? -1)) ?? null;
  const ribbonRef = useRef<HTMLDivElement>(null);
  const free = (y: number) => state.premium || Math.abs(y - NOW) <= 1;
  const recordYears = useMemo(() => new Set(state.records.map((r) => r.year)), [state.records]);
  const yearRecords = state.records.filter((r) => r.year === year);

  useEffect(() => {
    const el = document.getElementById(`yr-${year}`);
    const box = ribbonRef.current;
    if (el && box) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [year]);

  const selectDecade = (i: number) => {
    setDecadeSel(i);
    const d = decades.find((x) => x.index === i);
    setYear(d ? Math.max(d.startYear, by) : by);
  };

  // 빠른 기록
  const [qTitle, setQTitle] = useState("");
  const [qNote, setQNote] = useState("");
  const isFuture = year > NOW;
  const addRecord = () => {
    if (!qTitle.trim()) return;
    dispatch({ type: "upsertRecord", record: { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: isFuture ? "goal" : "event", year, month: null, title: qTitle.trim(), note: qNote.trim(), sample: false } });
    setQTitle(""); setQNote("");
    toast(isFuture ? "목표를 기록했습니다" : "사건을 기록했습니다");
  };

  return (
    <Page wide>
      <SampleBanner />
      <ScreenTitle eyebrow="0~90세 인생 지도" title={`${subject.name || "나"}의 인생 흐름을 넘겨 보세요`}
        desc="색은 그 시기에 떠오르는 주제를 뜻합니다. 좋고 나쁨이나 점수가 아닙니다. 미래의 사건은 만들어 내지 않습니다.">
        <CalcStatus />
      </ScreenTitle>

      {/* 10년 흐름 */}
      <section className="rounded-3xl border border-line/70 bg-deep p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-[1.15rem] font-semibold">10년 단위 큰 흐름</h2>
          <span className="text-[0.78rem] text-faint">
            {chart.luck.direction ? `${chart.luck.direction === "forward" ? "순행" : "역행"} · ` : "방향 미정(순행 임시) · "}
            첫 10년 흐름은 만 {chart.luck.startYears.toFixed(1)}세 무렵부터{chart.luck.approximate ? "(출생시간 미상 — 근사)" : ""}
          </span>
        </div>
        <DecadeStrip decades={decades} birthYear={by} selected={decadeSel ?? decade?.index ?? 0} onSelect={selectDecade} nowYear={NOW} height={52} />
        <GroupLegend />
        {shownDecade ? (
          <ReadingCard block={shownDecade.block} eyebrow={`${shownDecade.startYear}~${shownDecade.endYear} · 만 ${Math.floor(shownDecade.startAge)}세 무렵부터`} tone="raised">
            <div className="mt-3 flex flex-wrap gap-2 text-[0.78rem]">
              {[["드러나는 주제", shownDecade.stemGroup], ["생활 환경", shownDecade.branchGroup]].map(([k, g]) => (
                <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-line h-7 px-3 text-mist">
                  <span className="h-2 w-2 rounded-full" style={{ background: GROUP_COLOR[g as keyof typeof GROUP_COLOR] }} aria-hidden />{k} · {GROUP_LABEL[g as keyof typeof GROUP_LABEL]}
                </span>
              ))}
            </div>
          </ReadingCard>
        ) : (
          <Notice>10년 흐름이 시작되기 전({by}~{decades[0]?.startYear - 1}년)입니다. 이 구간은 태어난 달의 기운으로 읽으며 별도의 10년 주제를 두지 않습니다.</Notice>
        )}
      </section>

      {/* 연도 탐색 */}
      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="연도별 탐색" title="한 해씩 넘겨 보기" desc="위 칸은 그해 겉으로 드러나는 주제, 아래 칸은 생활 속 장면입니다. 흰 점은 전통적 변화 지점, 초록 점은 내 기록이 있는 해입니다." />
        <div className="rounded-2xl border border-line/70 bg-deep">
          <div ref={ribbonRef} className="overflow-x-auto no-scrollbar">
            <YearRibbon cells={years} selected={year} onSelect={(y) => { setYear(y); setDecadeSel(null); }} isLocked={() => false} nowYear={NOW} recordYears={recordYears} />
          </div>
          <div className="border-t border-line/60 px-4 py-3 flex items-center gap-3">
            <Button size="sm" variant="ghost" aria-label="이전 해" onClick={() => setYear((y) => Math.max(by, y - 1))}>‹</Button>
            <label htmlFor="age-range" className="sr-only">나이 선택</label>
            <input id="age-range" type="range" min={0} max={90} value={year - by} onChange={(e) => { setYear(by + Number(e.target.value)); setDecadeSel(null); }} className="flex-1" />
            <Button size="sm" variant="ghost" aria-label="다음 해" onClick={() => setYear((y) => Math.min(by + 90, y + 1))}>›</Button>
            <Button size="sm" variant="quiet" onClick={() => setYear(initialYear)}>올해</Button>
          </div>
        </div>

        {/* 선택한 해 */}
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4 items-start">
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
              <p className="font-display text-[2rem] font-semibold tabular text-ivory">{year}</p>
              <p className="text-mist tabular">{cell.age}세 · {cell.label.ko}년</p>
              {year === NOW && <Badge layer="calc">올해</Badge>}
            </div>
            <div className="flex flex-wrap gap-2 text-[0.8rem]">
              {[["드러나는 주제", cell.stemGroup], ["생활 장면", cell.branchGroup]].map(([k, g]) => (
                <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-line h-8 px-3 text-mist">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: GROUP_COLOR[g as keyof typeof GROUP_COLOR] }} aria-hidden />{k} · <span className="text-ivory">{GROUP_LABEL[g as keyof typeof GROUP_LABEL]}</span>
                </span>
              ))}
            </div>
            {cell.shift.length > 0 && (
              <p className="text-[0.85rem] text-ivory/90 flex gap-2"><span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-ivory shrink-0" />전통적 변화 지점 · {cell.shift.join(", ")}<span className="text-faint">(좋고 나쁨이 아닌 변화의 계기)</span></p>
            )}
            {free(year) ? (
              <ReadingCard block={yearBlock(chart, cell)} eyebrow={state.premium && Math.abs(year - NOW) > 1 ? "리포트 · 연도별 해석" : "무료 · 올해 전후 3년"} />
            ) : (
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl border border-line/70 bg-deep p-5">
                  <p className="text-[0.78rem] text-faint">이 해의 주제</p>
                  <p className="mt-1 font-display text-[1.1rem] text-ivory">{GROUP_TEXT[cell.stemGroup].yearTheme}{cell.stemGroup !== cell.branchGroup ? ` · ${GROUP_TEXT[cell.branchGroup].yearTheme}` : ""}</p>
                  <p className="mt-2 text-[0.88rem] text-mist">무료로는 모든 해의 주제와 변화 지점을 볼 수 있습니다. 해마다의 상세 해석, 질문, 근거는 {NOW - 1}~{NOW + 1}년에 열려 있습니다.</p>
                  <Evidence block={{ ruleIds: ["LUCK-YEAR-001"], facts: [`세운 ${cell.label.hanja}`] }} label="근거" />
                </div>
                <PremiumGate title="모든 해의 상세 해석 (0~90세)" items={["91개 해 각각의 해석과 스스로에게 던질 질문", "10년 흐름과 한 해 주제가 겹치는 지점 설명", "내 기록과 그해 해석을 나란히 보는 회고 리포트"]} onOpen={() => go("premium")} />
              </div>
            )}
          </div>

          {/* 실제 사건 기록 vs 전통 해석 */}
          <aside className="rounded-2xl border border-line/70 bg-deep p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2"><Badge layer="user" /><h3 className="font-display text-[1.05rem] font-semibold">{year}년의 내 기록</h3></div>
            {yearRecords.length === 0 ? (
              <p className="text-[0.86rem] text-mist">{isFuture ? "아직 오지 않은 해입니다. 사건 대신 목표를 적어 둘 수 있습니다." : "이 해에 있었던 일을 적어 두면, 그해의 전통 해석과 나란히 돌아볼 수 있습니다."}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {yearRecords.map((r) => (
                  <li key={r.id} className="rounded-xl bg-night/60 border border-line/60 p-3">
                    <div className="flex items-center gap-2 text-[0.72rem] text-faint">
                      {RECORD_TYPE_LABEL[r.type]}{r.month ? ` · ${r.month}월` : ""}{r.sample && <span className="text-warn">· 예시 기록</span>}
                    </div>
                    <p className="mt-1 text-[0.92rem] text-ivory">{r.title}</p>
                    {r.note && <p className="mt-0.5 text-[0.82rem] text-mist">{r.note}</p>}
                  </li>
                ))}
              </ul>
            )}
            {yearRecords.some((r) => r.type === "event") && (
              <p className="text-[0.78rem] text-faint leading-relaxed">기록은 당신이 쓴 사실입니다. 그해 해석과 나란히 놓는 것은 돌아보기 위한 것이며, 사주가 맞혔다는 뜻이 아닙니다.</p>
            )}
            <div className="flex flex-col gap-2 border-t border-line/60 pt-4">
              <label htmlFor="q-title" className="text-[0.82rem] text-mist">{isFuture ? "이 해의 목표 적기" : "이 해에 있었던 일 적기"}</label>
              <input id="q-title" className={inputCls} placeholder={isFuture ? "예: 개인 프로젝트 공개" : "예: 이사, 새 팀 합류"} value={qTitle} maxLength={60} onChange={(e) => setQTitle(e.target.value)} />
              <input id="q-note" className={cx(inputCls, "h-11 text-[0.9rem]")} placeholder="메모(선택)" value={qNote} maxLength={200} onChange={(e) => setQNote(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" onClick={addRecord} disabled={!qTitle.trim()}>{isFuture ? "목표 기록" : "사건 기록"}</Button>
                <Button size="sm" variant="quiet" onClick={() => go("archive")}>아카이브 열기</Button>
              </div>
              <p className="text-[0.72rem] text-faint">{state.saveMode === "memory" ? "데모: 이 화면의 메모리에만 저장되며 새로고침하면 사라집니다." : "데모: 이 탭에만 임시 보관됩니다."}</p>
            </div>
          </aside>
        </div>
      </section>

      <Notice title="이 지도를 읽는 법">
        인생 지도는 전통 해석이 '그 시기에 어떤 주제가 떠오른다'고 보는지를 시각화한 것입니다. 운의 높낮이를 숫자로 만들지 않으며, 위험한 해나 사고·질병·수명 같은 단정은 표시하지 않습니다.
      </Notice>

      <NextStep title="돈과 일의 지도" desc="같은 구조를 일과 돈의 질문으로 다시 읽어 봅니다." onClick={() => go("work")} />
    </Page>
  );
}
