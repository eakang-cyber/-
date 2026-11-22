// DESTINY OS 계산 엔진 — 결정론적. AI 언어모델은 이 계산에 관여하지 않는다.
import { Solar, Lunar, LunarYear, LunarMonth } from "lunar-javascript";
import {
  BRANCHES, BRANCHES_KO, GROUP_OF, HIDDEN_STEMS, JIE_KO, JIE_TO_BRANCH, STEMS, STEMS_KO,
  ThemeGroup, TenGod, branchElement, branchMainStem, ganzhi, ganzhiIndex, stemElement, stemPolarity, tenGod,
} from "./constants";
import { cityById } from "./cities";
import {
  Wall, equationOfTimeMinutes, isValidSolarDate, julianDayNumber, localToUtc, msToWall, wallToMs,
} from "./time";
import { Relation, findRelations } from "./relations";

export const ENGINE_VERSION = "engine-0.3.0";
const MIN = 60_000;
const DAY = 86_400_000;
const TROPICAL_YEAR_DAYS = 365.2422;

export type CalendarType = "solar" | "lunar";
export type Sex = "male" | "female" | "unspecified";
export type TimeBasis = "clock" | "lmt" | "apparent";
export type ZiPolicy = "zi23" | "midnight";

export interface BirthInput {
  name: string;
  calendar: CalendarType;
  year: number; month: number; day: number;
  isLeapMonth: boolean;
  timeKnown: boolean;
  hour: number; minute: number;
  cityId: string;
  sex: Sex;
}

export interface CalcPolicy {
  /** clock: 표준시 그대로 · lmt: 경도 보정 평균태양시 · apparent: 경도 + 균시차(진태양시) */
  timeBasis: TimeBasis;
  /** zi23: 23시에 날짜 변경 · midnight: 0시에 날짜 변경(23시대는 야자시) */
  ziPolicy: ZiPolicy;
}

export const DEFAULT_POLICY: CalcPolicy = { timeBasis: "lmt", ziPolicy: "zi23" };

export type PillarPos = "year" | "month" | "day" | "hour";
export interface Pillar { pos: PillarPos; stem: number; branch: number }

export interface LuckPeriod {
  index: number; stem: number; branch: number;
  startAge: number; // 만 나이(소수)
  startYear: number;
}

export interface ChartResult {
  engineVersion: string;
  input: BirthInput;
  policy: CalcPolicy;
  solarDate: { y: number; m: number; d: number };
  lunarDate: { y: number; m: number; d: number; leap: boolean };
  utcMs: number;
  tzOffsetMin: number;
  tzAnomaly: "none" | "ambiguous" | "nonexistent";
  lonCorrectionMin: number;
  eotMin: number;
  basisWall: Wall;
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };
  dayMaster: number;
  prevJie: { name: string; nameKo: string; utcMs: number };
  nextJie: { name: string; nameKo: string; utcMs: number };
  /** 시간 기준별 시지 비교 — 경계 민감도 검토용 */
  hourCheck: null | {
    byBasis: Record<TimeBasis, number>;
    minutesFromBoundary: number; // 현재 기준에서 가장 가까운 시 경계까지(분)
    consistent: boolean;
  };
  tenGods: { pos: PillarPos; part: "stem" | "branch"; char: number; god: TenGod; group: ThemeGroup }[];
  groupCounts: Record<ThemeGroup, number>;
  elementCounts: [number, number, number, number, number];
  relations: Relation[];
  luck: {
    direction: "forward" | "backward" | null;
    startYears: number;
    startUtcMs: number;
    periods: LuckPeriod[];
    approximate: boolean;
  };
  warnings: string[];
  verification: {
    status: "unverified";
    crossChecked: string[];
    pending: string[];
  };
}

export class InputError extends Error {}

export function lunarToSolar(y: number, m: number, d: number, leap: boolean) {
  if (leap) {
    const lm = LunarYear.fromYear(y).getLeapMonth();
    if (lm !== m) throw new InputError(lm ? `${y}년 음력에는 윤${lm}월만 있습니다.` : `${y}년 음력에는 윤달이 없습니다.`);
  }
  const days = LunarMonth.fromYm(y, leap ? -m : m)?.getDayCount();
  if (!days) throw new InputError("음력 월을 확인해 주세요.");
  if (d < 1 || d > days) throw new InputError(`음력 ${y}년 ${leap ? "윤" : ""}${m}월은 ${days}일까지 있습니다.`);
  const s = Lunar.fromYmd(y, leap ? -m : m, d).getSolar();
  return { y: s.getYear() as number, m: s.getMonth() as number, d: s.getDay() as number };
}

/** UTC 순간 기준 직전/직후 절(節). lunar-javascript 는 UTC+8 벽시계를 쓰므로 변환한다. */
export function jieAround(utcMs: number) {
  const cst = msToWall(utcMs + 8 * 60 * MIN);
  const lunar = Solar.fromYmdHms(cst.y, cst.m, cst.d, cst.h, cst.mi, 0).getLunar();
  const conv = (jq: any) => {
    const s = jq.getSolar();
    const ms = Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond()) - 8 * 60 * MIN;
    const name: string = jq.getName();
    return { name, nameKo: JIE_KO[name] ?? name, utcMs: ms };
  };
  return { prev: conv(lunar.getPrevJie(false)), next: conv(lunar.getNextJie(false)) };
}

/** 입춘 기준 연주의 서기 연도 */
function sajuYearOf(utcMs: number, prevJieName: string, prevJieUtc: number): number {
  // 직전 절이 입춘~대설이면 그 절이 속한 해(벽시계 연도)가 기준, 소한이면 전년도.
  const y = msToWall(prevJieUtc + 8 * 60 * MIN).y;
  if (prevJieName === "小寒") return y - 1;
  void utcMs;
  return y;
}

export const yearPillarIndex = (sajuYear: number) => (((sajuYear - 4) % 60) + 60) % 60;

function hourBranchOf(h: number, mi: number) {
  return Math.floor(((h * 60 + mi + 60) % 1440) / 120) % 12;
}

function basisWallFor(utcMs: number, tzOffsetMin: number, lon: number, basis: TimeBasis) {
  const lonCorr = lon * 4 - tzOffsetMin; // (분) 표준 자오선과의 차이
  const eot = equationOfTimeMinutes(utcMs);
  const shift = basis === "clock" ? tzOffsetMin : basis === "lmt" ? lon * 4 : lon * 4 + eot;
  return { wall: msToWall(utcMs + Math.round(shift * MIN)), lonCorr, eot, exactMinutes: shift };
}

export function computeChart(input: BirthInput, policy: CalcPolicy = DEFAULT_POLICY): ChartResult {
  const warnings: string[] = [];
  if (input.year < 1901 || input.year > 2050) throw new InputError("현재 1901년부터 2050년 출생까지 계산할 수 있습니다.");

  const solarDate = input.calendar === "lunar"
    ? lunarToSolar(input.year, input.month, input.day, input.isLeapMonth)
    : { y: input.year, m: input.month, d: input.day };
  if (!isValidSolarDate(solarDate.y, solarDate.m, solarDate.d)) throw new InputError("존재하지 않는 날짜입니다.");

  const hour = input.timeKnown ? input.hour : 12;
  const minute = input.timeKnown ? input.minute : 0;
  const local: Wall = { ...solarDate, h: hour, mi: minute };
  const { utcMs, offsetMin, anomaly } = localToUtc(local);
  if (utcMs > Date.now()) throw new InputError("미래 날짜는 입력할 수 없습니다.");
  if (anomaly === "ambiguous") warnings.push("서머타임 해제로 같은 시각이 두 번 있었던 시간입니다. 앞선 시각으로 계산했습니다.");
  if (anomaly === "nonexistent") warnings.push("서머타임 시작으로 실제로 존재하지 않았던 시각입니다. 표준시로 해석했습니다.");
  if (offsetMin !== 540) warnings.push(`출생 당시 한국 표준시는 UTC${offsetMin >= 0 ? "+" : ""}${Math.floor(offsetMin / 60)}:${String(offsetMin % 60).padStart(2, "0")}였습니다(서머타임 또는 표준시 변경). 자동 반영했습니다.`);

  const sl = Solar.fromYmd(solarDate.y, solarDate.m, solarDate.d).getLunar();
  const lunarDate = { y: sl.getYear(), m: Math.abs(sl.getMonth()), d: sl.getDay(), leap: sl.getMonth() < 0 };

  const city = cityById(input.cityId);
  const basis = basisWallFor(utcMs, offsetMin, city.lon, policy.timeBasis);

  // 연주 · 월주 — 절기 순간 기준(시간 기준 정책과 무관)
  const { prev, next } = jieAround(utcMs);
  const sajuYear = sajuYearOf(utcMs, prev.name, prev.utcMs);
  const yIdx = yearPillarIndex(sajuYear);
  const yearP: Pillar = { pos: "year", ...ganzhi(yIdx) };
  const monthBranch = JIE_TO_BRANCH[prev.name];
  if (monthBranch === undefined) throw new Error(`unknown jie ${prev.name}`);
  const tigerStem = ((yearP.stem % 5) * 2 + 2) % 10;
  const monthStem = (tigerStem + ((monthBranch - 2 + 12) % 12)) % 10;
  const monthP: Pillar = { pos: "month", stem: monthStem, branch: monthBranch };

  // 일주 · 시주 — 선택한 시간 기준의 벽시계
  const bw = basis.wall;
  let dayDate = { y: bw.y, m: bw.m, d: bw.d };
  const lateZi = bw.h >= 23;
  if (input.timeKnown && lateZi && policy.ziPolicy === "zi23") {
    dayDate = msToWall(wallToMs({ ...bw, h: 12, mi: 0 }) + DAY);
  }
  if (!input.timeKnown) {
    // 시간 미상: 정오 기준 날짜로 일주 계산. 단, 기준 보정으로 날짜가 바뀌는 경우는 없음(정오).
    dayDate = { ...solarDate };
  }
  const dIdx = (((julianDayNumber(dayDate.y, dayDate.m, dayDate.d) + 49) % 60) + 60) % 60;
  const dayP: Pillar = { pos: "day", ...ganzhi(dIdx) };

  let hourP: Pillar | null = null;
  let hourCheck: ChartResult["hourCheck"] = null;
  if (input.timeKnown) {
    const hb = hourBranchOf(bw.h, bw.mi);
    // 야자시(midnight 정책의 23시대)는 다음 날 일간 기준으로 시간(時干)을 정하는 관례를 따른다.
    const stemBaseDay = lateZi && policy.ziPolicy === "midnight" ? (dayP.stem + 1) % 10 : dayP.stem;
    const hs = ((stemBaseDay % 5) * 2 + hb) % 10;
    hourP = { pos: "hour", stem: hs, branch: hb };
    const byBasis = {} as Record<TimeBasis, number>;
    for (const b of ["clock", "lmt", "apparent"] as TimeBasis[]) {
      const w = basisWallFor(utcMs, offsetMin, city.lon, b).wall;
      byBasis[b] = hourBranchOf(w.h, w.mi);
    }
    const mins = bw.h * 60 + bw.mi;
    const rel = (mins + 60) % 120; // 현재 시 안에서 경과 분
    const minutesFromBoundary = Math.min(rel, 120 - rel);
    const consistent = new Set(Object.values(byBasis)).size === 1;
    hourCheck = { byBasis, minutesFromBoundary, consistent };
    if (!consistent) warnings.push("시간 기준(표준시·경도 보정·진태양시)에 따라 태어난 시의 글자가 달라집니다. 기준을 선택해 비교해 보세요.");
    if (minutesFromBoundary < 15) warnings.push("시 경계에서 15분 이내입니다. 출생 기록의 정확도에 따라 결과가 달라질 수 있습니다.");
    if (lateZi) warnings.push("23시대 출생입니다. 날짜 변경 기준(자시 정책)에 따라 일주가 달라질 수 있습니다.");
  } else {
    warnings.push("출생시간을 모르면 태어난 시의 두 글자를 계산하지 않습니다. 관련 해석은 제외됩니다.");
  }

  const pillars = { year: yearP, month: monthP, day: dayP, hour: hourP };
  const dm = dayP.stem;

  // 십성
  const tenGods: ChartResult["tenGods"] = [];
  const groupCounts: Record<ThemeGroup, number> = { self: 0, create: 0, result: 0, structure: 0, learn: 0 };
  const elementCounts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const p of [yearP, monthP, dayP, hourP]) {
    if (!p) continue;
    elementCounts[stemElement(p.stem)]++;
    elementCounts[branchElement(p.branch)]++;
    if (p.pos !== "day") {
      const g = tenGod(dm, p.stem);
      tenGods.push({ pos: p.pos, part: "stem", char: p.stem, god: g, group: GROUP_OF[g] });
      groupCounts[GROUP_OF[g]]++;
    }
    const gb = tenGod(dm, branchMainStem(p.branch));
    tenGods.push({ pos: p.pos, part: "branch", char: p.branch, god: gb, group: GROUP_OF[gb] });
    groupCounts[GROUP_OF[gb]]++;
  }

  const relations = findRelations([yearP, monthP, dayP, hourP].filter(Boolean) as Pillar[]);

  // 대운: 양남음녀 순행, 음남양녀 역행. 3일 = 1년 환산.
  let direction: "forward" | "backward" | null = null;
  if (input.sex !== "unspecified") {
    const yang = stemPolarity(yearP.stem) === 0;
    direction = (yang && input.sex === "male") || (!yang && input.sex === "female") ? "forward" : "backward";
  }
  const dirForCalc = direction ?? "forward";
  const target = dirForCalc === "forward" ? next.utcMs : prev.utcMs;
  const diffDays = Math.abs(target - utcMs) / DAY;
  const startYears = diffDays / 3;
  const startUtcMs = utcMs + startYears * TROPICAL_YEAR_DAYS * DAY;
  const mIdx = ganzhiIndex(monthP.stem, monthP.branch);
  const periods: LuckPeriod[] = [];
  for (let k = 1; k <= 9; k++) {
    const idx = (((mIdx + (dirForCalc === "forward" ? k : -k)) % 60) + 60) % 60;
    const startAge = startYears + (k - 1) * 10;
    const startYear = new Date(utcMs + startAge * TROPICAL_YEAR_DAYS * DAY).getUTCFullYear();
    periods.push({ index: k, ...ganzhi(idx), startAge, startYear });
  }
  if (!direction) warnings.push("성별을 선택하지 않아 10년 흐름(대운)의 방향을 확정할 수 없습니다. 순행 기준으로 임시 표시합니다.");

  return {
    engineVersion: ENGINE_VERSION,
    input, policy, solarDate, lunarDate, utcMs,
    tzOffsetMin: offsetMin, tzAnomaly: anomaly,
    lonCorrectionMin: basis.lonCorr, eotMin: basis.eot, basisWall: bw,
    pillars, dayMaster: dm,
    prevJie: prev, nextJie: next, hourCheck,
    tenGods, groupCounts, elementCounts, relations,
    luck: { direction, startYears, startUtcMs, periods, approximate: !input.timeKnown },
    warnings,
    verification: {
      status: "unverified",
      crossChecked: [
        "일주: 율리우스일 공식 ↔ lunar-javascript 결과 일치(테스트)",
        "절기 시각: lunar-javascript ↔ 독립 태양황경 근사식 30분 이내(테스트)",
      ],
      pending: [
        "한국천문연구원(KASI) 역서·음양력 자료와의 대조",
        "상용 만세력 2종 이상과 경계 사례 300건 대조",
        "명리 검수자의 지장간·대운 기산 방식 확인",
      ],
    },
  };
}

// ---------- 해석 계층에서 쓰는 보조 계산 ----------

export function annualPillar(year: number): { stem: number; branch: number } {
  return ganzhi(yearPillarIndex(year));
}

export function pillarLabel(p: { stem: number; branch: number }) {
  return { hanja: STEMS[p.stem] + BRANCHES[p.branch], ko: STEMS_KO[p.stem] + BRANCHES_KO[p.branch] };
}

export function hiddenStemsOf(branch: number) {
  return HIDDEN_STEMS[branch];
}

/** 특정 연도(그 해 입춘 이후)에 해당하는 대운 */
export function luckPeriodAt(chart: ChartResult, year: number): LuckPeriod | null {
  let cur: LuckPeriod | null = null;
  for (const p of chart.luck.periods) if (p.startYear <= year) cur = p;
  return cur;
}

export function ageInYear(chart: ChartResult, year: number) {
  return year - chart.solarDate.y; // 그 해 생일 이후의 만 나이
}

// ---------- 월운(月運): 절기 기준 한 달 단위 간지 ----------

export interface MonthPeriod {
  /** 이 기간이 주로 걸치는 양력 연·월(절 입절일이 있는 달) */
  y: number; m: number;
  stem: number; branch: number;
  startUtcMs: number; // 절 입절 순간
  endUtcMs: number;   // 다음 절 입절 순간
}

/** 양력 (y, m)부터 count 개월의 월운. 각 달의 절(節) 이후 기간을 그 달의 월주로 본다. */
export function monthPeriods(y: number, m: number, count: number): MonthPeriod[] {
  const out: MonthPeriod[] = [];
  for (let i = 0; i < count; i++) {
    const yy = y + Math.floor((m - 1 + i) / 12);
    const mm = ((m - 1 + i) % 12) + 1;
    // 매월 20일은 그 달 절(4~8일) 이후이고 다음 달 절 이전이다.
    const probe = Date.UTC(yy, mm - 1, 20, 3);
    const { prev, next } = jieAround(probe);
    const branch = JIE_TO_BRANCH[prev.name];
    const sajuYear = sajuYearOf(probe, prev.name, prev.utcMs);
    const yStem = yearPillarIndex(sajuYear) % 10;
    const tigerStem = ((yStem % 5) * 2 + 2) % 10;
    const stem = (tigerStem + ((branch - 2 + 12) % 12)) % 10;
    out.push({ y: yy, m: mm, stem, branch, startUtcMs: prev.utcMs, endUtcMs: next.utcMs });
  }
  return out;
}
