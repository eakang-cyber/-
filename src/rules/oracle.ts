// 신점 말투: 결론을 짧고 단정적인 문장 몇 줄로. 근거는 같은 추천 객체(계산·규칙)에서만 가져온다.
// 불행(수명·사고·질병·파산·이별) 예언은 만들지 않는다.
import type { TenGod, Element } from "@/engine/constants";
import type { LoveRec, PlaceRec, SitesRec, Window } from "./recommend";
import { particle } from "./josa";
import type { Topic } from "./counsel";

export const seasonWord = (w: Window) => w.short.replace(/^올해 /, "올");

const ACTION: Record<Topic, string> = {
  realestate: "이때 계약하세요.", business: "이때 시작하세요.", career: "이때 옮기세요.", money: "큰돈은 이때 움직이세요.",
  love: "", family: "이때 먼저 말을 꺼내세요.", people: "이때 먼저 연락하세요.", self: "이때 첫발을 떼세요.",
};
const STAR_SHORT: Partial<Record<TenGod, string>> = {
  jeongjae: "차분하고 현실적인", pyeonjae: "활발하고 사람 좋아하는", jeonggwan: "반듯하고 책임감 강한", pyeongwan: "카리스마 있고 결단 빠른",
};
const EL_SHORT: Record<Element, string> = { 0: "곧고 욕심 있는", 1: "밝고 뜨거운", 2: "듬직하고 품이 넓은", 3: "깔끔하고 단호한", 4: "생각이 깊고 유연한" };
const SEEK_WORD: Record<string, string> = { 여성: "여자", 남성: "남자", 사람: "사람" };
const ieyo = (w: string) => w + (particle(w, "이/가") === "이" ? "이에요" : "예요");
const eunNeun = (w: string) => w + particle(w, "은/는");

export function placeLines(p: PlaceRec, best: Window): string[] {
  const n = p.place.name;
  if (p.verdict === "good") return [`${n}, 당신 자리예요.`, "기운이 당신 쪽으로 흘러요."];
  if (p.verdict === "money") return [`${n}? 돈은 보여요.`, "대신 손이 많이 가요. 여유 자금 꼭 쥐고 들어가세요."];
  return [`${eunNeun(n)} 기운을 빼앗기는 자리예요.`, `꼭 가야 한다면 ${seasonWord(best)}에 맞춰 들어가세요.`];
}

export interface SiteContext { regionPlace: PlaceRec | null; siteName: string | null; siteVerdict: "good" | "money" | "effort" | null; sites: SitesRec }

function siteVerdictLine(site: string, v: "good" | "money" | "effort") {
  return v === "good" ? `그 안에서도 ${site}, 잘 골랐어요.` : v === "money" ? `${eunNeun(site)} 돈은 도는데 손이 많이 가요.` : `근데 ${eunNeun(site)} 아니에요. 기운을 빼앗겨요.`;
}

export function oracleLines(topic: Topic, best: Window, avoid: Window | null, place: PlaceRec | null, love: LoveRec | null, site?: SiteContext | null): string[] {
  if (love) {
    const lines = [`${seasonWord(love.when)}, ${love.when.bestLabel}쯤 사람 들어와요.`];
    lines.push(`${STAR_SHORT[love.god] ?? "마음이 잘 통하는"} ${ieyo(SEEK_WORD[love.seek] ?? love.seek)}.`);
    lines.push(`${EL_SHORT[love.partnerEl]} 사람이에요. 놓치지 마세요.`);
    if (love.when.months.some((m) => m.why.some((w) => w.includes("도화")))) lines.push("그때 당신 매력이 확 살아나요.");
    return lines;
  }
  const lines = [`${seasonWord(best)}, ${ieyo(best.bestLabel)}.`, ACTION[topic]];
  if (site) {
    if (site.regionPlace) lines.push(...placeLines(site.regionPlace, best));
    if (site.siteName && site.siteVerdict) lines.push(siteVerdictLine(site.siteName, site.siteVerdict));
    if (!site.siteName || site.siteVerdict !== "good") lines.push(sitesFreeLine(site.sites));
  } else if (place) lines.push(...placeLines(place, best));
  if (avoid) lines.push(`${seasonWord(avoid)}엔 서두르지 마세요. 그때는 힘이 안 실려요.`);
  return lines.filter(Boolean);
}

export function sitesFreeLine(s: SitesRec): string {
  const r = s.region.name + (particle(s.region.name, "이/가") === "이" ? "이라면" : "라면");
  return s.bestDirection === "중심" ? `${r} 한가운데가 맞아요.` : `${r} ${ieyo(s.bestDirection)}.`;
}

export function siteLine(v: "good" | "money" | "effort"): string {
  return v === "good" ? "기운이 맞아요. 여기부터 보세요." : v === "money" ? "돈은 도는데 손이 많이 가요." : "기운을 빼앗겨요. 후순위로 두세요.";
}
