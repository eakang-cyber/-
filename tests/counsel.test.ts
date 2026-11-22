import { describe, expect, it } from "vitest";
import { computeChart, BirthInput } from "@/engine/chart";
import { hasCrisisSignal, buildCounsel, checkAiAnswer, counselPrompt, guessTopic, CounselInput } from "@/rules/counsel";
import { buildMonths, buildRoadmap, guessType } from "@/rules/decision";
import { RULE_MAP } from "@/rules/registry";

const p1: BirthInput = { name: "", calendar: "solar", year: 1992, month: 10, day: 8, isLeapMonth: false, timeKnown: true, hour: 8, minute: 10, cityId: "seoul", sex: "female" };
const p2: BirthInput = { ...p1, year: 1985, month: 5, day: 21, hour: 15, minute: 40, sex: "male" };
const inp: CounselInput = { text: "대전 신탄진에 공장 부지를 사려고 하는데 지금 움직여도 될지 모르겠어요", topic: null, deadline: "3개월 안", feeling: "두렵다", concern: "돈", optionA: "지금 산다", optionB: "1년 더 본다" };
const NOW = new Date(2026, 10, 22);

describe("고민상담소", () => {
  it("고민 글에서 분야·결정 종류를 추정", () => {
    expect(guessTopic(inp.text)).toBe("realestate");
    expect(guessType(inp.text)).toBe("realestate");
    expect(guessTopic("3년 다닌 회사를 그만두고 이직할지")).toBe("career");
    expect(guessTopic("2년 사귄 사람과 결혼 얘기가 나와요")).toBe("love");
  });
  it("상담지는 고객의 말을 되돌려 주고, 모든 근거가 등록된 규칙", () => {
    const a = buildCounsel(computeChart(p1), { ...inp, topic: "realestate" }, NOW)!;
    expect(a.understood).toContain("신탄진");
    expect(a.heart.join()).toContain("지금 산다");
    for (const b of [...a.me, a.timing]) for (const id of b.ruleIds) expect(RULE_MAP[id], id).toBeDefined();
  });
  it("같은 고민이라도 사주가 다르면 상담지가 달라진다", () => {
    const a = buildCounsel(computeChart(p1), { ...inp, topic: "realestate" }, NOW)!;
    const b = buildCounsel(computeChart(p2), { ...inp, topic: "realestate" }, NOW)!;
    expect(JSON.stringify([a.me.map((x) => x.body), a.timing.body])).not.toBe(JSON.stringify([b.me.map((x) => x.body), b.timing.body]));
    expect(a.months.map((m) => m.group).join()).not.toBe(b.months.map((m) => m.group).join());
  });
  it("상담지·결정 로드맵에 금지 표현이 없다", () => {
    const c = computeChart(p1);
    const a = buildCounsel(c, { ...inp, topic: "realestate" }, NOW)!;
    const road = buildRoadmap(buildMonths(c, "realestate", NOW, 24), "realestate");
    const text = JSON.stringify(a) + JSON.stringify(road);
    for (const bad of ["사망", "파산", "이혼", "확률", "반드시", "사세요", "사지 마세요"]) expect(text).not.toContain(bad);
  });
  it("AI 프롬프트에 생년월일·이름이 들어가지 않는다", () => {
    const a = buildCounsel(computeChart(p1), { ...inp, topic: "realestate" }, NOW)!;
    const prompt = counselPrompt({ ...inp, topic: "realestate" }, a);
    expect(prompt).not.toMatch(/1992|10월 8일|08:10/);
  });
  it("위기 신호 감지", () => {
    expect(hasCrisisSignal("다 그만두고 죽고싶다")).toBe(true);
    expect(hasCrisisSignal("요즘 죽고 싶다는 생각이 들어요")).toBe(true);
    expect(hasCrisisSignal("공장 부지를 사려고 해요")).toBe(false);
  });
  it("AI 답변 검사: 한자·금지어·빈 필드 거부", () => {
    const ok = { opening: "a", tradition: "b", timing: "c", practical: "d", question: "e" };
    expect(checkAiAnswer(ok)).toBe(true);
    expect(checkAiAnswer({ ...ok, tradition: "丙火가 강해" })).toBe(false);
    expect(checkAiAnswer({ ...ok, timing: "내년 대운에 반드시 성공" })).toBe(false);
    expect(checkAiAnswer({ ...ok, practical: "" })).toBe(false);
  });
});
