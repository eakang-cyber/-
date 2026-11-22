// 총운(평생 총평) — 초등·중등학생도 읽을 수 있는 쉬운 말로.
// 화면 본문에는 한자·전문 용어를 쓰지 않는다. 근거(rule_id)는 데이터로만 들고 있다가 맨 아래 '어떻게 나왔나요'에서만 보여 준다.
import { Element, TenGod, ThemeGroup, GROUP_OF, branchElement, branchMainStem, stemElement, tenGod } from "@/engine/constants";
import { ChartResult, annualPillar } from "@/engine/chart";
import { helpfulElements, recommendLove, recommendTiming } from "./recommend";
import { seasonWord } from "./oracle";
import { j } from "./josa";

export type Weather = "맑음" | "구름 조금" | "흐린 뒤 갬";

export interface TotalSection { id: string; title: string; weather?: Weather; lines: string[]; tips?: { label: string; items: string[] } }
export interface Total {
  headline: string;
  summary: string[];
  sections: TotalSection[];
  lucky: { color: string; number: string; direction: string };
  ruleIds: string[];
}

const DM_SIMPLE = [
  ["큰 나무", "곧고 씩씩해요. 한번 정한 목표는 끝까지 밀고 가요."],
  ["덩굴", "부드럽지만 끈질겨요. 어디서든 잘 적응해요."],
  ["해", "밝고 따뜻해요. 사람들 사이에서 분위기를 살려요."],
  ["촛불", "은은하고 섬세해요. 가까운 사람을 세심하게 챙겨요."],
  ["산", "듬직해요. 쉽게 흔들리지 않아서 사람들이 기대요."],
  ["밭", "포근해요. 무언가를 키우고 돌보는 걸 잘해요."],
  ["쇠", "단단하고 시원시원해요. 옳고 그름이 분명해요."],
  ["보석", "깔끔하고 섬세해요. 꼼꼼하고 센스가 좋아요."],
  ["큰 강", "마음이 넓어요. 생각이 크고 누구와도 잘 어울려요."],
  ["비", "조용히 스며들어요. 눈치가 빠르고 관찰을 잘해요."],
] as const;

const GROUP_LIFE: Record<ThemeGroup, string> = {
  self: "친구와 동료가 중요해지고, 내 힘으로 서 보는 일이 많아요.",
  create: "무언가를 만들고 보여 주는 일에서 빛나요.",
  result: "돈과 성과가 눈에 보이게 쌓여요.",
  structure: "맡는 일과 책임이 커지고, 인정받을 기회가 와요.",
  learn: "배우고 공부한 것이 큰 힘이 돼요.",
};
const GROUP_STRENGTH: Record<ThemeGroup, string> = {
  self: "자기 생각이 뚜렷하고, 혼자서도 해내는 힘이 있어요.",
  create: "말이나 손재주로 생각을 잘 표현해요.",
  result: "현실 감각이 좋아서 무엇이 이득인지 빨리 알아요.",
  structure: "책임감이 강하고 약속을 잘 지켜요.",
  learn: "궁금한 게 많고, 배우는 속도가 빨라요.",
};
const GROUP_CAREFUL: Record<ThemeGroup, string> = {
  self: "고집이 세 보일 수 있어요. 한 번 더 들어 주면 사람이 모여요.",
  create: "말이 앞설 때가 있어요. 마무리까지 챙기면 완벽해요.",
  result: "결과에 마음이 급해질 수 있어요. 천천히 가도 괜찮아요.",
  structure: "혼자 다 짊어지기 쉬워요. 나눠 맡기는 연습을 해 보세요.",
  learn: "생각이 많아 시작이 늦을 수 있어요. 일단 해 보는 게 답이에요.",
};
const GROUP_JOB: Record<ThemeGroup, string> = {
  self: "내 이름을 걸고 하는 일 (프리랜서, 운동, 창업)",
  create: "만들고 보여 주는 일 (디자인, 콘텐츠, 기술, 요리)",
  result: "사람을 만나고 거래하는 일 (영업, 장사, 사업, 금융)",
  structure: "조직에서 책임지는 일 (공무원, 관리자, 큰 회사)",
  learn: "배우고 가르치는 일 (연구, 교육, 상담, 의료)",
};
const WORK_STYLE: Record<ThemeGroup, string> = {
  self: "남이 시키는 일보다 내가 이끌 때 신이 나요.",
  create: "자유롭게 만들 수 있는 곳에서 실력이 나와요.",
  result: "성과가 숫자로 보이는 곳에서 힘이 나요.",
  structure: "규칙이 분명한 조직에서 크게 자라요.",
  learn: "한 분야를 깊게 파는 일이 잘 맞아요.",
};
const YEAR_GOD: Record<TenGod, string> = {
  bijeon: "내 힘으로 서 보는 해예요. 스스로 정할 일이 많아요.",
  geopjae: "경쟁이 생기는 해예요. 돈 관리만 꼼꼼히 하면 돼요.",
  siksin: "하고 싶은 일을 즐겁게 하는 해예요. 먹을 복도 따라와요.",
  sanggwan: "재주가 드러나는 해예요. 말조심만 하면 크게 빛나요.",
  pyeonjae: "돈이 크게 오가는 해예요. 기회는 잡되 욕심은 조금만.",
  jeongjae: "차곡차곡 모이는 해예요. 꾸준함이 보상받아요.",
  pyeongwan: "바쁘고 책임이 몰리는 해예요. 체력 관리가 핵심이에요.",
  jeonggwan: "인정받는 해예요. 합격·승진 같은 소식을 노려 볼 만해요.",
  pyeonin: "생각이 깊어지는 해예요. 새 공부를 시작하기 좋아요.",
  jeongin: "도움을 받는 해예요. 문서·계약 일이 잘 풀려요.",
};
const LIFE_TYPE_LINE: Record<string, string> = {
  "안정형": "인생이 고르게 흘러가는 안정형이에요.",
  "대기만성형": "갈수록 좋아지는 대기만성형이에요.",
  "중년형": "한창때 크게 피는 인생이에요.",
  "초년형": "일찍 꽃피는 인생이에요.",
};
const EL_BODY: Record<Element, [string, string]> = {
  0: ["간과 눈", "눈을 자주 쉬게 하고 스트레칭을 해 주세요."],
  1: ["심장과 혈액순환", "가볍게 땀 흘리는 운동이 잘 맞아요."],
  2: ["위와 소화", "밥 먹는 시간을 규칙적으로 지켜 주세요."],
  3: ["폐와 피부", "맑은 공기를 마시고 보습을 챙겨 주세요."],
  4: ["신장과 몸의 물기운", "물을 자주 마시고 몸을 따뜻하게 하세요."],
};
const LUCKY: Record<Element, { color: string; number: string; direction: string }> = {
  0: { color: "초록색", number: "3, 8", direction: "동쪽" },
  1: { color: "빨간색", number: "2, 7", direction: "남쪽" },
  2: { color: "노란색", number: "5, 10", direction: "가운데" },
  3: { color: "흰색", number: "4, 9", direction: "서쪽" },
  4: { color: "검정·남색", number: "1, 6", direction: "북쪽" },
};

function fit(h: ReturnType<typeof helpfulElements>, stem: number, branch: number) {
  const se = stemElement(stem), be = branchElement(branch);
  return (h.helpful.includes(se) ? 2 : h.unhelpful.includes(se) ? -1 : 0) + (h.helpful.includes(be) ? 1 : h.unhelpful.includes(be) ? -0.5 : 0);
}
const weatherOf = (score: number): Weather => (score >= 1.2 ? "맑음" : score >= 0 ? "구름 조금" : "흐린 뒤 갬");

const WEATHER_LEAD: Record<Weather, string> = {
  "맑음": "바람이 등 뒤에서 밀어 주는 때예요.",
  "구름 조금": "크게 막히는 일 없이 잔잔하게 흘러가는 때예요.",
  "흐린 뒤 갬": "처음엔 힘이 들 수 있지만, 그만큼 실력이 단단해지는 때예요.",
};

export function buildTotal(c: ChartResult, name: string, now = new Date()): Total {
  const h = helpfulElements(c);
  const dmEl = stemElement(c.dayMaster);
  const [img, dmLine] = DM_SIMPLE[c.dayMaster];
  const groups = (Object.keys(c.groupCounts) as ThemeGroup[]).sort((a, b) => c.groupCounts[b] - c.groupCounts[a]);
  const top = groups[0], second = groups[1];

  // 초년·중년·말년: 그 나이대에 걸친 10년 흐름의 평균 궁합
  const monthG = GROUP_OF[tenGod(c.dayMaster, branchMainStem(c.pillars.month.branch))];
  const stage = (from: number, to: number) => {
    let sum = 0, w = 0;
    const gs: Record<string, number> = {};
    const pre = Math.min(c.luck.startYears, to) - from;
    if (pre > 0) { sum += fit(h, c.pillars.month.stem, c.pillars.month.branch) * pre; w += pre; gs[monthG] = (gs[monthG] ?? 0) + pre; }
    for (const p of c.luck.periods) {
      const ov = Math.min(p.startAge + 10, to) - Math.max(p.startAge, from);
      if (ov <= 0) continue;
      sum += fit(h, p.stem, p.branch) * ov; w += ov;
      const g = GROUP_OF[tenGod(c.dayMaster, p.stem)];
      gs[g] = (gs[g] ?? 0) + ov;
    }
    const score = w ? sum / w : 0;
    const g = (Object.keys(gs) as ThemeGroup[]).sort((a, b) => gs[b] - gs[a])[0] ?? top;
    return { weather: weatherOf(score), score, g };
  };
  const early = stage(0, 20), mid = stage(20, 50), late = stage(50, 90);
  const best = ([["초년", early], ["중년", mid], ["말년", late]] as [string, typeof early][]).sort((a, b) => b[1].score - a[1].score)[0][0];
  const spread = Math.max(early.score, mid.score, late.score) - Math.min(early.score, mid.score, late.score);
  const lifeType = LIFE_TYPE_LINE[spread < 0.6 ? "안정형" : best === "말년" ? "대기만성형" : best === "중년" ? "중년형" : "초년형"];

  // 재물
  const money = c.groupCounts.result, friends = c.groupCounts.self;
  const moneyLine = money >= 2 ? "돈 버는 감각이 있는 사주예요. 돈 벌 기회가 자주 눈에 들어와요." : money === 1 ? "꾸준히 모으면 차곡차곡 쌓이는 사주예요." : "일한 만큼 정직하게 들어오는 사주예요. 새는 돈만 막으면 충분해요.";
  const moneyT = recommendTiming(c, ["result"], now);
  const keep = [
    c.groupCounts.create > 0 ? "내 재주로 번 돈이 오래 남아요. 기술이나 특기를 하나 키우세요." : "월급처럼 꾸준히 들어오는 돈을 먼저 만드세요.",
    "들어오면 바로 일부를 다른 통장으로 옮겨 두세요.",
  ];
  const protect = [
    friends >= 2 ? "아는 사람에게 돈을 빌려주거나 보증 서는 건 조심하세요." : "충동구매만 줄여도 돈이 눈에 띄게 남아요.",
    h.strength === "weak" ? "큰돈은 혼자 정하지 말고 믿는 사람과 한 번 더 상의하세요." : "자신감이 넘칠 때 큰돈을 넣지 마세요. 하루 자고 정하세요.",
  ];

  // 애정
  const partnerG: ThemeGroup = c.input.sex === "female" ? "structure" : "result";
  const pc = c.groupCounts[partnerG];
  const love = recommendLove(c, name, c.input.sex === "male" ? "여성" : c.input.sex === "female" ? "남성" : "사람", now);
  const dayClash = c.relations.some((r) => (r.a === "day" || r.b === "day") && (r.kind === "branchClash" || r.kind === "branchPunish"));
  const loveLines = [
    pc >= 2 ? "인기가 많은 편이에요. 좋은 인연이 여러 번 찾아와요." : pc === 1 ? "한 사람과 깊게 가는 스타일이에요." : "천천히 마음을 여는 편이에요. 친구에서 연인이 되는 일이 많아요.",
    dayClash ? "가까운 사이일수록 말투를 부드럽게 하면 오래가요." : "편안하고 안정적인 연애를 좋아해요.",
    `${seasonWord(love.when)}, ${love.when.bestLabel}쯤 좋은 인연이 들어와요.`,
  ];

  // 건강(전통 체질 — 진단이 아님)
  const minEl = ([0, 1, 2, 3, 4] as Element[]).sort((a, b) => c.elementCounts[a] - c.elementCounts[b])[0];
  const maxEl = ([0, 1, 2, 3, 4] as Element[]).sort((a, b) => c.elementCounts[b] - c.elementCounts[a])[0];

  // 올해·내년
  const yearLine = (y: number) => {
    const ap = annualPillar(y);
    const w = weatherOf(fit(h, ap.stem, ap.branch));
    return { w, text: `${y}년 · ${w} — ${YEAR_GOD[tenGod(c.dayMaster, ap.stem)]}` };
  };
  const y0 = yearLine(now.getFullYear()), y1 = yearLine(now.getFullYear() + 1);
  const lucky = LUCKY[h.helpful[0]];

  const headline = `${name}님은 ${img} 같은 사람이에요. ${lifeType}`;
  const summary = [
    GROUP_STRENGTH[top],
    `${moneyLine.split(".")[0]}.`,
    `${j(best, "이/가")} 가장 밝고, ${seasonWord(moneyT.best)}에 돈과 일의 기회가 커져요.`,
  ];

  const sections: TotalSection[] = [
    { id: "early", title: "초년운 (0~19세)", weather: early.weather, lines: [WEATHER_LEAD[early.weather], GROUP_LIFE[early.g]] },
    { id: "mid", title: "중년운 (20~49세)", weather: mid.weather, lines: [WEATHER_LEAD[mid.weather], GROUP_LIFE[mid.g]] },
    { id: "late", title: "말년운 (50세 이후)", weather: late.weather, lines: [WEATHER_LEAD[late.weather], GROUP_LIFE[late.g]] },
    { id: "character", title: "타고난 성격", lines: [`${img}처럼 ${dmLine}`, GROUP_STRENGTH[top], GROUP_STRENGTH[second]], tips: { label: "이것만 조심하면 좋아요", items: [GROUP_CAREFUL[top]] } },
    { id: "money", title: "재물운", lines: [moneyLine, `돈이 크게 들어오는 때는 ${seasonWord(moneyT.best)}, 특히 ${moneyT.best.bestLabel}이에요.`], tips: { label: "돈 모으는 법 · 새는 돈 막는 법", items: [...keep, ...protect] } },
    { id: "love", title: "애정운", lines: loveLines },
    { id: "work", title: "사회운 · 잘 맞는 일", lines: [WORK_STYLE[top], WORK_STYLE[second]], tips: { label: "잘 맞는 일", items: [GROUP_JOB[top], GROUP_JOB[second]] } },
    { id: "health", title: "건강 · 체질", lines: [`전통적으로 ${j(EL_BODY[minEl][0], "을/를")} 챙기라고 봐요. ${EL_BODY[minEl][1]}`, maxEl !== minEl ? `기운이 많은 ${EL_BODY[maxEl][0]} 쪽은 무리하지 않는 게 좋아요.` : ""].filter(Boolean), tips: { label: "", items: ["아픈 곳이 있으면 꼭 병원에서 확인하세요. 사주는 생활 습관 참고용이에요."] } },
    { id: "years", title: "올해와 내년", lines: [y0.text, y1.text] },
  ];

  return {
    headline, summary, sections, lucky,
    ruleIds: ["DM-IMAGE-001", "COUNT-GROUP-001", "YONG-EOKBU-001", "LUCK-DECADE-001", "LUCK-YEAR-001", "LOVE-STAR-001", "REC-TIMING-001"],
  };
}
