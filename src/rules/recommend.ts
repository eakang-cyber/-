// 직관적 추천: "내년 봄을 추천드려요", "신탄진은 잘 맞는 편이에요", "2027년 2~3월쯤 인연운이 열려요".
// 모든 추천은 계산(월운·방위)과 등록된 규칙(rule_id)에서 나온다. 같은 입력이면 같은 추천.
import {
  BRANCHES, ELEMENT_KO, Element, GROUP_OF, STEMS, TEN_GOD_KO, TenGod, ThemeGroup,
  branchElement, branchMainStem, stemElement, tenGod,
} from "@/engine/constants";
import { ChartResult, MonthPeriod, annualPillar, monthPeriods } from "@/engine/chart";
import { cityById } from "@/engine/cities";
import { Place, bearing, findPlace } from "@/engine/places";
import { j } from "./josa";

// ---------- 힘이 되는 기운(억부) ----------

export interface Helpful {
  ratio: number;
  strength: "weak" | "strong";
  borderline: boolean;
  helpful: Element[];
  unhelpful: Element[];
  facts: string[];
}

export function helpfulElements(c: ChartResult): Helpful {
  const dmEl = stemElement(c.dayMaster);
  const resource = ((dmEl + 4) % 5) as Element;
  let support = 0, total = 0;
  const add = (el: Element, w: number) => { total += w; if (el === dmEl || el === resource) support += w; };
  for (const p of [c.pillars.year, c.pillars.month, c.pillars.day, c.pillars.hour]) {
    if (!p) continue;
    if (p.pos !== "day") add(stemElement(p.stem), 1);
    add(branchElement(p.branch), p.pos === "month" ? 2.5 : 1);
  }
  const ratio = total ? support / total : 0.5;
  const strength = ratio >= 0.5 ? "strong" : "weak";
  const others = [1, 2, 3].map((k) => ((dmEl + k) % 5) as Element);
  const helpful = strength === "weak" ? [dmEl, resource] : others;
  const unhelpful = strength === "weak" ? others : [dmEl, resource];
  return {
    ratio, strength, borderline: Math.abs(ratio - 0.5) < 0.08, helpful, unhelpful,
    facts: [
      `일간 ${STEMS[c.dayMaster]}(${ELEMENT_KO[dmEl]}) · 돕는 기운 비중 ${(ratio * 100).toFixed(0)}% (월지 2.5배 가중) → ${strength === "weak" ? "약한 편" : "강한 편"}`,
      `힘이 되는 기운: ${helpful.map((e) => ELEMENT_KO[e]).join("·")}`,
    ],
  };
}

// ---------- 시기 추천 ----------

const SEASON_OF_BRANCH: Record<number, "봄" | "여름" | "가을" | "겨울"> = { 2: "봄", 3: "봄", 4: "봄", 5: "여름", 6: "여름", 7: "여름", 8: "가을", 9: "가을", 10: "가을", 11: "겨울", 0: "겨울", 1: "겨울" };

export interface MonthScore { p: MonthPeriod; score: number; why: string[] }

function relYear(y: number, now: Date) {
  const d = y - now.getFullYear();
  return d === 0 ? "올해" : d === 1 ? "내년" : d === 2 ? "내후년" : `${y}년`;
}

export interface Window {
  label: string;        // "내년 봄(2~4월)"
  short: string;        // "내년 봄"
  best: MonthPeriod;
  bestLabel: string;    // "3월"
  months: MonthScore[];
}

function windows(scored: MonthScore[], now: Date): Window[] {
  const groups: MonthScore[][] = [];
  for (const m of scored) {
    const last = groups.at(-1);
    if (last && SEASON_OF_BRANCH[last[0].p.branch] === SEASON_OF_BRANCH[m.p.branch]) last.push(m);
    else groups.push([m]);
  }
  return groups.filter((g) => g.length >= 2).map((g) => {
    const best = g.reduce((a, b) => (b.score > a.score ? b : a));
    const season = SEASON_OF_BRANCH[g[0].p.branch];
    // 겨울(11~1월)이 해를 넘기면 시작 연도 기준
    const y = g[0].p.y;
    const range = g.length > 1 ? `${g[0].p.m}~${g.at(-1)!.p.m}월` : `${g[0].p.m}월`;
    return {
      label: `${relYear(y, now)}${/^\d/.test(relYear(y, now)) ? "" : `(${y}년)`} ${season}(${range})`,
      short: `${relYear(y, now)} ${season}`,
      best: best.p, bestLabel: `${best.p.y !== y ? `${best.p.y}년 ` : ""}${best.p.m}월`, months: g,
    };
  });
}

const avg = (w: Window) => w.months.reduce((s, m) => s + m.score, 0) / w.months.length;

function scoreMonths(c: ChartResult, h: Helpful, focus: ThemeGroup[], now: Date, extra?: (p: MonthPeriod) => { add: number; why?: string }) {
  // 다음 달부터 24개월(이번 달은 이미 진행 중)
  const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return monthPeriods(start.getFullYear(), start.getMonth() + 1, 24).map((p) => {
    let score = 0; const why: string[] = [];
    const se = stemElement(p.stem), be = branchElement(p.branch);
    if (h.helpful.includes(se)) { score += 2; why.push(`${ELEMENT_KO[se]} 기운(힘이 됨)`); }
    if (h.helpful.includes(be)) { score += 1.5; if (be !== se) why.push(`${ELEMENT_KO[be]} 기운(힘이 됨)`); }
    if (h.unhelpful.includes(se)) score -= 1;
    const sg = GROUP_OF[tenGod(c.dayMaster, p.stem)], bg = GROUP_OF[tenGod(c.dayMaster, branchMainStem(p.branch))];
    if (focus.includes(sg)) { score += 1.5; why.push("고민 주제가 드러나는 달"); }
    else if (focus.includes(bg)) score += 0.5;
    const yEl = stemElement(annualPillar(p.y).stem);
    if (h.helpful.includes(yEl)) score += 1; else score -= 0.5;
    if (extra) { const e = extra(p); score += e.add; if (e.why) why.push(e.why); }
    return { p, score, why };
  });
}

export interface TimingRec {
  best: Window;
  avoid: Window | null;
  ranked: MonthScore[]; // 상위 월(유료 상세)
  facts: string[];
}

export function recommendTiming(c: ChartResult, focus: ThemeGroup[], now = new Date()): TimingRec {
  const h = helpfulElements(c);
  const scored = scoreMonths(c, h, focus, now);
  const ws = windows(scored, now);
  const sorted = [...ws].sort((a, b) => avg(b) - avg(a) || a.best.startUtcMs - b.best.startUtcMs);
  const best = sorted[0];
  const avoid = sorted.length > 1 ? sorted[sorted.length - 1] : null;
  return {
    best, avoid,
    ranked: [...scored].sort((a, b) => b.score - a.score).slice(0, 5),
    facts: [...h.facts, ...best.months.map((m) => `${m.p.y}.${m.p.m} ${STEMS[m.p.stem]}${BRANCHES[m.p.branch]}월: ${m.why.join(", ") || "-"}`)],
  };
}

// ---------- 장소(방위) ----------

const SECTORS: { name: string; el: Element }[] = [
  { name: "북쪽", el: 4 }, { name: "북동쪽", el: 2 }, { name: "동쪽", el: 0 }, { name: "남동쪽", el: 0 },
  { name: "남쪽", el: 1 }, { name: "남서쪽", el: 2 }, { name: "서쪽", el: 3 }, { name: "북서쪽", el: 3 },
];

export interface PlaceRec {
  place: Place;
  baseName: string;
  direction: string;
  element: Element;
  verdict: "good" | "money" | "effort";
  line: string;
  facts: string[];
}

export function recommendPlace(c: ChartResult, place: Place, baseCityId: string, name: string, moneyTopic: boolean): PlaceRec {
  const base = cityById(baseCityId);
  const { deg, km } = bearing(base, place);
  const near = km < 12;
  const sector = near ? { name: "같은 생활권", el: 2 as Element } : SECTORS[Math.round(deg / 45) % 8];
  const h = helpfulElements(c);
  const wealthEl = ((stemElement(c.dayMaster) + 2) % 5) as Element;
  const verdict: PlaceRec["verdict"] = h.helpful.includes(sector.el) ? "good" : moneyTopic && sector.el === wealthEl ? "money" : "effort";
  const where = near ? `${base.name}과 같은 생활권` : `${base.name}에서 ${sector.name}`;
  const line = verdict === "good"
    ? `${j(place.name, "은/는")} ${name}님과 잘 맞는 편이에요. ${where}, ${ELEMENT_KO[sector.el]} 기운의 방향이라 ${name}님에게 힘이 되는 쪽이에요.`
    : verdict === "money"
      ? `${j(place.name, "은/는")} 돈이 도는 방향이에요. ${where}, ${name}님에게 재물을 뜻하는 ${ELEMENT_KO[sector.el]} 기운이라 기회는 있지만, 힘을 많이 쓰는 자리라 자금 여유를 두고 들어가는 걸 추천드려요.`
      : `${j(place.name, "은/는")} ${name}님이 기운을 쓰는 방향이에요. ${where}, ${ELEMENT_KO[sector.el]} 기운이라 들어간다면 시기를 잘 맞추고 사람·자금의 보완을 함께 준비하는 걸 추천드려요.`;
  return {
    place, baseName: base.name, direction: sector.name, element: sector.el, verdict, line,
    facts: [`기준: 지금 사는 곳 ${base.name} → ${place.name} 방위각 ${deg.toFixed(0)}°, 약 ${km.toFixed(0)}km → ${sector.name}(${ELEMENT_KO[sector.el]})`, ...h.facts],
  };
}

// ---------- 연애·인연 ----------

const DOHWA: Record<number, number> = { 8: 9, 0: 9, 4: 9, 2: 3, 6: 3, 10: 3, 5: 6, 9: 6, 1: 6, 11: 0, 3: 0, 7: 0 };
const SIX_COMBINE: Record<number, number> = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };

const STAR_TRAIT: Partial<Record<TenGod, string>> = {
  jeongjae: "차분하고 현실 감각이 있으며 약속을 잘 지키는",
  pyeonjae: "활동적이고 사교적이며 표현이 시원시원한",
  jeonggwan: "반듯하고 책임감이 강하며 믿음을 주는",
  pyeongwan: "추진력과 카리스마가 있고 결단이 빠른",
};
const ELEMENT_TRAIT: Record<Element, string> = {
  0: "성장 욕구가 강하고 곧은", 1: "밝고 열정적인", 2: "든든하고 포용력 있는", 3: "깔끔하고 원칙이 분명한", 4: "생각이 깊고 유연한",
};

export interface LoveRec { when: Window; trait: string; seek: string; line: string; why: string; facts: string[] }

export function recommendLove(c: ChartResult, name: string, seek: "여성" | "남성" | "사람", now = new Date()): LoveRec {
  const dmEl = stemElement(c.dayMaster);
  const sex = c.input.sex;
  const partnerEls: Element[] = sex === "male" ? [((dmEl + 2) % 5) as Element] : sex === "female" ? [((dmEl + 3) % 5) as Element] : [((dmEl + 2) % 5) as Element, ((dmEl + 3) % 5) as Element];
  const dayB = c.pillars.day.branch, yearB = c.pillars.year.branch;
  const dohwa = new Set([DOHWA[dayB], DOHWA[yearB]]);
  const h = helpfulElements(c);
  const scored = scoreMonths(c, h, [], now, (p) => {
    let add = 0; const why: string[] = [];
    if (partnerEls.includes(stemElement(p.stem))) { add += 3; why.push("인연의 기운이 드러남"); }
    if (partnerEls.includes(branchElement(p.branch))) { add += 2; why.push("인연의 기운이 생활에 들어옴"); }
    if (dohwa.has(p.branch)) { add += 2; why.push("도화(매력이 드러나는 달)"); }
    if (SIX_COMBINE[dayB] === p.branch) { add += 2; why.push("가까운 관계 자리와 묶이는 달"); }
    if (partnerEls.includes(stemElement(annualPillar(p.y).stem))) add += 1;
    return { add, why: why.join(", ") || undefined };
  });
  const ws = windows(scored, now).sort((a, b) => avg(b) - avg(a) || a.best.startUtcMs - b.best.startUtcMs);
  const when = ws[0];
  const bp = when.best;
  // 그달에 들어오는 인연의 글자(천간 → 지지 본기 → 그해 천간 순). 없으면 그달 천간과 같은 음양의 인연 오행 글자.
  const cands = [bp.stem, branchMainStem(bp.branch), annualPillar(bp.y).stem];
  const starStem = cands.find((s) => partnerEls.includes(stemElement(s))) ?? (partnerEls[0] * 2 + (bp.stem % 2));
  const god = tenGod(c.dayMaster, starStem);
  const trait = `${STAR_TRAIT[god] ?? "마음이 잘 통하는"}, ${ELEMENT_TRAIT[stemElement(starStem)]}`;
  const all = [...new Set(when.months.flatMap((m) => m.why.flatMap((w) => w.split(", "))))];
  const reasons = [...all.filter((w) => /인연|도화|가까운 관계/.test(w)), ...all.filter((w) => !/인연|도화|가까운 관계/.test(w))].slice(0, 2);
  return {
    when, trait, seek,
    why: `${name}님 사주에서 인연을 뜻하는 기운은 ${partnerEls.map((e) => ELEMENT_KO[e]).join("·")}인데, ${when.short}에 ${reasons.length ? reasons.join(", ") : "그 기운이 들어오는 흐름"}이 겹쳐요.`,
    line: `${name}님은 ${when.short}, 특히 ${when.bestLabel}쯤 연애운이 열리는 흐름이에요. ${trait} ${seek}을 만날 가능성이 커요.`,
    facts: [
      `인연의 기운(${sex === "male" ? "남성: 재성" : sex === "female" ? "여성: 관성" : "성별 미선택: 재성·관성"}) = ${partnerEls.map((e) => ELEMENT_KO[e]).join("·")}`,
      `도화: ${[...dohwa].map((b) => BRANCHES[b]).join("·")} · 일지 ${BRANCHES[dayB]}와 합: ${BRANCHES[SIX_COMBINE[dayB]]}`,
      `가장 좋은 달 ${bp.y}.${bp.m} ${STEMS[bp.stem]}${BRANCHES[bp.branch]}: ${TEN_GOD_KO[god]} 기운 → 상대 성향`,
      ...when.months.map((m) => `${m.p.y}.${m.p.m}: ${m.why.join(", ") || "-"}`),
    ],
  };
}

export { findPlace };
