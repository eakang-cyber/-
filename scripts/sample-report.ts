// 샘플 콘텐츠를 엔진에서 직접 생성해 Markdown으로 출력한다(문서와 코드의 불일치 방지).
import { computeChart, DEFAULT_POLICY, TimeBasis } from "@/engine/chart";
import { SAMPLE_PARTNER, SAMPLE_PROFILE } from "@/content/sample";
import { Solar } from "lunar-javascript";
import { BRANCHES, GROUP_LABEL, STEMS, TEN_GOD_KO, ganzhiKo } from "@/engine/constants";
import { buildCharacter, buildDecades, buildPair, buildWork, buildYears, choiceThemes, yearBlock, pillarsFact } from "@/rules/interpret";
import { fmtUtcAsKst, fmtWall } from "@/engine/time";

// 앱의 '가상의 예시 인물'로 샘플 콘텐츠를 생성한다(실존 인물 정보 사용 안 함).
const c = computeChart(SAMPLE_PROFILE, DEFAULT_POLICY);
const L: string[] = [];
const p = (s = "") => L.push(s);
p("## A. 계산 결과 (엔진 " + c.engineVersion + ", 상태: 미검증)");
p("");
p(`- 입력(가상 인물): 양력 1992-10-08 08:10, 서울(동경 126.98°), 여성`);
p(`- 음력: ${c.lunarDate.y}년 ${c.lunarDate.leap ? "윤" : ""}${c.lunarDate.m}월 ${c.lunarDate.d}일`);
p(`- 당시 표준시 오프셋: UTC+${c.tzOffsetMin / 60} (1992년 서머타임 없음)`);
p(`- 경도 보정: ${c.lonCorrectionMin.toFixed(1)}분 · 균시차: ${c.eotMin.toFixed(1)}분`);
p(`- 원국: **${pillarsFact(c)}** (${[c.pillars.year, c.pillars.month, c.pillars.day, c.pillars.hour!].map((x) => ganzhiKo(x.stem, x.branch)).join(" ")})`);
p("");
p("| 시간 기준 | 계산에 쓴 시각 | 시지 | 원국 |");
p("|---|---|---|---|");
for (const b of ["clock", "lmt", "apparent"] as TimeBasis[]) {
  const x = computeChart(SAMPLE_PROFILE, { ...DEFAULT_POLICY, timeBasis: b });
  p(`| ${b === "clock" ? "표준시 그대로" : b === "lmt" ? "경도 보정(기본)" : "진태양시"} | ${fmtWall(x.basisWall)} | ${BRANCHES[x.pillars.hour!.branch]} | ${pillarsFact(x)} |`);
}
p("");
p(`- 시주 경계 검토: 세 기준 모두 ${BRANCHES[c.pillars.hour!.branch]}시. 가장 가까운 경계까지 약 ${c.hourCheck!.minutesFromBoundary}분 → 기준별 차이 없음.`);
p(`- 월 경계 검토: 한로 입절(${fmtUtcAsKst(c.nextJie.utcMs)} KST) 1시간 41분 전 출생 → 월주 己酉. 출생시각 기록이 2시간 늦었다면 庚戌월이 됨.`);
p(`- 직전 절: ${c.prevJie.nameKo} ${fmtUtcAsKst(c.prevJie.utcMs)} KST · 다음 절: ${c.nextJie.nameKo} ${fmtUtcAsKst(c.nextJie.utcMs)} KST`);
p(`- 대운: ${c.luck.direction === "forward" ? "순행" : "역행(양년생 여성)"}, 직전 절까지 ${(c.luck.startYears * 3).toFixed(2)}일 ÷ 3 = 약 ${c.luck.startYears.toFixed(2)}년 → ${fmtUtcAsKst(c.luck.startUtcMs).slice(0, 10)} 무렵 시작`);
p(`- 십성: ${c.tenGods.map((t) => `${t.pos}/${t.part === "stem" ? STEMS[t.char] : BRANCHES[t.char]}=${TEN_GOD_KO[t.god]}`).join(", ")}`);
p(`- 주제군 개수: ${Object.entries(c.groupCounts).map(([g, n]) => `${GROUP_LABEL[g as keyof typeof GROUP_LABEL]} ${n}`).join(" · ")}`);
p(`- 오행(겉글자): 나무 ${c.elementCounts[0]} · 불 ${c.elementCounts[1]} · 흙 ${c.elementCounts[2]} · 쇠 ${c.elementCounts[3]} · 물 ${c.elementCounts[4]}`);
p(`- 관계: ${c.relations.map((r) => r.label).join(", ")}`);
p("");
p("## B. 화면 C — 인생 캐릭터 (규칙 기반 해설 문안)");
const ch = buildCharacter(c);
p(""); p(`> ${ch.coreSentence}`); p("");
p(`근거: ${ch.coreBlock.ruleIds.join(", ")}`); p("");
for (const s of ch.stories) { p(`### ${s.title}  \`${s.ruleIds.join(", ")}\``); p(s.body); if (s.question) p(`- 스스로에게 묻기: ${s.question}`); p(""); }
p("**강점이 드러나는 상황**"); ch.strengths.forEach((s) => p(`- ${s.title} \`${s.ruleIds}\``)); p("");
p("**갈등이 생길 수 있는 상황**"); ch.frictions.forEach((s) => p(`- ${s.title} — ${s.facts.join(", ")} \`${s.ruleIds}\``)); p("");
p("**더 살펴볼 점**"); ch.observations.forEach((s) => p(`- ${s.title} \`${s.ruleIds}\``)); p("");
p("## C. 화면 D — 10년 흐름");
p(""); p("| 기간 | 시작(만 나이) | 대운 | 드러나는 주제 | 생활 환경 |"); p("|---|---|---|---|---|");
for (const d of buildDecades(c)) p(`| ${d.startYear}–${d.endYear} | ${d.startAge.toFixed(1)} | ${d.label.hanja}(${d.label.ko}) | ${GROUP_LABEL[d.stemGroup]} | ${GROUP_LABEL[d.branchGroup]} |`);
p("");
p("### 올해 전후 3년 (무료 상세)");
for (const y of buildYears(c).filter((x) => x.year >= 2025 && x.year <= 2027)) { const b = yearBlock(c, y); p(`- **${y.year} (${y.age}세, ${y.label.hanja})** ${b.title} — ${b.body} \`${b.ruleIds.join(", ")}\``); }
p("");
p("### 전통적 변화 지점 (0~90세)");
p(buildYears(c).filter((y) => y.shift.length).map((y) => `${y.year}(${y.shift.map((s) => (s.startsWith("10년") ? "대운 교체" : s.includes("충") ? "일지 충" : "일지 합")).join("+")})`).join(", "));
p("");
p("## D. 화면 E — 돈과 일 (관심사: 창업)");
for (const w of buildWork(c, "창업", 2026)) { p(`### ${w.question}`); p(`- 전통 해석: ${w.traditional.body} \`${w.traditional.ruleIds.join(", ")}\``); p(`- 현실 조언: ${w.practical.join(" / ")}`); p(`- 확인할 것: ${w.verify.join(" / ")}`); p(""); }
p("## E. 화면 F — 관계 (데모 인물 '상대 A', 1997-08-14 14:30 부산)");
const pc = computeChart(SAMPLE_PARTNER, DEFAULT_POLICY);
const pr = buildPair(c, pc, "예시 인물", "상대 A");
p(`- 상대 A 원국: ${pillarsFact(pc)}`);
[pr.aReadsB, pr.bReadsA, pr.dayBranch, pr.complement].forEach((b) => p(`- **${b.title}** — ${b.body} \`${b.ruleIds}\``));
p(`- 대화 질문: ${pr.questions.join(" / ")}`);
p("");
p("## F. 화면 G — 선택 실험실 주제");
const t = choiceThemes(c, 2026); p(`- ${t.body} \`${t.ruleIds.join(", ")}\``);
p("");
p("## G. 엔진 간 차이 기록");
p("");
const lib = Solar.fromYmdHms(1992, 10, 8, 7, 10, 0).getLunar().getEightChar(); // KST 08:10 = CST 07:10
const yun = lib.getYun(0);
p("| 항목 | 운명OS 엔진 | lunar-javascript 1.7.8 | 비고 |");
p("|---|---|---|---|");
p(`| 원국 | ${pillarsFact(c)} | ${lib.toString()} (UTC+8 벽시계로 변환 입력) | 일치 |`);
p(`| 대운 시작 | ${fmtUtcAsKst(c.luck.startUtcMs).slice(0, 10)} 무렵 (${(c.luck.startYears * 3).toFixed(2)}일 ÷ 3, 회귀년 환산) | ${yun.getStartSolar().toYmd()} (${yun.getStartYear()}년 ${yun.getStartMonth()}개월 ${yun.getStartDay()}일) | ${fmtUtcAsKst(c.luck.startUtcMs).slice(0, 10).replace(/\./g, "-") === yun.getStartSolar().toYmd() ? "이 사례는 일치. 환산 방식(회귀년 vs 1일=4개월)이 달라 다른 사례에선 며칠 차이 날 수 있음" : "환산 관행 차이 — 명리 검수자 결정 필요"} |`);
p("| 시간대 | KST→UTC로 바꿔 절기 순간과 비교 | UTC+8 벽시계 기준 | 라이브러리에 KST를 그대로 넣으면 시주가 달라질 수 있음 |");
console.log(L.join("\n"));

