// 전통 해석 규칙 레지스트리.
// 원칙: 출처를 지어내지 않는다. 고전은 '어떤 관점(학파)에 기대는가'만 기록하고,
// 원문 위치(source_location)는 검수자가 원문·번역본(저작권 확인 후)에서 확인하기 전까지 null 로 둔다.

export type ReviewStatus = "draft" | "in_review" | "approved";

export interface RuleRecord {
  rule_id: string;
  rule_name: string;
  source_title: string;
  source_location: string | null;
  school: string;
  conditions: string;
  interpretation: string;
  alternative_interpretations: string[];
  conflicts: string[];
  review_status: ReviewStatus;
  confidence_in_source: "unknown" | "low" | "medium" | "high";
  last_reviewed_at: string | null;
  version: string;
}

const V = "rules-2026.11-draft1";

const r = (x: Omit<RuleRecord, "review_status" | "confidence_in_source" | "last_reviewed_at" | "version" | "source_location"> & Partial<RuleRecord>): RuleRecord => ({
  review_status: "draft",
  confidence_in_source: "unknown",
  last_reviewed_at: null,
  source_location: null,
  version: V,
  ...x,
});

export const RULES: RuleRecord[] = [
  r({
    rule_id: "DM-IMAGE-001",
    rule_name: "일간 물상(物象) 비유",
    source_title: "적천수",
    school: "물상론 · 일간 중심",
    conditions: "일간(태어난 날의 천간)에 따라 10가지 자연물 비유를 적용",
    interpretation: "태어난 날의 첫 글자를 '나'로 보고 자연물에 빗대어 기본 기질을 설명한다.",
    alternative_interpretations: ["물상 비유는 설명 장치일 뿐, 실제 판단은 전체 구조(강약·계절)로 해야 한다는 관점"],
    conflicts: ["고전마다 비유의 세부 표현이 다름 — 원문 대조 필요"],
  }),
  r({
    rule_id: "STRUCT-MONTH-001",
    rule_name: "월지 중심 구조(격국) 판단",
    source_title: "자평진전",
    school: "자평 · 격국론",
    conditions: "태어난 달 지지의 본기 십성으로 사회적 환경의 중심 주제를 정한다",
    interpretation: "태어난 달 자리는 일과 사회 활동의 환경으로 읽는다. 그 자리의 기운이 삶의 기본 무대가 된다.",
    alternative_interpretations: ["월지에서 투출(천간에 드러남)한 글자를 우선해야 한다는 견해", "격국보다 일간 강약(억부)을 먼저 보아야 한다는 견해"],
    conflicts: ["격 성립 조건(투출·회합)에 대한 학파 간 차이"],
  }),
  r({
    rule_id: "COUNT-GROUP-001",
    rule_name: "십성 분포에 따른 주된 주제",
    source_title: "연해자평",
    school: "자평 · 십성 통변",
    conditions: "일간 기준 7글자(지지는 본기)의 십성을 5개 주제군으로 묶어 가장 많은 주제를 찾는다",
    interpretation: "자주 드러나는 주제일수록 삶에서 반복해서 마주치는 장면으로 읽는다.",
    alternative_interpretations: ["개수보다 위치(월령)·세력(통근)이 중요하다는 견해", "지장간 전체를 가중치로 계산해야 한다는 견해"],
    conflicts: ["단순 개수 집계는 전통적 판단 방식이 아님 — 설명 보조용으로만 사용"],
    confidence_in_source: "low",
  }),
  r({
    rule_id: "COUNT-ABSENT-001",
    rule_name: "드러나지 않은 주제",
    source_title: "연해자평",
    school: "자평 · 십성 통변",
    conditions: "천간과 지지 본기에 특정 주제군이 0개",
    interpretation: "겉으로 드러나지 않은 주제는 스스로 의식해서 채우는 영역으로 읽는다.",
    alternative_interpretations: ["지장간에 있으면 약하게 작용한다고 보는 견해", "없는 것을 결핍이 아니라 자유로움으로 보는 견해"],
    conflicts: ["'없음'을 부정적으로 단정하는 해석은 사용하지 않음(운명OS 편집 원칙)"],
  }),
  r({
    rule_id: "PAT-SIKSANG-JAE-001",
    rule_name: "만든 것이 결과로 이어지는 흐름(식상생재)",
    source_title: "자평진전",
    school: "자평 · 격국론",
    conditions: "식상(표현·생산)과 재성(현실·성과)이 모두 있고, 재성이 2개 이상",
    interpretation: "만들어 낸 것(기술·작업·아이디어)이 현실의 결과(성과·재물)로 이어지는 흐름으로 읽는다.",
    alternative_interpretations: ["일간이 약하면 이 흐름이 오히려 부담이 된다고 보는 견해(억부)"],
    conflicts: ["일간 강약 판단이 학파별로 갈려 결론이 달라질 수 있음"],
  }),
  r({
    rule_id: "PAT-IN-SIK-001",
    rule_name: "배움과 표현의 순서 다툼(편인과 식신)",
    source_title: "자평진전",
    school: "자평 · 격국론",
    conditions: "편인이 천간에 있고 식신이 같은 기둥 또는 월지에 있음",
    interpretation: "깊이 이해하려는 힘과 바로 만들어 내려는 힘이 순서를 다투는 구조로 읽는다.",
    alternative_interpretations: ["편인이 다른 글자와 합으로 묶이면 작용이 약해진다고 보는 견해", "재성이 편인을 제어하면 문제가 되지 않는다는 견해"],
    conflicts: ["전통 명칭(효신탈식)은 부정적 뉘앙스가 강해 사용자 화면에 쓰지 않음"],
  }),
  r({
    rule_id: "PAT-OPPOSE-001",
    rule_name: "마주 선 두 기운(수화 대치 등)",
    source_title: "궁통보감",
    school: "조후론",
    conditions: "서로 극하는 두 오행이 각각 3글자 이상",
    interpretation: "온도와 습도처럼 서로 반대되는 두 기운이 비슷한 비중으로 있어, 상황에 따라 다른 모드가 번갈아 나온다고 읽는다.",
    alternative_interpretations: ["중간에서 이어 주는 오행(통관)이 있는지가 핵심이라는 견해"],
    conflicts: ["궁통보감의 월별·일간별 구체 판단은 원문 검수 후 반영 예정"],
  }),
  r({
    rule_id: "REL-NATAL-001",
    rule_name: "원국 내 합·충·형",
    source_title: "삼명통회",
    school: "신살·형충회합",
    conditions: "원국 네 기둥 사이에서 천간합·천간충·지지합·지지충·형·반합 발생",
    interpretation: "기둥의 자리(뿌리·사회·생활·미래) 사이에 끌림이나 긴장이 생기는 지점으로 읽는다.",
    alternative_interpretations: ["합이 되어 원래 작용이 묶인다고 보는 견해(합거)", "충을 변화·이동의 계기로 보는 견해"],
    conflicts: ["합화(合化) 성립 조건은 학파별로 엄격도가 다름"],
  }),
  r({
    rule_id: "LUCK-DECADE-001",
    rule_name: "10년 흐름(대운)의 주제",
    source_title: "자평진전",
    school: "자평 · 행운론",
    conditions: "대운 천간·지지의 십성을 원국 일간 기준으로 계산",
    interpretation: "10년 동안 바깥에서 들어오는 주제를 천간(드러난 주제)과 지지(생활 환경)로 나누어 읽는다.",
    alternative_interpretations: ["대운은 지지를 더 중시한다는 견해", "대운 교체 전후 몇 년을 별도로 보는 견해"],
    conflicts: ["대운 시작 나이 환산(3일=1년)과 반올림 방식이 학파·앱마다 다름"],
  }),
  r({
    rule_id: "LUCK-YEAR-001",
    rule_name: "한 해 흐름(세운)의 주제",
    source_title: "연해자평",
    school: "자평 · 행운론",
    conditions: "그해 간지의 십성을 원국 일간 기준으로 계산",
    interpretation: "한 해 동안 두드러지는 주제를 쉬운 말로 제시한다. 사건을 예언하지 않는다.",
    alternative_interpretations: ["대운과 세운의 상호작용을 함께 보아야 한다는 견해"],
    conflicts: [],
  }),
  r({
    rule_id: "LUCK-SHIFT-001",
    rule_name: "전통적 변화 지점",
    source_title: "삼명통회",
    school: "형충회합",
    conditions: "대운 교체 해, 또는 그해 지지가 태어난 날 지지와 충·합",
    interpretation: "전통적으로 환경 변화가 크게 체감된다고 보는 해. 좋고 나쁨이 아니라 '변화의 계기'로만 표시한다.",
    alternative_interpretations: ["충을 이동·재배치의 기회로 보는 견해"],
    conflicts: ["위험한 해, 사고·파산·사망 시기 같은 단정 표시는 금지(운명OS 정책)"],
  }),
  r({
    rule_id: "REL-PAIR-001",
    rule_name: "두 사람의 일간 관계",
    source_title: "적천수",
    school: "일간 중심 · 통변",
    conditions: "두 사람 일간의 오행 관계(같음·생·극)와 십성",
    interpretation: "서로를 어떤 방식으로 '읽는지'를 설명한다. 궁합의 좋고 나쁨을 점수화하지 않는다.",
    alternative_interpretations: ["일지(배우자 자리) 관계를 우선하는 견해", "조후(계절) 보완을 우선하는 견해"],
    conflicts: [],
  }),
  r({
    rule_id: "REL-PAIR-002",
    rule_name: "두 사람의 생활 자리(일지) 관계",
    source_title: "삼명통회",
    school: "형충회합",
    conditions: "두 사람 태어난 날 지지 사이의 합·충·형·반합",
    interpretation: "생활 리듬이 서로 끌리는지, 부딪히는지의 대화 주제로 사용한다.",
    alternative_interpretations: ["충이 있어도 다른 자리의 합이 완충한다는 견해"],
    conflicts: ["관계의 지속·이별을 판단하는 근거로 사용하지 않음(운명OS 정책)"],
  }),
  r({
    rule_id: "REL-PAIR-003",
    rule_name: "오행 보완",
    source_title: "궁통보감",
    school: "조후론",
    conditions: "한 사람에게 없는 오행이 다른 사람에게 2개 이상",
    interpretation: "서로에게 부족한 기운을 채워 주는 지점으로 읽는다.",
    alternative_interpretations: ["보완보다 공통점이 관계 안정에 중요하다는 현대적 견해"],
    conflicts: [],
  }),
  r({
    rule_id: "WORK-ROLE-001",
    rule_name: "주제군별 역할 연상",
    source_title: "운명OS 편집 기준",
    school: "현대 응용(전통 규칙 아님)",
    conditions: "상위 주제군 2개",
    interpretation: "십성 주제를 현대 직무 역할로 연결한 편집 해설. 전통 원문에 근거한 규칙이 아님을 명시한다.",
    alternative_interpretations: [],
    conflicts: ["직업 적성 검사가 아님"],
  }),
];

export const RULE_MAP: Record<string, RuleRecord> = Object.fromEntries(RULES.map((x) => [x.rule_id, x]));
export const RULES_VERSION = V;
