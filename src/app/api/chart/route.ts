// 서버 측 계산 API (Phase 3 연동 대비). 출생정보는 로그에 남기지 않는다.
import { NextResponse } from "next/server";
import { BirthInput, CalcPolicy, DEFAULT_POLICY, InputError, computeChart } from "@/engine/chart";
import { RULES_VERSION } from "@/rules/registry";

export const runtime = "nodejs";

function parse(body: unknown): { input: BirthInput; policy: CalcPolicy } {
  const b = body as Partial<BirthInput> & { policy?: Partial<CalcPolicy> };
  const num = (v: unknown, lo: number, hi: number) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < lo || n > hi) throw new InputError("입력 형식이 올바르지 않습니다.");
    return n;
  };
  const input: BirthInput = {
    name: "",
    calendar: b.calendar === "lunar" ? "lunar" : "solar",
    year: num(b.year, 1901, 2050), month: num(b.month, 1, 12), day: num(b.day, 1, 31),
    isLeapMonth: !!b.isLeapMonth,
    timeKnown: b.timeKnown !== false,
    hour: b.timeKnown === false ? 12 : num(b.hour, 0, 23),
    minute: b.timeKnown === false ? 0 : num(b.minute, 0, 59),
    cityId: typeof b.cityId === "string" ? b.cityId.slice(0, 24) : "seoul",
    sex: b.sex === "male" || b.sex === "female" ? b.sex : "unspecified",
  };
  const policy: CalcPolicy = {
    timeBasis: b.policy?.timeBasis === "clock" || b.policy?.timeBasis === "apparent" ? b.policy.timeBasis : DEFAULT_POLICY.timeBasis,
    ziPolicy: b.policy?.ziPolicy === "midnight" ? "midnight" : DEFAULT_POLICY.ziPolicy,
  };
  return { input, policy };
}

export async function POST(req: Request) {
  try {
    const { input, policy } = parse(await req.json());
    const chart = computeChart(input, policy);
    // 이름은 서버로 받지 않는다(빈 문자열 고정). 응답에도 원본 입력은 최소화.
    const { input: _omit, ...rest } = chart;
    void _omit;
    return NextResponse.json({ rulesVersion: RULES_VERSION, chart: rest }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof InputError ? e.message : "계산할 수 없습니다.";
    return NextResponse.json({ error: msg }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
