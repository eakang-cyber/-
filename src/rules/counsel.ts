// 고민상담소: 사용자가 쓴 고민 + 참여형 질문 → 사주 계산·규칙에 근거한 상담지.
// 원칙: 고객의 말을 그대로 되돌려 주고, 사주는 '이 고민 앞의 나'와 '시기 주제'까지만 말한다.
// 선택을 대신하지 않고, 예언·확률·불안 유도 문장을 쓰지 않는다.
import { GROUP_LABEL, GROUP_OF, ThemeGroup, tenGod } from "@/engine/constants";
import { ChartResult, annualPillar, luckPeriodAt, monthPeriods, pillarLabel } from "@/engine/chart";
import { Block, buildCharacter } from "./interpret";
import { CHECKLIST, CheckItem, DecisionType } from "./decision";
import { GROUP_TEXT } from "./content";
import { j, jq } from "./josa";
import { LoveRec, PlaceRec, SitesRec, TimingRec, findPlace, helpfulElements, recommendLove, recommendPlace, recommendSites, recommendTiming } from "./recommend";
import { oracleLines } from "./oracle";
import { REGIONS, bearing, findRegion } from "@/engine/places";
import { cityById } from "@/engine/cities";
import { ELEMENT_KO } from "@/engine/constants";

export type Topic = "career" | "money" | "realestate" | "business" | "love" | "family" | "people" | "self";

export interface TopicDef {
  id: Topic;
  label: string;
  keywords: string[];
  /** 전통 십성 의미상 이 고민과 관련된 주제군 */
  groups: (chart: ChartResult) => ThemeGroup[];
  why: string;
  decision?: DecisionType;
  checklist: CheckItem[];
  experiment: string;
}

const partnerGroup = (c: ChartResult): ThemeGroup[] =>
  c.input.sex === "male" ? ["result"] : c.input.sex === "female" ? ["structure"] : ["result", "structure"];

export const TOPICS: TopicDef[] = [
  {
    id: "career", label: "일·커리어", keywords: ["회사", "이직", "퇴사", "직장", "상사", "승진", "커리어", "취업", "일이", "업무", "연봉", "직무"],
    groups: () => ["create", "structure"], why: "전통적으로 일은 '표현과 생산'(내가 만들어 내는 것)과 '책임과 규칙'(조직·직함)으로 읽습니다.",
    decision: "job", checklist: CHECKLIST.job.slice(0, 3),
    experiment: "다음 2주 동안 '일하면서 시간 가는 줄 몰랐던 순간'을 하루 한 줄씩 적어 보세요.",
  },
  {
    id: "money", label: "돈·투자", keywords: ["돈", "투자", "주식", "코인", "대출", "빚", "저축", "월급", "재테크", "자금", "금리"],
    groups: () => ["result", "self"], why: "전통적으로 돈은 '현실과 성과'(재물)로, 돈을 나눠 갖는 사람은 '나와 동료'로 읽습니다.",
    decision: "invest", checklist: CHECKLIST.invest.slice(0, 3),
    experiment: "지난 3개월 지출을 '꼭 필요 / 기분 / 남 때문' 세 칸으로 나눠 적어 보세요.",
  },
  {
    id: "realestate", label: "부동산·사업장", keywords: ["부지", "땅", "토지", "공장", "아파트", "집", "상가", "건물", "매입", "매수", "분양", "경매", "부동산", "청약", "이사", "전세", "월세"],
    groups: () => ["result", "learn"], why: "전통적으로 거래와 재물은 '현실과 성과', 계약서와 등기 같은 문서는 '배움과 보호'(인성)로 읽습니다.",
    decision: "realestate", checklist: CHECKLIST.realestate.slice(0, 3),
    experiment: "후보지마다 '꼭 필요한 조건 3개'를 정하고, 현장에 가서 체크해 보세요.",
  },
  {
    id: "business", label: "사업·창업", keywords: ["창업", "사업", "매장", "가게", "확장", "법인", "오픈", "출시", "동업", "매출", "손님", "고객"],
    groups: () => ["create", "result"], why: "전통적으로 사업은 만든 것('표현과 생산')이 결과('현실과 성과')로 이어지는 흐름으로 읽습니다.",
    decision: "business", checklist: CHECKLIST.business.slice(0, 3),
    experiment: "돈을 내겠다고 말할 만한 사람 5명에게 이번 주 안에 직접 물어보세요.",
  },
  {
    id: "love", label: "연애·결혼", keywords: ["연애", "결혼", "남자친구", "여자친구", "애인", "썸", "이별", "헤어", "배우자", "남편", "아내", "소개팅", "재회"],
    groups: partnerGroup, why: "전통 해석은 태어난 날의 아랫글자를 '가까운 관계의 자리'로 보고, 성별에 따라 상대를 뜻하는 주제를 달리 읽습니다(현대에는 이 성별 구분에 비판도 있습니다).",
    checklist: [
      { title: "내가 원하는 관계의 모습", detail: "연락 빈도, 함께 보내는 시간, 미래 계획에 대해 내가 원하는 것을 세 줄로 적어 봅니다." },
      { title: "상대에게 직접 묻기", detail: "추측 대신 확인하고 싶은 질문 하나를 정해 직접 물어봅니다." },
      { title: "반복되는 장면", detail: "지난 관계들에서 반복된 갈등 장면이 있는지 돌아봅니다." },
    ],
    experiment: "이번 주에 상대에게 '요즘 우리 관계에서 좋은 점 하나'를 먼저 말해 보세요.",
  },
  {
    id: "family", label: "가족", keywords: ["부모", "엄마", "아빠", "어머니", "아버지", "가족", "형제", "자매", "자녀", "아이", "육아", "시댁", "처가"],
    groups: () => ["learn", "self"], why: "전통적으로 부모와 보살핌은 '배움과 보호'(인성), 형제·자매는 '나와 동료'로 읽습니다.",
    checklist: [
      { title: "내 책임과 남의 책임 나누기", detail: "이 문제에서 내가 바꿀 수 있는 것과 없는 것을 두 칸으로 나눠 적습니다." },
      { title: "대화의 시간과 장소", detail: "감정이 높을 때가 아니라 정해 둔 시간에 이야기합니다." },
      { title: "도움받을 곳", detail: "필요하면 가족상담·법률구조 등 외부 도움을 알아봅니다." },
    ],
    experiment: "가족 한 사람에게 '요즘 어때?'를 판단 없이 듣기만 하는 10분을 가져 보세요.",
  },
  {
    id: "people", label: "인간관계", keywords: ["친구", "동료", "사람", "관계", "갈등", "인간관계", "모임", "손절", "오해", "뒷담"],
    groups: () => ["self", "structure"], why: "전통적으로 친구·동료는 '나와 동료'(비겁), 나를 압박하는 관계는 '책임과 규칙'(관성)으로 읽습니다.",
    checklist: [
      { title: "사실과 해석 나누기", detail: "상대가 실제로 한 말·행동과 내가 받아들인 의미를 나눠 적습니다." },
      { title: "원하는 결과 정하기", detail: "관계를 지키고 싶은지, 거리를 두고 싶은지 먼저 정합니다." },
      { title: "한 문장 요청", detail: "비난 대신 '나는 ~하면 좋겠다'로 요청을 한 문장으로 만듭니다." },
    ],
    experiment: "갈등 상대에게 보낼 말을 써 두고, 하루 뒤에 다시 읽은 다음 보낼지 정하세요.",
  },
  {
    id: "self", label: "나·진로 방향", keywords: ["진로", "방향", "꿈", "적성", "공부", "시험", "자격증", "번아웃", "무기력", "의미", "뭘 해야", "모르겠"],
    groups: () => ["learn", "create"], why: "전통적으로 배우고 이해하는 힘은 '배움과 보호', 꺼내고 만드는 힘은 '표현과 생산'으로 읽습니다.",
    checklist: [
      { title: "에너지가 생기는 일", detail: "최근 한 달 동안 하고 나서 힘이 났던 일과 빠졌던 일을 나눠 적습니다." },
      { title: "작게 시험해 보기", detail: "큰 결정 전에 2주짜리 작은 시도로 확인해 봅니다." },
      { title: "몸과 마음 상태", detail: "무기력이 2주 넘게 이어지면 전문 상담을 함께 고려합니다." },
    ],
    experiment: "관심 있는 분야의 사람 한 명에게 '하루 일과'를 물어보세요.",
  },
];

export const DEADLINES = ["한 달 안", "3개월 안", "1년 안", "정해지지 않음"] as const;
export const FEELINGS = ["해 보고 싶다", "두렵다", "잘 모르겠다", "이미 정했고 확인받고 싶다"] as const;
export const CONCERNS = ["돈", "사람", "시간", "확신", "몸과 마음"] as const;

export interface CounselInput {
  text: string;
  topic: Topic | null;
  deadline: (typeof DEADLINES)[number] | null;
  feeling: (typeof FEELINGS)[number] | null;
  concern: (typeof CONCERNS)[number] | null;
  optionA: string;
  optionB: string;
  /** 지금 사는 곳(방위 기준) */
  baseCityId: string;
  /** 관련 장소(글에서 자동 인식, 수정 가능) */
  place: string;
  /** 연애: 만나고 싶은 상대 */
  seek: "여성" | "남성" | "사람" | null;
}

/** 위기 신호: 사주 상담 대신 전문 기관 안내로 전환한다. */
const CRISIS = ["죽고 싶", "죽고싶", "자살", "자해", "살기 싫", "살기싫", "사라지고 싶", "끝내고 싶", "극단적 선택"];
export const hasCrisisSignal = (text: string) => CRISIS.some((k) => text.replace(/\s+/g, " ").includes(k));

export function guessTopic(text: string): Topic | null {
  let best: { id: Topic; n: number } | null = null;
  for (const t of TOPICS) {
    const n = t.keywords.filter((k) => text.includes(k)).length;
    if (n > 0 && (!best || n > best.n)) best = { id: t.id, n };
  }
  return best?.id ?? null;
}

const FEELING_TEXT: Record<(typeof FEELINGS)[number], string> = {
  "해 보고 싶다": "해 보고 싶은 마음이 이미 있습니다. 이때 필요한 건 허락보다 '되돌릴 수 있는 첫걸음'의 크기를 정하는 일입니다.",
  "두렵다": "두려움은 대개 잃을 수 있는 것이 분명하다는 신호입니다. 무엇을 잃을까 두려운지 이름을 붙이면, 그것을 지키는 조건을 만들 수 있습니다.",
  "잘 모르겠다": "모르겠다는 건 정보나 기준 중 하나가 비어 있다는 뜻일 때가 많습니다. 아래 확인 목록으로 무엇이 비어 있는지부터 찾아보세요.",
  "이미 정했고 확인받고 싶다": "이미 정한 마음이 있다면, 확인받고 싶은 것이 '옳은지'인지 '괜찮을지'인지 구분해 보세요. 앞의 것은 근거로, 뒤의 것은 대비책으로 답할 수 있습니다.",
};
const CONCERN_TEXT: Record<(typeof CONCERNS)[number], string> = {
  돈: "돈이 걸린다면 '최악의 경우 잃는 금액'을 숫자로 적어 두세요. 막연한 불안이 감당 가능한 숫자로 바뀝니다.",
  사람: "사람이 걸린다면 그 사람에게 직접 확인할 질문 하나를 정해 보세요. 추측이 대화로 바뀝니다.",
  시간: "시간이 걸린다면 마감일을 거꾸로 세어 이번 주에 할 일 하나로 쪼개 보세요.",
  확신: "확신이 없다면 결정 전체가 아니라 '2주짜리 작은 실험'부터 정해 보세요.",
  "몸과 마음": "몸과 마음이 지쳐 있다면 큰 결정은 잠을 충분히 잔 뒤로 미루는 것이 우선입니다. 힘든 상태가 이어지면 전문가와 이야기해 보세요.",
};

export interface Recommendation {
  /** 신점 말투의 결론 몇 줄 */
  oracle: string[];
  /** 지역 안 후보지 순위(추가 결제 상품) */
  sites: SitesRec | null;
  headline: string;
  why: string;
  avoid: string | null;
  timing: TimingRec;
  place: PlaceRec | null;
  love: LoveRec | null;
  ruleIds: string[];
  facts: string[];
}

export interface CounselAnswer {
  rec: Recommendation;
  topic: TopicDef;
  understood: string;
  focusGroups: ThemeGroup[];
  me: Block[];
  timing: Block;
  months: { y: number; m: number; group: ThemeGroup; label: string }[];
  heart: string[];
  checks: CheckItem[];
  experiment: string;
  questions: string[];
}

export function buildCounsel(chart: ChartResult, inp: CounselInput, now = new Date(), name = "고객"): CounselAnswer | null {
  if (!inp.text.trim() || !inp.topic) return null;
  const topic = TOPICS.find((t) => t.id === inp.topic)!;
  const groups = topic.groups(chart);
  const ch = buildCharacter(chart);
  const excerpt = inp.text.trim().length > 80 ? inp.text.trim().slice(0, 80) + "…" : inp.text.trim();

  const understood = [
    `“${excerpt}”`,
    `${topic.label} 고민으로 이해했어요.`,
    inp.deadline && inp.deadline !== "정해지지 않음" ? `${inp.deadline} 정해야 하고,` : "",
    inp.feeling ? `지금 마음은 '${inp.feeling}'에 가깝고,` : "",
    inp.concern ? `가장 걸리는 건 '${inp.concern}'이에요.` : "",
  ].filter(Boolean).join(" ").replace(/,$/, ".");

  // 이 고민 앞의 나: 관련 주제군에 해당하는 캐릭터 블록 + 주제별 보유 정도
  const me: Block[] = [];
  for (const g of groups) {
    const n = chart.groupCounts[g];
    me.push({
      id: `focus-${g}`,
      title: n >= 2 ? `${jq(GROUP_LABEL[g], "은/는")} 익숙한 영역입니다 · ${n}곳` : n === 1 ? `${jq(GROUP_LABEL[g], "은/는")} 한 곳에 뚜렷이 있습니다` : `${jq(GROUP_LABEL[g], "은/는")} 겉으로 드러나지 않은 영역입니다`,
      body: `당신의 일곱 글자에는 이 주제가 ${n}곳 있습니다. ${n >= 2 ? `익숙한 만큼 ${GROUP_TEXT[g].strength}에서 힘이 나고, ${GROUP_TEXT[g].friction}에는 과해지기 쉽다고 읽습니다.` : n === 1 ? `필요할 때 꺼내 쓸 수 있는 힘으로 읽습니다. ${GROUP_TEXT[g].strength}에서 드러나기 쉽습니다.` : "운명OS는 이것을 결핍으로 보지 않습니다. 이 고민에서는 이 주제를 의식적으로 설계하고, 잘하는 사람의 도움을 받는 방식이 맞을 수 있습니다."}`,
      ruleIds: ["COUNT-GROUP-001", ...(n === 0 ? ["COUNT-ABSENT-001"] : [])],
      facts: chart.tenGods.filter((t) => t.group === g).map((t) => `${t.pos} ${t.part} → ${t.god}`).concat(`${GROUP_LABEL[g]} ${n}곳`),
      question: GROUP_TEXT[g].question,
    });
  }
  // 관계형 고민이면 '가까운 생활과 관계' 자리의 긴장/연결을 덧붙인다
  if (inp.topic === "love" || inp.topic === "family" || inp.topic === "people") {
    const near = [...ch.frictions, ...ch.observations].find((b) => b.facts.some((f) => f.includes("태어난 날")));
    if (near) me.push(near);
  }
  const story = ch.stories.find((s) => groups.some((g) => s.id.endsWith(g)));
  if (story && me.length < 3) me.push(story);

  // 시기
  const y = now.getFullYear();
  const yG = GROUP_OF[tenGod(chart.dayMaster, annualPillar(y).stem)];
  const lp = luckPeriodAt(chart, y);
  const lpG = lp ? GROUP_OF[tenGod(chart.dayMaster, lp.stem)] : null;
  const ms = monthPeriods(y, now.getMonth() + 1, 12).map((p) => ({ y: p.y, m: p.m, group: GROUP_OF[tenGod(chart.dayMaster, p.stem)], label: pillarLabel(p).hanja }));
  const relevant = ms.filter((x) => groups.includes(x.group));
  const timing: Block = {
    id: "counsel-timing",
    title: relevant.length ? `앞으로 12개월 중 ${relevant.length}개월에 이 고민의 주제가 드러납니다` : "앞으로 12개월은 이 고민의 주제가 직접 드러나지 않는 흐름입니다",
    body: `${lpG ? `지금 지나는 10년의 주제는 '${GROUP_LABEL[lpG]}', ` : ""}${y}년의 주제는 '${GROUP_LABEL[yG]}'입니다. ${relevant.length ? `${relevant.map((x) => `${x.m}월`).join(", ")} 무렵은 ${groups.map((g) => `'${GROUP_LABEL[g]}'`).join(" 또는 ")} 주제가 그달에 드러나는 달이에요.` : "12개월 안에는 이 고민의 주제가 직접 드러나는 달이 없어요. 준비하고 정보를 모으는 시기로 쓰세요."}`,
    ruleIds: ["LUCK-YEAR-001", "LUCK-MONTH-001", ...(lp ? ["LUCK-DECADE-001"] : [])],
    facts: [`세운 ${pillarLabel(annualPillar(y)).hanja}`, ...(lp ? [`대운 ${pillarLabel(lp).hanja}`] : []), ...relevant.map((x) => `${x.y}.${x.m} ${x.label}월`)],
  };

  const heart = [inp.feeling ? FEELING_TEXT[inp.feeling] : "", inp.concern ? CONCERN_TEXT[inp.concern] : ""].filter(Boolean);
  if (inp.optionA.trim() && inp.optionB.trim()) heart.push(`'${inp.optionA.trim()}'과 '${inp.optionB.trim()}' 사이라면, 각각을 골랐을 때 1년 뒤 가장 후회할 장면을 한 줄씩 적어 보세요. 더 견디기 어려운 후회 쪽이 답의 단서가 됩니다.`);

  const questions = [
    inp.deadline && inp.deadline !== "정해지지 않음" ? `${inp.deadline} 정하지 않으면 실제로 무슨 일이 생기나요?` : "이 고민에 마감을 정한다면 언제가 좋을까요?",
    `이 고민을 가장 잘 아는 사람에게 무엇을 물어보고 싶나요?`,
    GROUP_TEXT[groups[0]].question,
  ];

  // ---------- 직관적 추천 ----------
  const timingRec = recommendTiming(chart, groups, now);
  const h = helpfulElements(chart);
  const best = timingRec.best;
  const placeObj = findPlace(inp.place || inp.text);
  const moneyTopic = ["realestate", "business", "money"].includes(topic.id);
  const placeRec = placeObj && ["realestate", "business", "career", "money"].includes(topic.id) ? recommendPlace(chart, placeObj, inp.baseCityId || chart.input.cityId, name, moneyTopic) : null;
  const love = topic.id === "love" ? recommendLove(chart, name, inp.seek ?? (chart.input.sex === "male" ? "여성" : chart.input.sex === "female" ? "남성" : "사람"), now) : null;
  const when = `${best.label}, 특히 ${best.bestLabel}`;
  const lead: Record<Topic, string> = {
    realestate: `${name}님에게는 ${j(when, "을/를")} 추천드려요.`,
    business: `${name}님이 움직인다면 ${j(when, "을/를")} 추천드려요.`,
    career: `${name}님이 옮긴다면 ${j(when, "을/를")} 추천드려요.`,
    money: `큰돈을 움직인다면 ${j(when, "을/를")} 추천드려요.`,
    love: love?.line ?? "",
    family: `이 문제를 풀기 좋은 때는 ${best.label}이에요. ${best.bestLabel}에 먼저 이야기를 꺼내 보세요.`,
    people: `관계를 정리하거나 회복하기 좋은 때는 ${best.label}이에요. ${best.bestLabel}에 먼저 움직여 보세요.`,
    self: `새로운 방향을 시작하기 좋은 때는 ${best.label}이에요. ${best.bestLabel}에 첫 시도를 해 보세요.`,
  };
  let headline = [lead[topic.id], placeRec?.line].filter(Boolean).join(" ");
  const bestWhy = best.months.find((m) => m.p.m === best.best.m)?.why ?? [];
  const why = love ? love.why : `${name}님 사주는 ${h.helpful.map((e) => ELEMENT_KO[e]).join("·")} 기운이 힘이 되는 구조인데, ${best.short}에 ${bestWhy.length ? bestWhy.slice(0, 2).join(", ") : "그 기운"}${bestWhy.length ? "이 겹쳐요" : "이 들어와요"}.`;
  const avoid = timingRec.avoid && topic.id !== "love" ? `${j(timingRec.avoid.label, "은/는")} 서두르지 않는 게 좋아요. 힘이 되는 기운이 약하게 들어오는 때예요.` : null;
  const region = ["realestate", "business"].includes(topic.id) ? findRegion(`${inp.place} ${inp.text}`) : null;
  const sites = region ? recommendSites(chart, region, moneyTopic) : null;
  // 등록 지역(예: 대전)이면 '지역'은 사는 곳 기준, '후보지'는 지역 중심 기준으로 판단해 서로 어긋나지 않게 한다.
  let siteCtx: import("./oracle").SiteContext | null = null;
  if (sites && region && REGIONS.includes(region)) {
    const base = cityById(inp.baseCityId || chart.input.cityId);
    const sameArea = bearing(base, region.center).km < 12;
    const regionPlace = sameArea ? null : recommendPlace(chart, { ...region.center, name: region.name }, base.id, name, moneyTopic);
    const text = `${inp.place} ${inp.text}`;
    const hit = sites.sites.find((x) => text.includes(x.name.split(" ")[0]));
    siteCtx = { regionPlace, siteName: hit ? hit.name.replace(" 일대", "") : null, siteVerdict: hit?.verdict ?? null, sites };
  }
  const oracle = oracleLines(topic.id, best, timingRec.avoid && topic.id !== "love" ? timingRec.avoid : null, placeRec, love, siteCtx);
  if (siteCtx) {
    const sv = siteCtx.siteName && siteCtx.siteVerdict ? `${siteCtx.sites.region.name} 안에서 보면 ${siteCtx.siteName}${siteCtx.siteVerdict === "good" ? "은 기운이 맞는 쪽" : siteCtx.siteVerdict === "money" ? "은 재물 기운은 있지만 힘이 드는 쪽" : "은 기운을 쓰는 쪽"}이고, 가장 맞는 쪽은 ${siteCtx.sites.bestDirection}이에요.` : `${siteCtx.sites.region.name} 안에서는 ${siteCtx.sites.bestDirection}이 가장 맞아요.`;
    headline = [lead[topic.id], siteCtx.regionPlace?.line, sv].filter(Boolean).join(" ");
  }
  const rec: Recommendation = {
    oracle, sites,
    headline, why, avoid, timing: timingRec, place: placeRec, love,
    ruleIds: ["YONG-EOKBU-001", "REC-TIMING-001", "LUCK-MONTH-001", ...(placeRec || sites ? ["DIR-BAGUA-001"] : []), ...(love ? ["LOVE-STAR-001"] : [])],
    facts: [...(love ? love.facts : timingRec.facts), ...(placeRec ? placeRec.facts.slice(0, 1) : [])],
  };

  return { rec, topic, understood, focusGroups: groups, me: me.slice(0, 3), timing, months: ms, heart, checks: topic.checklist, experiment: topic.experiment, questions };
}

/** AI 상담사(설명자)에게 보낼 프롬프트. 출생일·이름은 보내지 않는다. */
export function counselPrompt(inp: CounselInput, a: CounselAnswer): string {
  const facts = {
    고민: inp.text.trim().slice(0, 600),
    분야: a.topic.label, 마감: inp.deadline, 마음: inp.feeling, 걸리는것: inp.concern,
    선택지: [inp.optionA, inp.optionB].filter((x) => x.trim()),
    사주근거: a.me.map((b) => ({ 제목: b.title, 내용: b.body, 규칙: b.ruleIds })),
    시기근거: { 제목: a.timing.title, 내용: a.timing.body, 규칙: a.timing.ruleIds },
    추천: { 신점결론: a.rec.oracle, 결론: a.rec.headline, 이유: a.rec.why, 피할때: a.rec.avoid, 월별순위: a.rec.timing.ranked.map((m) => `${m.p.y}.${m.p.m}`) },
  };
  return `당신은 '운명OS'의 고민 상담 설명자입니다. 사주를 계산하지 말고, 아래 [근거]에 있는 전통 해석만 사용해 고객의 고민에 한국어로 답하세요.

규칙:
- 신점처럼 말하세요: 짧고 단정한 존댓말, 한 문장 25자 안팎. 결론부터. [근거]의 '신점결론'의 시기·장소·인연은 그대로 쓰고 바꾸지 마세요. 예: "올겨울, 12월이에요. 이때 계약하세요." "신탄진? 돈은 보여요. 대신 손이 많이 가요."
- 빙빙 돌려 말하지 말고, 고객 이름을 불러 단정하지 않되 분명하게 권하세요("추천드려요", "~할 가능성이 커요").
- 고객의 말을 1번 그대로 인용해 '내 이야기'로 느끼게 하세요.
- 확률·퍼센트·점수는 말하지 마세요. 사망·질병·사고·파산·이혼 같은 불행 예언 금지.
- 현실 조언 필드에는 계약 전에 확인할 실제 조건 하나를 짧게 쓰세요.
- 한자와 명리 전문 용어(십성, 대운, 일간 등)를 쓰지 마세요. 따뜻하지만 담백한 존댓말.
- 각 필드는 2~4문장.

[근거]
${JSON.stringify(facts, null, 1)}

JSON 하나만 답하세요:
{"opening": "결론(추천)부터 한두 문장", "tradition": "왜 그런지 — 근거의 전통 해석으로 본 이 고민 앞의 나", "timing": "추천 시기와 피할 때, 월별 순위를 풀어서", "practical": "그 시기에 맞춰 할 현실적인 준비 하나", "question": "고객이 스스로에게 던질 질문 하나"}`;
}

const BANNED = ["사망", "죽", "파산", "이혼", "사고가", "확률", "%", "반드시", "무조건", "대운", "십성", "일간", "용신"];
export function checkAiAnswer(x: unknown): x is Record<"opening" | "tradition" | "timing" | "practical" | "question", string> {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const keys = ["opening", "tradition", "timing", "practical", "question"];
  if (!keys.every((k) => typeof o[k] === "string" && (o[k] as string).length > 0 && (o[k] as string).length < 700)) return false;
  const all = keys.map((k) => o[k]).join(" ");
  return !BANNED.some((b) => all.includes(b)) && !/[一-鿿]/.test(all);
}
