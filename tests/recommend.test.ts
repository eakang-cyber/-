import { describe, expect, it } from "vitest";
import { computeChart, BirthInput } from "@/engine/chart";
import { helpfulElements, recommendLove, recommendPlace, recommendTiming } from "@/rules/recommend";
import { findPlace } from "@/engine/places";
import { RULE_MAP } from "@/rules/registry";

const ex: BirthInput = { name: "", calendar: "solar", year: 1992, month: 10, day: 8, isLeapMonth: false, timeKnown: true, hour: 8, minute: 10, cityId: "seoul", sex: "female" };
const other: BirthInput = { ...ex, year: 1985, month: 1, day: 14, hour: 22, minute: 5, sex: "male" };
const NOW = new Date(2026, 10, 22);

describe("직관적 추천", () => {
  it("억부 용신: 예시 인물(丁火, 돕는 기운 약 24%)은 약한 편 → 불·나무가 힘이 됨", () => {
    const h = helpfulElements(computeChart(ex));
    expect(h.strength).toBe("weak");
    expect(h.helpful).toEqual([1, 0]);
  });
  it("시기 추천은 다음 달 이후 24개월 안의 계절 하나, 같은 입력이면 같은 결과", () => {
    const a = recommendTiming(computeChart(ex), ["result", "learn"], NOW);
    const b = recommendTiming(computeChart(ex), ["result", "learn"], NOW);
    expect(a.best.label).toBe(b.best.label);
    expect(a.best.label).toMatch(/(봄|여름|가을|겨울)\(\d+~\d+월\)/);
    expect(a.best.best.startUtcMs).toBeGreaterThan(Date.UTC(2026, 10, 30));
  });
  it("사주가 다르면 추천 계절이 달라질 수 있다(두 사례 비교)", () => {
    const a = recommendTiming(computeChart(ex), ["result"], NOW).best.label;
    const b = recommendTiming(computeChart(other), ["result"], NOW).best.label;
    expect(a).not.toBe(b);
  });
  it("장소: 서울 기준 신탄진은 남쪽(불) → 불이 힘이 되는 예시 인물에겐 '잘 맞는 편'", () => {
    const r = recommendPlace(computeChart(ex), findPlace("대전 신탄진 공장 부지")!, "seoul", "예시", true);
    expect(r.direction).toBe("남쪽");
    expect(r.verdict).toBe("good");
    expect(r.line).toContain("잘 맞는 편");
  });
  it("장소: 12km 이내는 같은 생활권(흙)으로 본다", () => {
    const r = recommendPlace(computeChart(ex), findPlace("신탄진")!, "daejeon", "예시", false);
    expect(r.direction).toBe("같은 생활권");
  });
  it("연애: 시기와 상대 성향을 한 문장으로", () => {
    const l = recommendLove(computeChart(ex), "예시", "남성", NOW);
    expect(l.line).toMatch(/연애운이 열리는 흐름이에요\. .+ 남성을 만날 가능성이 커요\./);
  });
  it("추천에 쓰인 규칙이 모두 등록되어 있다", () => {
    for (const id of ["YONG-EOKBU-001", "DIR-BAGUA-001", "LOVE-STAR-001", "REC-TIMING-001"]) expect(RULE_MAP[id], id).toBeDefined();
  });
});
