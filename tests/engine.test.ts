import { describe, expect, it } from "vitest";
import { Solar } from "lunar-javascript";
import { computeChart, BirthInput, InputError, jieAround } from "@/engine/chart";
import { ganzhiHanja } from "@/engine/constants";
import { localToUtc, tzOffsetMinutes, julianDayNumber } from "@/engine/time";
import { findSolarLongitude, JIE_LONGITUDE } from "@/engine/sun";

// 기준 사례: 가상의 예시 인물(앱의 예시와 동일). 한로(寒露) 입절 1시간 41분 전 출생 — 월 경계 사례.
const base: BirthInput = {
  name: "테스트", calendar: "solar", year: 1992, month: 10, day: 8, isLeapMonth: false,
  timeKnown: true, hour: 8, minute: 10, cityId: "seoul", sex: "female",
};
const p = (c: ReturnType<typeof computeChart>) =>
  [c.pillars.year, c.pillars.month, c.pillars.day, c.pillars.hour].map((x) => (x ? ganzhiHanja(x.stem, x.branch) : "--")).join(" ");

describe("기준 사례 — 1992-10-08 08:10 서울 (가상 인물)", () => {
  it("모든 시간 기준에서 壬申 己酉 丁巳 甲辰", () => {
    for (const timeBasis of ["clock", "lmt", "apparent"] as const) {
      const c = computeChart(base, { timeBasis, ziPolicy: "zi23" });
      expect(p(c)).toBe("壬申 己酉 丁巳 甲辰");
    }
  });
  it("lunar-javascript(UTC+8 벽시계로 변환 입력)와 원국 일치", () => {
    expect(Solar.fromYmdHms(1992, 10, 8, 7, 10, 0).getLunar().getEightChar().toString()).toBe("壬申 己酉 丁巳 甲辰");
  });
  it("시 경계 민감도: 세 기준 모두 같은 시지, 경도 보정 시각 07:37, 경계까지 30분 초과", () => {
    const c = computeChart(base);
    expect(c.hourCheck?.consistent).toBe(true);
    expect([c.basisWall.h, c.basisWall.mi]).toEqual([7, 37]);
    expect(c.hourCheck!.minutesFromBoundary).toBeGreaterThan(30);
  });
  it("월 경계: 한로(10-08 09:51 KST) 직후 출생이면 월주가 庚戌로 바뀐다", () => {
    expect(p(computeChart({ ...base, hour: 10, minute: 0 })).split(" ")[1]).toBe("庚戌");
  });
  it("대운: 양년 여성 → 역행, 백로까지 약 30.6일 → 약 10.2년, 戊申부터", () => {
    const c = computeChart(base);
    expect(c.luck.direction).toBe("backward");
    expect(c.prevJie.nameKo).toBe("백로");
    expect(c.luck.startYears).toBeGreaterThan(10.1);
    expect(c.luck.startYears).toBeLessThan(10.3);
    expect(c.luck.periods.map((x) => ganzhiHanja(x.stem, x.branch)).slice(0, 4)).toEqual(["戊申", "丁未", "丙午", "乙巳"]);
  });
  it("관계: 丁壬합, 甲己합, 巳申합·형, 辰酉합, 辰申·巳酉반합", () => {
    const labels = computeChart(base).relations.map((r) => r.label);
    expect(labels).toEqual(expect.arrayContaining(["丁壬합", "甲己합", "巳申합", "巳申형", "辰酉합", "辰申반합", "巳酉반합"]));
  });
  it("동일 입력·동일 규칙 버전 → 동일 결과(결정론)", () => {
    expect(JSON.stringify(computeChart(base))).toBe(JSON.stringify(computeChart(base)));
  });
});

describe("일주 교차 확인 — JDN 공식 vs lunar-javascript", () => {
  it("1950~2030 사이 400일 표본에서 일치", () => {
    let t = Date.UTC(1950, 0, 1);
    for (let i = 0; i < 400; i++) {
      t += 73 * 86_400_000;
      const d = new Date(t);
      const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
      const idx = (julianDayNumber(y, m, day) + 49) % 60;
      const lib = Solar.fromYmd(y, m, day).getLunar().getDayInGanZhi();
      expect(ganzhiHanja(idx % 10, idx % 12)).toBe(lib);
    }
  });
});

describe("절기 경계", () => {
  it("2025 입춘(2025-02-03 23:10 KST) 전후로 연주·월주가 바뀐다", () => {
    const before = computeChart({ ...base, year: 2025, month: 2, day: 3, hour: 23, minute: 0, timeKnown: true }, { timeBasis: "clock", ziPolicy: "midnight" });
    const after = computeChart({ ...base, year: 2025, month: 2, day: 3, hour: 23, minute: 20, timeKnown: true }, { timeBasis: "clock", ziPolicy: "midnight" });
    expect(ganzhiHanja(before.pillars.year.stem, before.pillars.year.branch)).toBe("甲辰");
    expect(ganzhiHanja(before.pillars.month.stem, before.pillars.month.branch)).toBe("丁丑");
    expect(ganzhiHanja(after.pillars.year.stem, after.pillars.year.branch)).toBe("乙巳");
    expect(ganzhiHanja(after.pillars.month.stem, after.pillars.month.branch)).toBe("戊寅");
  });
  it("lunar-javascript 절기 시각 ↔ 독립 태양황경 근사식이 30분 이내", () => {
    for (const y of [1950, 1975, 1992, 2010, 2026]) {
      for (const [m, d] of [[2, 10], [4, 10], [7, 10], [10, 10], [12, 10]]) {
        const { prev } = jieAround(Date.UTC(y, m - 1, d));
        const indep = findSolarLongitude(JIE_LONGITUDE[prev.name], prev.utcMs);
        expect(Math.abs(indep - prev.utcMs) / 60000).toBeLessThan(30);
      }
    }
  });
});

describe("자시(23시) 정책", () => {
  const late = { ...base, year: 2000, month: 1, day: 1, hour: 23, minute: 40 };
  it("zi23: 다음 날 일주 / midnight: 당일 일주", () => {
    const a = computeChart(late, { timeBasis: "clock", ziPolicy: "zi23" });
    const b = computeChart(late, { timeBasis: "clock", ziPolicy: "midnight" });
    expect(ganzhiHanja(b.pillars.day.stem, b.pillars.day.branch)).toBe("戊午"); // 2000-01-01
    expect(ganzhiHanja(a.pillars.day.stem, a.pillars.day.branch)).toBe("己未");
    expect(a.pillars.hour!.branch).toBe(0);
    expect(b.pillars.hour!.branch).toBe(0);
    expect(a.pillars.hour!.stem).toBe(b.pillars.hour!.stem); // 야자시는 다음 날 기준 시간(時干)
  });
});

describe("역사적 시간대", () => {
  it("1992년은 UTC+9, 서머타임 없음", () => {
    expect(tzOffsetMinutes(Date.UTC(1992, 6, 1))).toBe(540);
  });
  it("1988년 여름 서머타임(UTC+10)", () => {
    expect(tzOffsetMinutes(Date.UTC(1988, 6, 1))).toBe(600);
  });
  it("1955~1961 표준시 UTC+8:30", () => {
    expect(tzOffsetMinutes(Date.UTC(1958, 0, 15))).toBe(510);
  });
  it("서머타임 시작 공백 시각을 감지", () => {
    const r = localToUtc({ y: 1987, m: 5, d: 10, h: 2, mi: 30 });
    expect(r.anomaly).toBe("nonexistent");
  });
});

describe("음력·윤달·입력 검증", () => {
  it("음력 1992-09-13 → 양력 1992-10-08", () => {
    const c = computeChart({ ...base, calendar: "lunar", year: 1992, month: 9, day: 13 });
    expect(c.solarDate).toEqual({ y: 1992, m: 10, d: 8 });
  });
  it("2023 윤2월 1일 → 양력 2023-03-22", () => {
    const c = computeChart({ ...base, calendar: "lunar", year: 2023, month: 2, day: 1, isLeapMonth: true });
    expect(c.solarDate).toEqual({ y: 2023, m: 3, d: 22 });
  });
  it("윤달이 없는 해의 윤달 입력은 오류", () => {
    expect(() => computeChart({ ...base, calendar: "lunar", year: 2022, month: 3, day: 1, isLeapMonth: true })).toThrow(InputError);
  });
  it("존재하지 않는 날짜는 오류", () => {
    expect(() => computeChart({ ...base, month: 2, day: 30 })).toThrow(InputError);
  });
  it("출생시간 미상: 시주 없음 + 경고", () => {
    const c = computeChart({ ...base, timeKnown: false });
    expect(c.pillars.hour).toBeNull();
    expect(c.warnings.join()).toContain("출생시간");
  });
  it("성별 미선택: 대운 방향 미정", () => {
    expect(computeChart({ ...base, sex: "unspecified" }).luck.direction).toBeNull();
  });
});

describe("월운", () => {
  it("lunar-javascript 월간지와 2000~2030 각 달 일치", async () => {
    const { monthPeriods } = await import("@/engine/chart");
    const ms = monthPeriods(2000, 1, 12 * 31);
    for (const p of ms) {
      const lib = Solar.fromYmdHms(p.y, p.m, 20, 12, 0, 0).getLunar().getMonthInGanZhiExact();
      expect(ganzhiHanja(p.stem, p.branch)).toBe(lib);
    }
  });
  it("2026년 3월 = 辛卯, 2027년 1월 = 辛丑(입춘 전이라 전년 기준)", async () => {
    const { monthPeriods } = await import("@/engine/chart");
    const [mar] = monthPeriods(2026, 3, 1);
    const [jan] = monthPeriods(2027, 1, 1);
    expect(ganzhiHanja(mar.stem, mar.branch)).toBe("辛卯");
    expect(ganzhiHanja(jan.stem, jan.branch)).toBe("辛丑");
  });
});
