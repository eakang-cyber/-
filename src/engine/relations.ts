// 글자 사이의 전통적 관계(합·충·형). 해석이 아니라 '관계가 존재한다'는 사실만 계산한다.
import { BRANCHES, STEMS } from "./constants";
import type { Pillar, PillarPos } from "./chart";

export type RelationKind =
  | "stemCombine" | "stemClash"
  | "branchCombine" | "branchClash" | "branchPunish" | "branchHalfTrine";

export interface Relation {
  kind: RelationKind;
  a: PillarPos | "luck" | "year-luck" | "partner";
  b: PillarPos | "luck" | "year-luck" | "partner";
  chars: [number, number];
  label: string; // 전문가 표기
  plain: string; // 쉬운 설명
}

export const POS_KO: Record<string, string> = {
  year: "태어난 해", month: "태어난 달", day: "태어난 날", hour: "태어난 시",
  luck: "10년 흐름", "year-luck": "그해", partner: "상대",
};

const BRANCH_COMBINE = new Set(["0-1", "2-11", "3-10", "4-9", "5-8", "6-7"]);
const TRINES = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]]; // 수·목·화·금국
const PUNISH = new Set(["2-5", "5-8", "2-8", "1-10", "10-7", "1-7", "0-3"]);
const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

export function stemRelation(s1: number, s2: number): RelationKind | null {
  const d = Math.abs(s1 - s2);
  if (d === 5) return "stemCombine";
  if (d === 6 && Math.min(s1, s2) <= 3) return "stemClash";
  return null;
}

export function branchRelations(b1: number, b2: number): RelationKind[] {
  const out: RelationKind[] = [];
  if (BRANCH_COMBINE.has(key(b1, b2))) out.push("branchCombine");
  if (Math.abs(b1 - b2) === 6) out.push("branchClash");
  if (PUNISH.has(key(b1, b2))) out.push("branchPunish");
  if (b1 !== b2) {
    for (const t of TRINES) if (t.includes(b1) && t.includes(b2)) out.push("branchHalfTrine");
  }
  return out;
}

const KIND_KO: Record<RelationKind, string> = {
  stemCombine: "합", stemClash: "충", branchCombine: "합", branchClash: "충", branchPunish: "형", branchHalfTrine: "반합",
};
const KIND_PLAIN: Record<RelationKind, string> = {
  stemCombine: "서로 끌어당겨 묶이는 관계",
  stemClash: "서로 부딪히며 긴장을 만드는 관계",
  branchCombine: "서로 끌어당겨 묶이는 관계",
  branchClash: "정반대 자리에서 부딪히는 관계",
  branchPunish: "마찰과 조정이 필요한 관계",
  branchHalfTrine: "같은 방향으로 힘을 모으는 관계",
};

export function describe(kind: RelationKind, c1: number, c2: number, isStem: boolean) {
  const [x, y] = c1 <= c2 ? [c1, c2] : [c2, c1];
  const chars = isStem ? STEMS[x] + STEMS[y] : BRANCHES[x] + BRANCHES[y];
  return { label: `${chars}${KIND_KO[kind]}`, plain: KIND_PLAIN[kind] };
}

export function findRelations(pillars: Pillar[]): Relation[] {
  const out: Relation[] = [];
  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const p = pillars[i], q = pillars[j];
      const sk = stemRelation(p.stem, q.stem);
      if (sk) out.push({ kind: sk, a: p.pos, b: q.pos, chars: [p.stem, q.stem], ...describe(sk, p.stem, q.stem, true) });
      for (const bk of branchRelations(p.branch, q.branch)) {
        out.push({ kind: bk, a: p.pos, b: q.pos, chars: [p.branch, q.branch], ...describe(bk, p.branch, q.branch, false) });
      }
    }
  }
  return out;
}
