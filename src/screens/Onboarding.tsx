"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/state/store";
import { useRouter } from "@/ui/router";
import { Badge, Button, Field, Notice, Segmented, cx, inputCls } from "@/ui/kit";
import { BirthInput, InputError, computeChart, lunarToSolar } from "@/engine/chart";
import { CITIES, cityById } from "@/engine/cities";
import { isValidSolarDate, fmtWall, pad2 } from "@/engine/time";
import { BRANCHES_KO, ELEMENT_KO, STEMS_KO, stemElement, branchElement } from "@/engine/constants";
import { Icon } from "@/ui/icons";

const STEPS = ["이름", "생년월일", "출생시간", "출생 도시", "계산 기준", "확인"] as const;

type Draft = {
  name: string; calendar: "solar" | "lunar"; isLeapMonth: boolean;
  year: string; month: string; day: string;
  timeKnown: boolean; time: string; cityId: string; sex: BirthInput["sex"];
};

const empty: Draft = { name: "", calendar: "solar", isLeapMonth: false, year: "", month: "", day: "", timeKnown: true, time: "", cityId: "seoul", sex: "unspecified" };
const fromInput = (b: BirthInput): Draft => ({
  name: b.name, calendar: b.calendar, isLeapMonth: b.isLeapMonth, year: String(b.year), month: String(b.month), day: String(b.day),
  timeKnown: b.timeKnown, time: b.timeKnown ? `${pad2(b.hour)}:${pad2(b.minute)}` : "", cityId: b.cityId, sex: b.sex,
});

function toInput(d: Draft): BirthInput {
  const [h, m] = d.time.split(":").map(Number);
  return {
    name: d.name.trim(), calendar: d.calendar, isLeapMonth: d.calendar === "lunar" && d.isLeapMonth,
    year: Number(d.year), month: Number(d.month), day: Number(d.day),
    timeKnown: d.timeKnown, hour: d.timeKnown ? h : 12, minute: d.timeKnown ? m : 0, cityId: d.cityId, sex: d.sex,
  };
}

function dateError(d: Draft): string | null {
  const y = Number(d.year), m = Number(d.month), day = Number(d.day);
  if (!d.year || !d.month || !d.day) return "연, 월, 일을 모두 입력해 주세요.";
  if (!Number.isInteger(y) || y < 1901 || y > 2050) return "1901년부터 2050년 사이로 입력해 주세요.";
  if (d.calendar === "solar") {
    if (!isValidSolarDate(y, m, day)) return `${y}년 ${m}월 ${day}일은 달력에 없는 날짜입니다.`;
    if (Date.UTC(y, m - 1, day) > Date.now()) return "미래 날짜는 입력할 수 없습니다.";
  } else {
    try { lunarToSolar(y, m, day, d.isLeapMonth); } catch (e) { return (e as Error).message; }
  }
  return null;
}

export function Onboarding() {
  const { state, dispatch, toast } = useStore();
  const { go } = useRouter();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(() => (state.profile ? fromInput(state.profile) : empty));
  const [touched, setTouched] = useState(false);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  const dErr = dateError(d);
  const tErr = d.timeKnown && !/^\d{2}:\d{2}$/.test(d.time) ? "태어난 시각을 입력하거나 '모름'을 선택해 주세요." : null;
  const stepError = [
    d.name.trim().length === 0 ? "이름이나 닉네임을 입력해 주세요." : d.name.trim().length > 20 ? "20자 이내로 입력해 주세요." : null,
    dErr, tErr, null, null, null,
  ][step];

  const preview = useMemo(() => {
    if (dErr || tErr) return null;
    try { return { chart: computeChart(toInput(d), state.policy), error: null }; }
    catch (e) { return { chart: null, error: e instanceof InputError ? e.message : "계산 중 문제가 발생했습니다." }; }
  }, [d, dErr, tErr, state.policy]);

  const next = () => {
    setTouched(true);
    if (stepError) return;
    setTouched(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => (step === 0 ? go("landing") : setStep((s) => s - 1));
  const finish = () => {
    if (!preview?.chart) return;
    const input = toInput(d);
    dispatch({ type: "setProfile", profile: input, isSample: false });
    toast("계산을 마쳤습니다");
    go("me");
  };

  return (
    <div className="gutter mx-auto max-w-[34rem] pt-6 pb-40 flex flex-col gap-7">
      {/* 진행 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-[0.8rem] text-faint">
          <span className="tabular">{step + 1} / {STEPS.length} · {STEPS[step]}</span>
          <button onClick={() => go("me")} className="text-mist hover:text-gold cursor-pointer">예시로 먼저 둘러보기</button>
        </div>
        <div className="flex gap-1" aria-hidden>
          {STEPS.map((s, i) => <span key={s} className={cx("h-1 flex-1 rounded-full", i <= step ? "bg-gold" : "bg-line")} />)}
        </div>
      </div>

      {step === 0 && (
        <section className="flex flex-col gap-6">
          <h1 className="font-display text-[1.6rem] font-semibold leading-snug">어떻게 불러 드릴까요?</h1>
          <Field label="이름 또는 닉네임" htmlFor="ob-name" hint="실명이 아니어도 됩니다. 계산에는 쓰이지 않고 화면 표시에만 씁니다." error={touched ? stepError : null}>
            <input id="ob-name" className={inputCls} value={d.name} maxLength={20} autoComplete="nickname" placeholder="예: 윤규" onChange={(e) => set({ name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && next()} />
          </Field>
          <Field label="입력 정보 보관 방식" hint="어느 쪽이든 서버로 전송되지 않습니다.">
            <Segmented label="보관 방식" value={state.saveMode} onChange={(v) => dispatch({ type: "setSaveMode", value: v })}
              options={[{ value: "memory", label: "저장하지 않고 체험" }, { value: "session", label: "이 탭에만 임시 보관" }]} />
          </Field>
        </section>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-6">
          <h1 className="font-display text-[1.6rem] font-semibold leading-snug">태어난 날을 알려 주세요</h1>
          <Field label="달력">
            <Segmented label="달력 종류" value={d.calendar} onChange={(v) => set({ calendar: v, isLeapMonth: false })}
              options={[{ value: "solar", label: "양력" }, { value: "lunar", label: "음력" }]} />
          </Field>
          <Field label="생년월일" error={touched || (d.year && d.month && d.day) ? dErr : null}
            hint={d.calendar === "lunar" ? "음력은 계산 라이브러리 기준으로 양력으로 바꿉니다. 한국 음력과 드물게 하루 차이가 날 수 있어 '미검증'으로 표시합니다." : "1901년부터 2050년까지 계산할 수 있습니다."}>
            <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-2">
              <input aria-label="연도" className={inputCls} inputMode="numeric" placeholder="1990" maxLength={4} value={d.year} onChange={(e) => set({ year: e.target.value.replace(/\D/g, "") })} />
              <input aria-label="월" className={inputCls} inputMode="numeric" placeholder="월" maxLength={2} value={d.month} onChange={(e) => set({ month: e.target.value.replace(/\D/g, "") })} />
              <input aria-label="일" className={inputCls} inputMode="numeric" placeholder="일" maxLength={2} value={d.day} onChange={(e) => set({ day: e.target.value.replace(/\D/g, "") })} />
            </div>
          </Field>
          {d.calendar === "lunar" && (
            <label className="flex items-center gap-3 text-[0.92rem] text-ivory cursor-pointer">
              <input type="checkbox" className="h-5 w-5 accent-[#dcc18d]" checked={d.isLeapMonth} onChange={(e) => set({ isLeapMonth: e.target.checked })} />
              윤달에 태어났어요
            </label>
          )}
          {!dErr && d.calendar === "lunar" && (() => {
            const s = lunarToSolar(Number(d.year), Number(d.month), Number(d.day), d.isLeapMonth);
            return <Notice>양력으로는 <b className="text-ivory tabular">{s.y}년 {s.m}월 {s.d}일</b>입니다.</Notice>;
          })()}
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-6">
          <h1 className="font-display text-[1.6rem] font-semibold leading-snug">태어난 시각을 알고 계신가요?</h1>
          <Segmented label="출생시간" value={d.timeKnown ? "known" : "unknown"} onChange={(v) => set({ timeKnown: v === "known" })}
            options={[{ value: "known", label: "알고 있어요" }, { value: "unknown", label: "모르겠어요" }]} />
          {d.timeKnown ? (
            <Field label="출생 시각(24시간)" htmlFor="ob-time" error={touched ? tErr : null} hint="출생증명서나 산모수첩의 시각을 그대로 입력하세요. 경도·서머타임 보정은 자동으로 합니다.">
              <input id="ob-time" type="time" className={inputCls} value={d.time} onChange={(e) => set({ time: e.target.value })} />
            </Field>
          ) : (
            <Notice tone="warn" title="출생시간을 모르면 이렇게 달라집니다">
              여덟 글자 중 태어난 시의 두 글자를 계산하지 않습니다. 미래 계획·결과물 자리의 해석과 일부 관계 해석이 빠지고, 10년 흐름의 시작 시기는 정오 기준 근사값이 됩니다. 나머지 여섯 글자의 해석은 그대로 제공합니다.
            </Notice>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-6">
          <h1 className="font-display text-[1.6rem] font-semibold leading-snug">어느 도시에서 태어나셨나요?</h1>
          <Field label="출생 도시" htmlFor="ob-city" hint="도시는 시간 보정(경도)에만 쓰입니다. 정확한 주소는 묻지 않습니다.">
            <select id="ob-city" className={inputCls} value={d.cityId} onChange={(e) => set({ cityId: e.target.value })}>
              {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Notice>
            한국 표준시는 동경 135도 기준이지만 {cityById(d.cityId).name}은 동경 {cityById(d.cityId).lon}도입니다. 해가 실제로 가장 높이 뜨는 시각과 약 <b className="text-ivory tabular">{Math.round((135 - cityById(d.cityId).lon) * 4)}분</b> 차이가 나며, 이 차이를 보정할지는 다음 단계에서 고를 수 있습니다. 현재 해외 출생은 지원하지 않습니다.
          </Notice>
        </section>
      )}

      {step === 4 && (
        <section className="flex flex-col gap-6">
          <h1 className="font-display text-[1.6rem] font-semibold leading-snug">성별과 계산 기준</h1>
          <Field label="성별(선택)" hint="전통 계산에서 성별은 10년 흐름(대운)이 앞으로 흐르는지 거꾸로 흐르는지를 정할 때만 쓰입니다. 성격 해석에는 쓰지 않습니다. 선택하지 않으면 10년 흐름 방향을 확정하지 않고 표시합니다.">
            <Segmented label="성별" value={d.sex} onChange={(v) => set({ sex: v })}
              options={[{ value: "male", label: "남성" }, { value: "female", label: "여성" }, { value: "unspecified", label: "선택하지 않음" }]} />
          </Field>
          <Field label="시간 기준" hint="학파와 서비스마다 기준이 다릅니다. 기본값은 경도 보정입니다. 나중에 '계산 기준' 화면에서 바꿔 비교할 수 있습니다.">
            <Segmented label="시간 기준" size="sm" value={state.policy.timeBasis} onChange={(v) => dispatch({ type: "setPolicy", policy: { ...state.policy, timeBasis: v } })}
              options={[{ value: "lmt", label: "경도 보정(기본)" }, { value: "apparent", label: "진태양시" }, { value: "clock", label: "표준시 그대로" }]} />
          </Field>
          <Field label="밤 11시~자정 출생일 때 날짜 기준">
            <Segmented label="자시 기준" size="sm" value={state.policy.ziPolicy} onChange={(v) => dispatch({ type: "setPolicy", policy: { ...state.policy, ziPolicy: v } })}
              options={[{ value: "zi23", label: "밤 11시에 날짜 변경(기본)" }, { value: "midnight", label: "자정에 날짜 변경" }]} />
          </Field>
        </section>
      )}

      {step === 5 && (
        <section className="flex flex-col gap-6">
          <h1 className="font-display text-[1.6rem] font-semibold leading-snug">이 정보로 계산할까요?</h1>
          <dl className="rounded-2xl border border-line/70 bg-deep divide-y divide-line/60 text-[0.92rem]">
            {[
              ["이름", d.name || "—", 0],
              ["생년월일", `${d.calendar === "lunar" ? "음력 " + (d.isLeapMonth ? "윤" : "") : "양력 "}${d.year}.${pad2(Number(d.month))}.${pad2(Number(d.day))}`, 1],
              ["출생시간", d.timeKnown ? d.time : "모름", 2],
              ["출생 도시", cityById(d.cityId).name, 3],
              ["성별", d.sex === "male" ? "남성" : d.sex === "female" ? "여성" : "선택하지 않음", 4],
            ].map(([k, v, s]) => (
              <div key={k as string} className="flex items-center px-4 h-12">
                <dt className="w-24 text-faint">{k}</dt>
                <dd className="flex-1 text-ivory tabular">{v}</dd>
                <button className="text-[0.8rem] text-mist hover:text-gold cursor-pointer" onClick={() => setStep(s as number)}>수정</button>
              </div>
            ))}
          </dl>

          {preview?.error && <Notice tone="warn" title="계산할 수 없습니다">{preview.error}</Notice>}
          {preview?.chart && (() => {
            const c = preview.chart;
            const ps = [c.pillars.hour, c.pillars.day, c.pillars.month, c.pillars.year];
            const pos = ["시", "일", "월", "년"];
            return (
              <div className="rounded-2xl border border-line/70 bg-deep p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2"><Badge layer="calc" /><Badge layer="unverified" /><span className="text-[0.78rem] text-faint">계산 미리보기</span></div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {ps.map((p, i) => (
                    <div key={i} className="rounded-xl bg-night/70 border border-line/60 py-3">
                      <p className="text-[0.72rem] text-faint">태어난 {pos[i]}</p>
                      {p ? (
                        <>
                          <p className="mt-1 font-display text-[1.25rem] text-ivory">{STEMS_KO[p.stem]}{BRANCHES_KO[p.branch]}</p>
                          <p className="text-[0.7rem] text-mist">{ELEMENT_KO[stemElement(p.stem)]}·{ELEMENT_KO[branchElement(p.branch)]}</p>
                        </>
                      ) : <p className="mt-2 text-[0.8rem] text-faint">미상</p>}
                    </div>
                  ))}
                </div>
                <p className="text-[0.82rem] text-mist leading-relaxed">
                  보정한 시각 <b className="text-ivory tabular">{fmtWall(c.basisWall)}</b>
                  {c.hourCheck && (c.hourCheck.consistent
                    ? " · 세 가지 시간 기준 모두 같은 시로 계산됩니다."
                    : " · 시간 기준에 따라 태어난 시가 달라집니다. 계산 기준 화면에서 비교해 보세요.")}
                </p>
                {c.warnings.length > 0 && <ul className="text-[0.8rem] text-warn/90 flex flex-col gap-1">{c.warnings.map((w) => <li key={w}>· {w}</li>)}</ul>}
              </div>
            );
          })()}
          <p className="text-[0.8rem] text-faint leading-relaxed">입력 정보는 이 브라우저 밖으로 나가지 않습니다. {state.saveMode === "memory" ? "새로고침하면 사라집니다." : "이 탭을 닫으면 사라집니다."}</p>
        </section>
      )}

      {/* 하단 고정 버튼(한 손 조작) */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-night/95 backdrop-blur border-t border-line/60 safe-bottom">
        <div className="gutter mx-auto max-w-[34rem] pt-3 flex gap-3">
          <Button variant="ghost" onClick={back} aria-label="이전"><Icon.back /></Button>
          {step < STEPS.length - 1
            ? <Button className="flex-1" onClick={next} disabled={touched && !!stepError}>다음</Button>
            : <Button className="flex-1" onClick={finish} disabled={!preview?.chart}>내 인생 탐험 시작</Button>}
        </div>
      </div>
    </div>
  );
}
