"use client";
// 앱 상태. Phase 1 에서는 서버에 아무것도 보내지 않는다.
// 기본은 '메모리 전용'(새로고침 시 삭제). 사용자가 고르면 이 브라우저 탭(sessionStorage)에만 임시 보관.
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { BirthInput, CalcPolicy, DEFAULT_POLICY, computeChart, ChartResult } from "@/engine/chart";
import type { Interest } from "@/rules/content";
import { SAMPLE_PARTNER, SAMPLE_PROFILE, SAMPLE_RECORDS, SAMPLE_CHOICE, ArchiveRecord, ChoiceInput } from "@/content/sample";

export type RelationType = "연인·배우자" | "친구" | "동료" | "가족";
export type SaveMode = "memory" | "session";

export interface PersonalQuestion { id: string; q: string; createdAt: string }

export interface State {
  profile: BirthInput | null;
  profileIsSample: boolean;
  policy: CalcPolicy;
  partner: BirthInput;
  partnerIsSample: boolean;
  partnerConsent: boolean;
  relationType: RelationType;
  interest: Interest;
  premium: boolean; // 데모 결제 여부
  records: ArchiveRecord[];
  questions: PersonalQuestion[];
  choice: ChoiceInput;
  saveMode: SaveMode;
  /** 베타 테스트 행동 신호 — 출생 정보·이름은 담지 않는다 */
  beta: { visited: string[]; purchaseClicked: boolean };
}

const initial: State = {
  profile: null,
  profileIsSample: true,
  policy: DEFAULT_POLICY,
  partner: SAMPLE_PARTNER,
  partnerIsSample: true,
  partnerConsent: false,
  relationType: "연인·배우자",
  interest: "직장",
  premium: false,
  records: SAMPLE_RECORDS,
  questions: [],
  choice: SAMPLE_CHOICE,
  saveMode: "memory",
  beta: { visited: [], purchaseClicked: false },
};

type Action =
  | { type: "setProfile"; profile: BirthInput; isSample: boolean }
  | { type: "setPolicy"; policy: CalcPolicy }
  | { type: "setPartner"; partner: BirthInput; isSample: boolean }
  | { type: "setConsent"; value: boolean }
  | { type: "setRelationType"; value: RelationType }
  | { type: "setInterest"; value: Interest }
  | { type: "setPremium"; value: boolean }
  | { type: "upsertRecord"; record: ArchiveRecord }
  | { type: "deleteRecord"; id: string }
  | { type: "clearRecords" }
  | { type: "addQuestion"; q: PersonalQuestion }
  | { type: "deleteQuestion"; id: string }
  | { type: "setChoice"; choice: ChoiceInput }
  | { type: "setSaveMode"; value: SaveMode }
  | { type: "visit"; route: string }
  | { type: "betaPurchaseClick" }
  | { type: "resetAll" }
  | { type: "hydrate"; state: State };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    // 내 정보를 넣으면 예시 기록은 지운다(다른 사람의 예시가 내 아카이브에 섞이지 않도록)
    case "setProfile": return { ...s, profile: a.profile, profileIsSample: a.isSample, records: a.isSample ? s.records : s.records.filter((r) => !r.sample) };
    case "setPolicy": return { ...s, policy: a.policy };
    case "setPartner": return { ...s, partner: a.partner, partnerIsSample: a.isSample };
    case "setConsent": return { ...s, partnerConsent: a.value };
    case "setRelationType": return { ...s, relationType: a.value };
    case "setInterest": return { ...s, interest: a.value };
    case "setPremium": return { ...s, premium: a.value };
    case "upsertRecord": {
      const exists = s.records.some((r) => r.id === a.record.id);
      return { ...s, records: exists ? s.records.map((r) => (r.id === a.record.id ? a.record : r)) : [a.record, ...s.records] };
    }
    case "deleteRecord": return { ...s, records: s.records.filter((r) => r.id !== a.id) };
    case "clearRecords": return { ...s, records: [] };
    case "addQuestion": return { ...s, questions: [...s.questions, a.q] };
    case "deleteQuestion": return { ...s, questions: s.questions.filter((q) => q.id !== a.id) };
    case "setChoice": return { ...s, choice: a.choice };
    case "setSaveMode": return { ...s, saveMode: a.value };
    case "visit": return s.beta.visited.includes(a.route) ? s : { ...s, beta: { ...s.beta, visited: [...s.beta.visited, a.route] } };
    case "betaPurchaseClick": return { ...s, beta: { ...s.beta, purchaseClicked: true } };
    case "resetAll": return { ...initial };
    case "hydrate": return a.state;
  }
}

const STORAGE_KEY = "destiny-os-demo-v1";

interface Ctx {
  state: State;
  dispatch: React.Dispatch<Action>;
  chart: ChartResult;
  /** 사용자가 입력한 프로필이 없으면 가상의 예시 인물 */
  subject: BirthInput;
  partnerChart: ChartResult | null;
  partnerError: string | null;
  toast: (msg: string) => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children, onToast }: { children: React.ReactNode; onToast: (m: string) => void }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "hydrate", state: { ...initial, ...JSON.parse(raw) } });
    } catch { /* 저장소 차단 환경에서도 정상 동작 */ }
  }, []);

  useEffect(() => {
    try {
      if (state.saveMode === "session") sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch { /* noop */ }
  }, [state]);

  const subject = state.profile ?? SAMPLE_PROFILE;
  const chart = useMemo(() => computeChart(subject, state.policy), [subject, state.policy]);
  const partnerResult = useMemo(() => {
    try { return { chart: computeChart(state.partner, state.policy), error: null }; }
    catch (e) { return { chart: null, error: (e as Error).message }; }
  }, [state.partner, state.policy]);
  const toast = useCallback((m: string) => onToast(m), [onToast]);

  const value = useMemo<Ctx>(() => ({
    state, dispatch, chart, subject, partnerChart: partnerResult.chart, partnerError: partnerResult.error, toast,
  }), [state, chart, subject, partnerResult, toast]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}

export const displayName = (s: State, subject: BirthInput) => subject.name || (s.profileIsSample ? "예시 인물" : "나");
