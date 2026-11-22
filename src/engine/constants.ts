// 결정론적 계산 엔진의 기본 테이블.
// 화면 본문에는 한자를 노출하지 않고, '근거 보기'와 '계산 기준' 화면에서만 사용한다.

export const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const STEMS_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
export const BRANCHES_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;
export const BRANCH_ANIMAL_KO = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"] as const;

/** 0 목 · 1 화 · 2 토 · 3 금 · 4 수 */
export type Element = 0 | 1 | 2 | 3 | 4;
export const ELEMENT_KO = ["나무", "불", "흙", "쇠", "물"] as const;
export const ELEMENT_HANJA = ["木", "火", "土", "金", "水"] as const;

export const stemElement = (s: number): Element => Math.floor(s / 2) as Element;
/** 0 = 양, 1 = 음 */
export const stemPolarity = (s: number) => s % 2;

/** 지장간 (여기 · 중기 · 본기). 마지막 원소가 본기. 학파에 따라 일부 차이가 있어 검수 대상. */
export const HIDDEN_STEMS: number[][] = [
  [8, 9], // 子: 壬 癸
  [9, 7, 5], // 丑: 癸 辛 己
  [4, 2, 0], // 寅: 戊 丙 甲
  [0, 1], // 卯: 甲 乙
  [1, 9, 4], // 辰: 乙 癸 戊
  [4, 6, 2], // 巳: 戊 庚 丙
  [2, 5, 3], // 午: 丙 己 丁
  [3, 1, 5], // 未: 丁 乙 己
  [4, 8, 6], // 申: 戊 壬 庚
  [6, 7], // 酉: 庚 辛
  [7, 3, 4], // 戌: 辛 丁 戊
  [4, 0, 8], // 亥: 戊 甲 壬
];
export const branchMainStem = (b: number) => HIDDEN_STEMS[b][HIDDEN_STEMS[b].length - 1];
export const branchElement = (b: number): Element => stemElement(branchMainStem(b));

/** 십성 코드 */
export type TenGod =
  | "bijeon" | "geopjae" // 비견 · 겁재
  | "siksin" | "sanggwan" // 식신 · 상관
  | "pyeonjae" | "jeongjae" // 편재 · 정재
  | "pyeongwan" | "jeonggwan" // 편관 · 정관
  | "pyeonin" | "jeongin"; // 편인 · 정인

export const TEN_GOD_HANJA: Record<TenGod, string> = {
  bijeon: "比肩", geopjae: "劫財", siksin: "食神", sanggwan: "傷官", pyeonjae: "偏財",
  jeongjae: "正財", pyeongwan: "偏官", jeonggwan: "正官", pyeonin: "偏印", jeongin: "正印",
};
export const TEN_GOD_KO: Record<TenGod, string> = {
  bijeon: "비견", geopjae: "겁재", siksin: "식신", sanggwan: "상관", pyeonjae: "편재",
  jeongjae: "정재", pyeongwan: "편관", jeonggwan: "정관", pyeonin: "편인", jeongin: "정인",
};

/** 사용자에게 보이는 5개 주제군. 명리 용어 대신 쉬운 이름을 쓴다. */
export type ThemeGroup = "self" | "create" | "result" | "structure" | "learn";
export const GROUP_OF: Record<TenGod, ThemeGroup> = {
  bijeon: "self", geopjae: "self", siksin: "create", sanggwan: "create",
  pyeonjae: "result", jeongjae: "result", pyeongwan: "structure", jeonggwan: "structure",
  pyeonin: "learn", jeongin: "learn",
};
export const GROUP_LABEL: Record<ThemeGroup, string> = {
  self: "나와 동료",
  create: "표현과 생산",
  result: "현실과 성과",
  structure: "책임과 규칙",
  learn: "배움과 보호",
};
export const GROUP_EXPERT: Record<ThemeGroup, string> = {
  self: "비겁(比劫)", create: "식상(食傷)", result: "재성(財星)", structure: "관성(官星)", learn: "인성(印星)",
};
/** 인생 지도 범주색 — dataviz validator(dark, surface #172238) 통과 순서 그대로 고정 */
export const GROUP_ORDER: ThemeGroup[] = ["create", "learn", "result", "self", "structure"];
export const GROUP_COLOR: Record<ThemeGroup, string> = {
  create: "#118659",
  learn: "#8962c5",
  result: "#b88c2e",
  self: "#2d86c8",
  structure: "#d4675b",
};

export function tenGod(dayStem: number, other: number): TenGod {
  const rel = (stemElement(other) - stemElement(dayStem) + 5) % 5;
  const same = stemPolarity(other) === stemPolarity(dayStem);
  switch (rel) {
    case 0: return same ? "bijeon" : "geopjae";
    case 1: return same ? "siksin" : "sanggwan";
    case 2: return same ? "pyeonjae" : "jeongjae";
    case 3: return same ? "pyeongwan" : "jeonggwan";
    default: return same ? "pyeonin" : "jeongin";
  }
}

export const ganzhi = (idx60: number) => ({ stem: idx60 % 10, branch: idx60 % 12 });
export const ganzhiIndex = (stem: number, branch: number) => {
  for (let i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) return i;
  throw new Error("invalid ganzhi pair");
};
export const ganzhiHanja = (stem: number, branch: number) => STEMS[stem] + BRANCHES[branch];
export const ganzhiKo = (stem: number, branch: number) => STEMS_KO[stem] + BRANCHES_KO[branch];

/** 12절(節) — 월주 경계. 이름은 lunar-javascript 의 간체 표기와 일치시킨다. */
export const JIE_TO_BRANCH: Record<string, number> = {
  立春: 2, 惊蛰: 3, 清明: 4, 立夏: 5, 芒种: 6, 小暑: 7, 立秋: 8, 白露: 9, 寒露: 10, 立冬: 11, 大雪: 0, 小寒: 1,
};
export const JIE_KO: Record<string, string> = {
  立春: "입춘", 惊蛰: "경칩", 清明: "청명", 立夏: "입하", 芒种: "망종", 小暑: "소서", 立秋: "입추",
  白露: "백로", 寒露: "한로", 立冬: "입동", 大雪: "대설", 小寒: "소한",
};
