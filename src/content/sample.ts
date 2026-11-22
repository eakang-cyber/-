// 데모 데이터. 화면에는 항상 '예시'로 표시한다.
// 실존 인물의 정보를 쓰지 않는다. 아래 예시 인물·기록은 모두 가상이다.
// 사용자가 자기 정보를 입력하면 예시 기록은 지워지고(store.setProfile) 그 사람의 계산으로 바뀐다.
import type { BirthInput } from "@/engine/chart";

export const SAMPLE_PROFILE: BirthInput = {
  name: "예시 인물",
  calendar: "solar",
  year: 1992, month: 10, day: 8,
  isLeapMonth: false,
  timeKnown: true, hour: 8, minute: 10,
  cityId: "seoul",
  sex: "female",
};

export const SAMPLE_PARTNER: BirthInput = {
  name: "상대 A",
  calendar: "solar",
  year: 1997, month: 8, day: 14,
  isLeapMonth: false,
  timeKnown: true, hour: 14, minute: 30,
  cityId: "busan",
  sex: "female",
};

export type RecordType = "event" | "goal" | "question" | "review";
export const RECORD_TYPE_LABEL: Record<RecordType, string> = {
  event: "인생 사건", goal: "목표", question: "질문", review: "회고",
};

export interface ArchiveRecord {
  id: string;
  type: RecordType;
  year: number;
  month: number | null;
  title: string;
  note: string;
  sample: boolean;
}

export const SAMPLE_RECORDS: ArchiveRecord[] = [
  { id: "s1", type: "event", year: 2015, month: 3, title: "첫 독립 생활 시작", note: "가족과 떨어져 혼자 생활을 꾸리기 시작함.", sample: true },
  { id: "s2", type: "event", year: 2019, month: 9, title: "첫 정규직 업무 시작", note: "처음으로 고정 수입이 생김. 생활 리듬이 크게 바뀜.", sample: true },
  { id: "s3", type: "event", year: 2023, month: 5, title: "팀 이동", note: "새로운 사람들과 일하는 방식을 다시 배움.", sample: true },
  { id: "s4", type: "review", year: 2025, month: 12, title: "2025 회고", note: "하고 싶은 것은 많았지만 끝까지 낸 결과물은 적었다. 내년에는 작게라도 내보내기.", sample: true },
  { id: "s5", type: "goal", year: 2026, month: null, title: "개인 프로젝트 하나 공개하기", note: "완성도보다 공개를 우선. 3개월 단위로 점검.", sample: true },
  { id: "s6", type: "review", year: 2026, month: 6, title: "2026 상반기 회고", note: "두 번 공개했고, 한 번은 반응이 있었다. 돈 관리 기준은 아직 없다.", sample: true },
  { id: "s7", type: "question", year: 2026, month: 10, title: "지금 일을 유지하면서 준비할 수 있을까?", note: "선택 실험실에서 비교해 보기.", sample: true },
];

export interface ChoiceOption {
  label: string;
  pros: string;
  risks: string;
  prep: string;
}
export interface ChoiceInput {
  question: string;
  a: ChoiceOption;
  b: ChoiceOption;
  goals: string;
  constraints: string;
  /** 사용자가 직접 매기는 중요도(0~4) — 운세 점수가 아님 */
  weights: { money: number; growth: number; stability: number; time: number };
  /** 사용자가 직접 매기는 선택지 평가(0~4) */
  ratings: { a: Record<string, number>; b: Record<string, number> };
}

export const SAMPLE_CHOICE: ChoiceInput = {
  question: "현재 직장을 유지할까, 창업을 준비할까?",
  a: {
    label: "직장 유지하며 준비",
    pros: "고정 수입 유지, 실패 비용이 낮음, 업무 중 배울 거리가 아직 있음",
    risks: "준비 시간이 부족해 계속 미뤄질 수 있음",
    prep: "주 6시간 준비 시간 확보, 6개월 뒤 점검 날짜 정하기",
  },
  b: {
    label: "퇴사 후 창업 준비",
    pros: "몰입 시간이 크게 늘어남, 빠른 실험 가능",
    risks: "수입 공백, 생활비 압박으로 판단이 조급해질 수 있음",
    prep: "생활비 12개월 분 확보, 첫 고객 10명 인터뷰",
  },
  goals: "3년 안에 내가 만든 것으로 생활비의 절반을 버는 것",
  constraints: "월 고정비 180만 원, 모아 둔 돈은 생활비 8개월 분",
  weights: { money: 3, growth: 4, stability: 3, time: 2 },
  ratings: {
    a: { money: 3, growth: 2, stability: 4, time: 1 },
    b: { money: 1, growth: 4, stability: 1, time: 4 },
  },
};
