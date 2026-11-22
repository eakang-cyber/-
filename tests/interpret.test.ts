import { describe, expect, it } from "vitest";
import { computeChart, BirthInput } from "@/engine/chart";
import { buildCharacter, buildDecades, buildPair, buildWork, buildYears, yearBlock } from "@/rules/interpret";
import { RULE_MAP } from "@/rules/registry";

const yk: BirthInput = { name: "강윤규", calendar: "solar", year: 1996, month: 3, day: 27, isLeapMonth: false, timeKnown: true, hour: 9, minute: 58, cityId: "seoul", sex: "male" };
const other: BirthInput = { ...yk, name: "비교", year: 1989, month: 11, day: 2, hour: 18, minute: 10, cityId: "busan", sex: "female" };

const allBlocks = (c: ReturnType<typeof computeChart>) => {
  const ch = buildCharacter(c);
  return [ch.coreBlock, ...ch.stories, ...ch.strengths, ...ch.frictions, ...ch.observations, ...buildDecades(c).map((d) => d.block), ...buildWork(c, "창업", 2026).map((w) => w.traditional)];
};

describe("해석 계층", () => {
  it("모든 블록이 등록된 rule_id 를 가진다", () => {
    for (const b of allBlocks(computeChart(yk))) {
      expect(b.ruleIds.length).toBeGreaterThan(0);
      for (const id of b.ruleIds) expect(RULE_MAP[id], id).toBeDefined();
    }
  });
  it("출생정보가 다르면 핵심 해석이 실질적으로 달라진다", () => {
    const a = buildCharacter(computeChart(yk));
    const b = buildCharacter(computeChart(other));
    expect(a.coreSentence).not.toBe(b.coreSentence);
    expect(a.stories.map((s) => s.id).join()).not.toBe(b.stories.map((s) => s.id).join());
  });
  it("같은 입력 → 같은 해석", () => {
    expect(JSON.stringify(allBlocks(computeChart(yk)))).toBe(JSON.stringify(allBlocks(computeChart(yk))));
  });
  it("금지 표현이 없다", () => {
    const text = JSON.stringify(allBlocks(computeChart(yk))) + JSON.stringify(buildYears(computeChart(yk)).map((y) => yearBlock(computeChart(yk), y)));
    for (const bad of ["사망", "파산", "이혼", "확률", "반드시 성공", "대박", "흉한 해", "위험한 해"]) expect(text).not.toContain(bad);
  });
  it("샘플 출력 스냅샷(사람 검토용)", () => {
    const c = computeChart(yk);
    const ch = buildCharacter(c);
    console.log(ch.coreSentence);
    console.log(ch.stories.map((s) => `- ${s.title} [${s.ruleIds}]`).join("\n"));
    console.log(ch.frictions.map((s) => `! ${s.title}`).join("\n"));
    console.log(ch.observations.map((s) => `o ${s.title}`).join("\n"));
    console.log(buildDecades(c).map((d) => `${d.startYear}-${d.endYear} ${d.label.ko} ${d.block.title}`).join("\n"));
    const y26 = buildYears(c).find((y) => y.year === 2026)!;
    console.log(yearBlock(c, y26));
    const p = buildPair(c, computeChart(other), "윤규", "상대");
    console.log(p.aReadsB.title, "|", p.bReadsA.title, "|", p.dayBranch.title, "|", p.complement.body);
  });
});
