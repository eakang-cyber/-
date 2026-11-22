// 중요한 결정 리포트: 결정 종류 · 단계 · 현실 검증 체크리스트 + 월운 대응.
// 사주는 '어떤 주제가 맞물리는 달인가'까지만 말하고, 사라/사지 마라·언제 계약하라는 말은 하지 않는다.
import { GROUP_LABEL, GROUP_OF, ThemeGroup, branchMainStem, tenGod, STEMS, BRANCHES, TEN_GOD_KO } from "@/engine/constants";
import { ChartResult, MonthPeriod, monthPeriods, pillarLabel } from "@/engine/chart";
import { fmtUtcAsKst } from "@/engine/time";
import type { Block } from "./interpret";

export type DecisionType = "realestate" | "business" | "job" | "invest" | "partner";

export interface Phase { id: string; label: string; group: ThemeGroup; why: string; doThis: string }
export interface CheckItem { title: string; detail: string; source?: { name: string; url: string } }

export const DECISION_TYPES: { id: DecisionType; label: string; example: string; keywords: string[] }[] = [
  { id: "realestate", label: "부동산·부지 매입", example: "대전 신탄진에 공장 부지 매입", keywords: ["부지", "땅", "토지", "공장", "아파트", "집", "상가", "건물", "매입", "매수", "분양", "경매", "부동산", "청약"] },
  { id: "business", label: "창업·사업 확장", example: "두 번째 매장 열기", keywords: ["창업", "사업", "매장", "가게", "확장", "법인", "오픈", "출시", "프랜차이즈", "2호점"] },
  { id: "job", label: "이직·퇴사", example: "지금 회사 그만두고 이직", keywords: ["이직", "퇴사", "회사", "직장", "취업", "연봉", "커리어", "전직"] },
  { id: "invest", label: "큰돈 투자·대출", example: "모아 둔 돈으로 투자 시작", keywords: ["투자", "주식", "코인", "펀드", "대출", "적금", "자금", "금리"] },
  { id: "partner", label: "동업·중요 계약", example: "친구와 동업 계약", keywords: ["동업", "계약", "파트너", "공동", "지분", "투자자", "협약", "합작"] },
];

export const PHASES: Record<DecisionType, Phase[]> = {
  realestate: [
    { id: "scan", label: "조사", group: "learn", why: "정보와 문서를 다루는 주제", doThis: "후보지의 용도지역·규제·주변 시세를 모읍니다" },
    { id: "deal", label: "가격 협상", group: "result", why: "재물과 거래를 다루는 주제", doThis: "가격과 조건을 협상하고 자금 계획을 확정합니다" },
    { id: "permit", label: "인허가", group: "structure", why: "관청과 규칙을 다루는 주제", doThis: "공장 설립 승인·건축 인허가 요건을 확인합니다" },
    { id: "sign", label: "계약·등기", group: "learn", why: "문서와 도장을 다루는 주제", doThis: "계약서·등기 서류를 검토하고 서명합니다" },
    { id: "go", label: "착공·이전", group: "create", why: "만들고 실행하는 주제", doThis: "설계·착공·이전 일정을 실행합니다" },
  ],
  business: [
    { id: "scan", label: "시장 검증", group: "learn", why: "정보와 배움의 주제", doThis: "고객·상권·경쟁을 조사합니다" },
    { id: "fund", label: "자금 확보", group: "result", why: "재물과 자원의 주제", doThis: "자금 조달과 비용 구조를 확정합니다" },
    { id: "team", label: "사람·계약", group: "self", why: "동료와 협력의 주제", doThis: "함께할 사람과 역할·몫을 정합니다" },
    { id: "rule", label: "등록·인허가", group: "structure", why: "규칙과 관청의 주제", doThis: "사업자 등록·업종 인허가를 처리합니다" },
    { id: "go", label: "오픈·출시", group: "create", why: "만들고 내보내는 주제", doThis: "제품·매장을 세상에 내놓습니다" },
  ],
  job: [
    { id: "scan", label: "탐색", group: "learn", why: "정보와 배움의 주제", doThis: "회사·직무·시장 정보를 모읍니다" },
    { id: "show", label: "지원·면접", group: "create", why: "드러내고 표현하는 주제", doThis: "이력서와 면접에서 결과물을 보여 줍니다" },
    { id: "deal", label: "조건 협상", group: "result", why: "재물과 조건의 주제", doThis: "연봉·처우를 협상합니다" },
    { id: "move", label: "합류·적응", group: "structure", why: "새 조직의 규칙과 책임의 주제", doThis: "새 조직의 역할과 규칙에 적응합니다" },
  ],
  invest: [
    { id: "scan", label: "조사", group: "learn", why: "정보와 배움의 주제", doThis: "상품 구조·위험·수수료를 공부합니다" },
    { id: "plan", label: "자금 계획", group: "result", why: "재물과 관리의 주제", doThis: "투자금·비상금·상환 계획을 나눕니다" },
    { id: "rule", label: "원칙 세우기", group: "structure", why: "규칙과 절제의 주제", doThis: "손실 한도·점검 주기를 문서로 정합니다" },
    { id: "go", label: "실행·점검", group: "create", why: "실행하는 주제", doThis: "나눠서 실행하고 정해 둔 날에 점검합니다" },
  ],
  partner: [
    { id: "who", label: "상대 검증", group: "self", why: "동료와 경쟁의 주제", doThis: "상대의 이력·재무·평판을 확인합니다" },
    { id: "deal", label: "조건 협상", group: "result", why: "재물과 몫의 주제", doThis: "지분·수익 배분·비용 분담을 정합니다" },
    { id: "sign", label: "계약서", group: "learn", why: "문서와 도장의 주제", doThis: "이탈·분쟁 조항까지 계약서에 담습니다" },
    { id: "run", label: "운영", group: "structure", why: "역할과 책임의 주제", doThis: "정기 점검 회의와 의사결정 규칙을 운영합니다" },
  ],
};

const S = {
  eum: { name: "토지이음", url: "https://www.eum.go.kr" },
  rt: { name: "국토부 실거래가 공개시스템", url: "https://rt.molit.go.kr" },
  factory: { name: "팩토리온(공장설립 온라인지원)", url: "https://www.factoryon.go.kr" },
  iros: { name: "인터넷등기소", url: "https://www.iros.go.kr" },
  seumteo: { name: "세움터(건축 인허가)", url: "https://cloud.eais.go.kr" },
  kosmes: { name: "중소벤처기업진흥공단 정책자금", url: "https://www.kosmes.or.kr" },
  kstartup: { name: "K-Startup", url: "https://www.k-startup.go.kr" },
  sbiz: { name: "소상공인 상권정보", url: "https://sg.sbiz.or.kr" },
  hometax: { name: "홈택스", url: "https://www.hometax.go.kr" },
  work24: { name: "고용24", url: "https://www.work24.go.kr" },
  fine: { name: "금융감독원 파인", url: "https://fine.fss.or.kr" },
  klac: { name: "대한법률구조공단", url: "https://www.klac.or.kr" },
};

export const CHECKLIST: Record<DecisionType, CheckItem[]> = {
  realestate: [
    { title: "용도지역과 규제", detail: "공장을 지을 수 있는 용도지역인지, 개발제한구역·군사시설보호구역 등 규제가 겹치는지 지번으로 확인합니다.", source: S.eum },
    { title: "공장 설립 가능 여부", detail: "업종별로 입지 가능한 지역과 환경 규제가 다릅니다. 업종 코드로 입지 가능 여부를 먼저 조회합니다.", source: S.factory },
    { title: "주변 실거래가 흐름", detail: "같은 지역 공장용지·토지의 최근 2~3년 거래 가격과 거래량을 비교합니다. 호가가 아니라 실거래 기준입니다.", source: S.rt },
    { title: "등기부 권리관계", detail: "근저당·가압류·지상권 등 권리 제한이 있는지 등기부등본으로 확인합니다.", source: S.iros },
    { title: "인허가와 건축 요건", detail: "진입도로 폭, 건폐율·용적률, 오폐수 처리 등 건축 요건을 설계사무소와 함께 점검합니다.", source: S.seumteo },
    { title: "자금과 정책자금", detail: "대출 한도·금리와 함께 시설자금 지원 공고 일정을 확인합니다. 공고 시기가 실제 '시즌'을 좌우하는 경우가 많습니다.", source: S.kosmes },
    { title: "물류·인력", detail: "고속도로 IC까지 거리, 화물차 진출입, 주변 인력 수급과 출퇴근 교통을 현장에서 확인합니다." },
    { title: "세금과 총비용", detail: "취득세·등록세, 개발부담금, 중개·법무 비용까지 포함한 총비용을 세무사와 계산합니다." },
  ],
  business: [
    { title: "고객 검증", detail: "돈을 내겠다는 잠재 고객 10명 이상을 먼저 확인합니다." },
    { title: "상권·경쟁", detail: "유동 인구, 업종별 점포 수와 매출 추정치를 확인합니다.", source: S.sbiz },
    { title: "지원 사업 공고", detail: "창업 지원금·정책자금 공고 일정을 확인합니다. 신청 시기가 정해져 있습니다.", source: S.kstartup },
    { title: "사업자 등록·세금", detail: "업종별 인허가와 부가세·소득세 구조를 확인합니다.", source: S.hometax },
    { title: "고정비와 버틸 기간", detail: "매출이 0이어도 버틸 수 있는 개월 수를 계산합니다." },
    { title: "동업 시 계약", detail: "지분·역할·이탈 조건을 문서로 남깁니다.", source: S.klac },
  ],
  job: [
    { title: "떠나는 이유와 가는 이유", detail: "두 목록을 따로 적고, 가는 이유가 3개 이상인지 확인합니다." },
    { title: "현직자 대화", detail: "목표 회사·직무 현직자 2명 이상과 이야기합니다." },
    { title: "공백 기간 자금", detail: "퇴사 후 이직까지 생활비 몇 개월 분이 있는지 계산합니다." },
    { title: "고용보험·퇴직금", detail: "자발적 퇴사 시 실업급여 대상 여부, 퇴직금 정산 시점을 확인합니다.", source: S.work24 },
    { title: "계약 조항", detail: "경업금지·비밀유지 조항이 다음 직장에 영향을 주는지 확인합니다." },
  ],
  invest: [
    { title: "원금 손실 가능성", detail: "최악의 경우 잃을 수 있는 금액을 숫자로 적고, 감당 가능한지 확인합니다." },
    { title: "상품 비교", detail: "수수료·금리·중도해지 조건을 공식 비교 서비스에서 확인합니다.", source: S.fine },
    { title: "비상금 분리", detail: "생활비 6개월 분은 투자금과 분리합니다." },
    { title: "대출 상환 계획", detail: "금리가 2%p 오를 때 월 상환액을 계산해 봅니다." },
    { title: "유사수신 주의", detail: "원금 보장·고수익을 동시에 약속하면 불법 유사수신을 의심하고 금융감독원에 확인합니다.", source: S.fine },
  ],
  partner: [
    { title: "상대 이력·재무", detail: "법인 등기, 신용, 과거 분쟁 이력을 확인합니다.", source: S.iros },
    { title: "지분과 의사결정", detail: "누가 무엇을 최종 결정하는지 문서로 정합니다." },
    { title: "이탈·분쟁 조항", detail: "한쪽이 나갈 때 지분 처리와 분쟁 해결 방법을 계약서에 넣습니다.", source: S.klac },
    { title: "돈의 흐름", detail: "공동 계좌, 비용 승인 한도, 정산 주기를 정합니다." },
  ],
};

export function guessType(text: string): DecisionType | null {
  let best: { id: DecisionType; n: number } | null = null;
  for (const t of DECISION_TYPES) {
    const n = t.keywords.filter((k) => text.includes(k)).length;
    if (n > 0 && (!best || n > best.n)) best = { id: t.id, n };
  }
  return best?.id ?? null;
}

export interface MonthCell {
  period: MonthPeriod;
  stemGroup: ThemeGroup;
  branchGroup: ThemeGroup;
  label: { hanja: string; ko: string };
  /** 이 달과 주제가 맞물리는 단계 id (강: 천간 일치, 약: 지지 일치) */
  strong: string[];
  weak: string[];
  /** 돈이 오가는 단계에 '나와 동료' 주제가 겹치는 달 — 전통적으로 재물 분산을 경계 */
  moneyCaution: boolean;
}

const MONEY_PHASES = new Set(["deal", "fund", "plan"]);

export function buildMonths(chart: ChartResult, type: DecisionType, from: Date, count: number): MonthCell[] {
  const phases = PHASES[type];
  return monthPeriods(from.getFullYear(), from.getMonth() + 1, count).map((p) => {
    const sg = GROUP_OF[tenGod(chart.dayMaster, p.stem)];
    const bg = GROUP_OF[tenGod(chart.dayMaster, branchMainStem(p.branch))];
    return {
      period: p, stemGroup: sg, branchGroup: bg, label: pillarLabel(p),
      strong: phases.filter((ph) => ph.group === sg).map((ph) => ph.id),
      weak: phases.filter((ph) => ph.group === bg && ph.group !== sg).map((ph) => ph.id),
      moneyCaution: sg === "self" && phases.some((ph) => MONEY_PHASES.has(ph.id)),
    };
  });
}

export function monthBlock(chart: ChartResult, cell: MonthCell, type: DecisionType): Block {
  const phases = PHASES[type];
  const hit = [...cell.strong, ...cell.weak].map((id) => phases.find((p) => p.id === id)!);
  const p = cell.period;
  let body = `이달의 드러나는 주제는 '${GROUP_LABEL[cell.stemGroup]}', 생활 속 장면은 '${GROUP_LABEL[cell.branchGroup]}'입니다.`;
  if (hit.length) body += ` 전통적 의미로는 ${hit.map((h) => `'${h.label}'(${h.why})`).join(", ")} 단계와 주제가 겹치는 달로 읽습니다.`;
  else body += " 이 결정의 어느 단계와도 주제가 직접 겹치지 않는 달입니다. 준비와 점검에 쓰는 달로 볼 수 있습니다.";
  if (cell.moneyCaution) body += " 나와 같은 기운이 드러나는 달이라, 전통 해석은 돈을 두고 나눠 가질 사람·나갈 곳이 함께 생기는 주제로 봅니다. 큰 금액을 움직이기 전 이중 확인을 권합니다.";
  return {
    id: `m-${p.y}-${p.m}`,
    title: `${p.y}년 ${p.m}월 무렵`,
    body,
    ruleIds: ["LUCK-MONTH-001", "DEC-PHASE-001"],
    facts: [
      `월운 ${cell.label.hanja}: ${STEMS[p.stem]} → ${TEN_GOD_KO[tenGod(chart.dayMaster, p.stem)]}, ${BRANCHES[p.branch]} → ${TEN_GOD_KO[tenGod(chart.dayMaster, branchMainStem(p.branch))]}`,
      `기간: ${fmtUtcAsKst(p.startUtcMs).slice(0, 10)} ~ ${fmtUtcAsKst(p.endUtcMs).slice(0, 10)} (절기 기준)`,
    ],
  };
}

/** 단계 순서대로, 주제가 맞물리는 가장 이른 달을 이어 붙인 '예시 흐름'. 일정 추천이 아니다. */
export function buildRoadmap(months: MonthCell[], type: DecisionType) {
  const phases = PHASES[type];
  let cursor = 0;
  return phases.map((ph) => {
    let idx = months.findIndex((m, i) => i >= cursor && m.strong.includes(ph.id));
    let strength: "strong" | "weak" | "none" = "strong";
    if (idx < 0) { idx = months.findIndex((m, i) => i >= cursor && m.weak.includes(ph.id)); strength = "weak"; }
    if (idx < 0) { strength = "none"; return { phase: ph, cell: null as MonthCell | null, strength }; }
    cursor = idx + 1;
    return { phase: ph, cell: months[idx], strength };
  });
}
