"use client";
// 인생 지도 시각화. 값은 '점수'가 아니라 범주(주제군)다.
// 범주색은 GROUP_ORDER 고정 순서(dataviz validator 통과), 텍스트는 항상 텍스트 토큰, 범례 상시 표시.
import { GROUP_COLOR, GROUP_LABEL, GROUP_ORDER, ThemeGroup } from "@/engine/constants";
import type { DecadeView, YearCell } from "@/rules/interpret";
import { cx } from "./kit";

export function GroupLegend({ compact = false }: { compact?: boolean }) {
  return (
    <ul className={cx("flex flex-wrap gap-x-4 gap-y-1.5", compact ? "text-[0.75rem]" : "text-[0.8rem]")} aria-label="주제 범례">
      {GROUP_ORDER.map((g) => (
        <li key={g} className="flex items-center gap-1.5 text-mist">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: GROUP_COLOR[g] }} />
          {GROUP_LABEL[g]}
        </li>
      ))}
    </ul>
  );
}

/** 10년 흐름 띠: 시작 전 구간 + 9개 대운. 너비는 실제 연수에 비례. */
export function DecadeStrip({
  decades, birthYear, selected, onSelect, nowYear, height = 44,
}: { decades: DecadeView[]; birthYear: number; selected: number | null; onSelect: (i: number) => void; nowYear: number; height?: number }) {
  const end = birthYear + 90;
  const total = end - birthYear;
  const first = decades[0]?.startYear ?? birthYear;
  const segs = [
    { key: 0, start: birthYear, stop: first - 1, group: null as ThemeGroup | null, label: "시작 전" },
    ...decades.map((d) => ({ key: d.index, start: d.startYear, stop: Math.min(d.endYear, end), group: d.stemGroup, label: d.block.title })),
  ].filter((s) => s.stop >= s.start);
  const nowPct = ((nowYear - birthYear + 0.5) / (total + 1)) * 100;
  return (
    <div className="w-full">
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex gap-[2px]">
          {segs.map((s) => {
            const w = ((s.stop - s.start + 1) / (total + 1)) * 100;
            const isSel = selected === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => onSelect(s.key)}
                aria-pressed={isSel}
                aria-label={`${s.start}~${s.stop}년 (${s.start - birthYear}~${s.stop - birthYear}세): ${s.group ? GROUP_LABEL[s.group] : "10년 흐름 시작 전"}`}
                className={cx("h-full rounded-[4px] cursor-pointer transition-[filter,box-shadow] duration-200 hover:brightness-115 outline-none focus-visible:ring-2 focus-visible:ring-gold",
                  isSel && "ring-2 ring-ivory ring-offset-2 ring-offset-deep")}
                style={{ width: `${w}%`, background: s.group ? GROUP_COLOR[s.group] : "repeating-linear-gradient(135deg, #2a3a5a 0 4px, #1d2a44 4px 8px)" }}
              />
            );
          })}
        </div>
        {nowYear >= birthYear && nowYear <= end && (
          <div className="absolute -top-1.5 -bottom-1.5 w-0 pointer-events-none" style={{ left: `${nowPct}%` }} aria-hidden>
            <div className="h-full border-l-2 border-ivory" />
          </div>
        )}
      </div>
      <div className="relative h-5 mt-1.5 text-[0.7rem] text-faint tabular" aria-hidden>
        {[0, 30, 60, 90].map((a) => (
          <span key={a} className="absolute whitespace-nowrap -translate-x-1/2 first:translate-x-0 last:-translate-x-full" style={{ left: `${(a / total) * 100}%` }}>{a}세</span>
        ))}
        {nowYear >= birthYear && nowYear <= end && (
          <span className="absolute whitespace-nowrap -translate-x-1/2 text-ivory font-medium" style={{ left: `${nowPct}%`, top: "0.95rem" }}>지금</span>
        )}
      </div>
    </div>
  );
}

/** 연도 리본: 한 칸 = 한 해. 위 칸 = 겉으로 드러나는 주제, 아래 칸 = 생활 속 장면. */
export function YearRibbon({
  cells, selected, onSelect, isLocked, nowYear, recordYears,
}: { cells: YearCell[]; selected: number; onSelect: (y: number) => void; isLocked: (y: number) => boolean; nowYear: number; recordYears: Set<number> }) {
  return (
    <div className="flex gap-[2px] min-w-max px-1 py-2" role="listbox" aria-label="연도 선택">
      {cells.map((c) => {
        const locked = isLocked(c.year);
        const sel = c.year === selected;
        const decadeEdge = c.shift.some((s) => s.startsWith("10년"));
        return (
          <button
            key={c.year}
            role="option"
            aria-selected={sel}
            id={`yr-${c.year}`}
            onClick={() => onSelect(c.year)}
            aria-label={`${c.year}년 ${c.age}세${locked ? " (리포트에서 열림)" : `: ${GROUP_LABEL[c.stemGroup]}`}`}
            className={cx("relative flex flex-col items-center gap-[2px] w-7 shrink-0 rounded-md pt-1 pb-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-gold",
              sel ? "bg-raised ring-1 ring-ivory/70" : "hover:bg-raised/60", decadeEdge && "ml-1.5")}
          >
            <span className={cx("text-[0.62rem] tabular", c.year === nowYear ? "text-ivory font-semibold" : "text-faint")}>{String(c.year).slice(2)}</span>
            <span className="h-5 w-5 rounded-[4px]" style={{ background: locked ? "transparent" : GROUP_COLOR[c.stemGroup], border: locked ? "1px dashed #4a5b7c" : "none", opacity: locked ? 1 : 1 }} />
            <span className="h-2.5 w-5 rounded-[3px]" style={{ background: locked ? "transparent" : GROUP_COLOR[c.branchGroup], opacity: locked ? 1 : 0.55, border: locked ? "1px dashed #4a5b7c" : "none" }} />
            <span className="h-1.5 flex items-center justify-center">
              {c.shift.length > 0 && !locked && <span className="h-1 w-1 rounded-full bg-ivory" aria-hidden />}
            </span>
            {recordYears.has(c.year) && <span className="absolute -top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-ok" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
