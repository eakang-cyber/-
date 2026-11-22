// 규칙 적용기: 계산 결과(ChartResult) → 화면용 해석 블록.
// 모든 블록은 ruleIds 와 facts(계산 근거)를 가진다. 같은 입력·같은 규칙 버전이면 같은 결과.
import {
  BRANCHES, ELEMENT_KO, GROUP_LABEL, GROUP_OF, STEMS, TEN_GOD_HANJA, TEN_GOD_KO,
  ThemeGroup, branchMainStem, stemElement, tenGod,
} from "@/engine/constants";
import { ChartResult, annualPillar, luckPeriodAt, pillarLabel } from "@/engine/chart";
import { POS_KO, branchRelations, describe as describeRel } from "@/engine/relations";
import { j, jq, particle } from "./josa";
import { DAY_MASTER, GROUP_TEXT, INTEREST_PRACTICAL, Interest, POS_MEANING } from "./content";

export interface Block {
  id: string;
  title: string;
  body: string;
  ruleIds: string[];
  facts: string[]; // 계산 근거(전문가 표기 포함)
  alt?: string[];
  question?: string;
}

const GROUP_RANK: ThemeGroup[] = ["result", "create", "structure", "learn", "self"];

function rankGroups(chart: ChartResult): ThemeGroup[] {
  const monthGroup = chart.tenGods.find((t) => t.pos === "month" && t.part === "branch")!.group;
  return (Object.keys(chart.groupCounts) as ThemeGroup[])
    .filter((g) => chart.groupCounts[g] > 0)
    .sort((a, b) => {
      const sa = chart.groupCounts[a] + (a === monthGroup ? 0.5 : 0);
      const sb = chart.groupCounts[b] + (b === monthGroup ? 0.5 : 0);
      return sb - sa || GROUP_RANK.indexOf(a) - GROUP_RANK.indexOf(b);
    });
}

const tgFact = (chart: ChartResult, g: ThemeGroup) =>
  chart.tenGods.filter((t) => t.group === g).map((t) => {
    const ch = t.part === "stem" ? STEMS[t.char] : BRANCHES[t.char];
    return `${POS_KO[t.pos]} ${t.part === "stem" ? "윗글자" : "아랫글자"} ${ch} → ${TEN_GOD_KO[t.god]}(${TEN_GOD_HANJA[t.god]})`;
  });

export function pillarsFact(chart: ChartResult) {
  const { year, month, day, hour } = chart.pillars;
  return `${pillarLabel(year).hanja}년 ${pillarLabel(month).hanja}월 ${pillarLabel(day).hanja}일 ${hour ? pillarLabel(hour).hanja + "시" : "(시 미상)"}`;
}

// ---------------- 화면 C: 나의 인생 캐릭터 ----------------

export interface Character {
  image: string;
  coreSentence: string;
  coreNote: string;
  coreBlock: Block;
  stories: Block[];
  strengths: Block[];
  frictions: Block[];
  observations: Block[];
  topGroups: ThemeGroup[];
}

export function buildCharacter(chart: ChartResult): Character {
  const dm = DAY_MASTER[chart.dayMaster];
  const ranked = rankGroups(chart);
  const dominant = ranked.slice().sort((a, b) => chart.groupCounts[b] - chart.groupCounts[a] || GROUP_RANK.indexOf(a) - GROUP_RANK.indexOf(b))[0];
  const monthT = chart.tenGods.find((t) => t.pos === "month" && t.part === "branch")!;
  const coreSentence = `${dm.lead}. ${GROUP_TEXT[dominant].coreTail}.`;

  const coreBlock: Block = {
    id: "core",
    title: "핵심 문장",
    body: `태어난 날의 첫 글자는 전통적으로 '${dm.image}'에 빗댑니다. ${dm.note} 여기에 일곱 글자 중 가장 자주 보이는 주제인 ${jq(GROUP_LABEL[dominant], "을/를")} 더해 문장을 만들었습니다.`,
    ruleIds: ["DM-IMAGE-001", "COUNT-GROUP-001"],
    facts: [`원국: ${pillarsFact(chart)}`, `일간: ${STEMS[chart.dayMaster]} (${ELEMENT_KO[stemElement(chart.dayMaster)]})`, ...tgFact(chart, dominant)],
  };

  // 서로 다른 3가지 성향 이야기: 월지 주제 → 최다 주제 → 패턴/다음 주제
  const stories: Block[] = [];
  const used = new Set<ThemeGroup>();
  const monthG = monthT.group;
  stories.push({
    id: `story-month-${monthG}`,
    title: GROUP_TEXT[monthG].storyTitle,
    body: `${GROUP_TEXT[monthG].storyBody} 이 기운이 '사회와 일의 무대'인 태어난 달 자리에 있어, 전통적으로 일과 사회생활에서 먼저 드러나는 주제로 봅니다.`,
    ruleIds: ["STRUCT-MONTH-001"],
    facts: [`태어난 달 아랫글자 ${BRANCHES[monthT.char]} 본기 ${STEMS[branchMainStem(monthT.char)]} → ${TEN_GOD_KO[monthT.god]}(${TEN_GOD_HANJA[monthT.god]})`],
    question: GROUP_TEXT[monthG].question,
    alt: ["월지보다 천간에 드러난 글자를 먼저 보는 해석도 있습니다."],
  });
  used.add(monthG);
  const next = ranked.find((g) => !used.has(g));
  if (next) {
    stories.push({
      id: `story-count-${next}`,
      title: GROUP_TEXT[next].storyTitle,
      body: `${GROUP_TEXT[next].storyBody} 일곱 글자 가운데 ${chart.groupCounts[next]}곳에서 이 주제가 보입니다.`,
      ruleIds: ["COUNT-GROUP-001"],
      facts: tgFact(chart, next),
      question: GROUP_TEXT[next].question,
      alt: ["글자 수보다 뿌리(지지에 같은 기운이 있는지)가 중요하다는 해석도 있습니다."],
    });
    used.add(next);
  }
  const patterns = buildPatterns(chart);
  if (patterns.length && stories.length < 3) stories.push(patterns[0]);
  while (stories.length < 3) {
    const g = ranked.find((x) => !used.has(x));
    if (!g) break;
    used.add(g);
    stories.push({
      id: `story-count-${g}`, title: GROUP_TEXT[g].storyTitle, body: GROUP_TEXT[g].storyBody,
      ruleIds: ["COUNT-GROUP-001"], facts: tgFact(chart, g), question: GROUP_TEXT[g].question,
    });
  }

  const strengths: Block[] = ranked.slice(0, 3).map((g) => ({
    id: `str-${g}`, title: GROUP_TEXT[g].strength, body: `'${GROUP_LABEL[g]}' 주제가 살아나는 장면으로 읽습니다.`,
    ruleIds: ["COUNT-GROUP-001"], facts: tgFact(chart, g),
  }));
  const frictions: Block[] = [];
  const tense = chart.relations.filter((x) => x.kind === "branchClash" || x.kind === "stemClash" || x.kind === "branchPunish");
  const byPair = new Map<string, typeof tense>();
  for (const rel of tense) byPair.set(`${rel.a}-${rel.b}`, [...(byPair.get(`${rel.a}-${rel.b}`) ?? []), rel]);
  for (const rels of byPair.values()) {
    const rel = rels[0];
    frictions.push({
      id: `fr-${rel.a}-${rel.b}`,
      title: `${POS_MEANING[rel.a]} ↔ ${POS_MEANING[rel.b]}`,
      body: `두 자리가 ${[...new Set(rels.map((x) => x.plain))].join(", 그리고 ")}입니다${rels.length > 1 ? `(${rels.length}겹)` : ""}. 전통 해석은 두 영역의 요구가 동시에 커질 때 조율이 필요한 장면이 생기기 쉽다고 봅니다. 결과를 예고하는 것이 아니라 미리 살펴볼 지점입니다.`,
      ruleIds: ["REL-NATAL-001"],
      facts: rels.map((x) => `${POS_KO[x.a]}·${POS_KO[x.b]}: ${x.label}`),
      alt: ["충과 형을 변화와 이동의 계기로 보는 해석도 있습니다."],
    });
  }
  ranked.slice(0, 2).forEach((g) => frictions.push({
    id: `fr-${g}`, title: GROUP_TEXT[g].friction, body: `'${GROUP_LABEL[g]}' 주제가 과해지거나 막힐 때의 장면으로 읽습니다.`,
    ruleIds: ["COUNT-GROUP-001"], facts: tgFact(chart, g),
  }));

  const observations: Block[] = [...patterns.slice(1)];
  for (const g of Object.keys(chart.groupCounts) as ThemeGroup[]) {
    if (chart.groupCounts[g] === 0) {
      observations.push({
        id: `absent-${g}`,
        title: `겉으로 드러나지 않은 주제: ${GROUP_LABEL[g]}`,
        body: `일곱 글자 표면에 '${GROUP_LABEL[g]}' 주제가 보이지 않습니다. 운명OS는 이것을 결핍으로 단정하지 않습니다. 스스로 의식해서 설계하는 영역으로 읽는 관점을 소개합니다.`,
        ruleIds: ["COUNT-ABSENT-001"],
        facts: [`${GROUP_LABEL[g]} 주제군 표면 개수 0 (지장간 제외)`],
        alt: ["숨은 글자(지장간)에 있으면 약하게 작용한다고 보는 해석", "없는 주제를 '자유로운 영역'으로 보는 해석"],
        question: GROUP_TEXT[g].question,
      });
    }
  }
  for (const rel of chart.relations.filter((x) => x.kind === "stemCombine" || x.kind === "branchHalfTrine" || x.kind === "branchCombine")) {
    observations.push({
      id: `obs-${rel.label}`,
      title: `${POS_MEANING[rel.a]} ↔ ${POS_MEANING[rel.b]}`,
      body: `두 자리가 ${rel.plain}입니다. 두 영역의 일이 서로 이어지기 쉬운 지점으로 읽습니다.`,
      ruleIds: ["REL-NATAL-001"],
      facts: [`${POS_KO[rel.a]}·${POS_KO[rel.b]}: ${rel.label}`],
      alt: ["합이 되면 원래 글자의 작용이 묶여 약해진다고 보는 해석도 있습니다(합거)."],
    });
  }

  return { image: dm.image, coreSentence, coreNote: dm.note, coreBlock, stories: stories.slice(0, 3), strengths, frictions, observations, topGroups: ranked };
}

function buildPatterns(chart: ChartResult): Block[] {
  const out: Block[] = [];
  const has = (g: ThemeGroup) => chart.groupCounts[g] > 0;
  // 편인 + 식신
  const pyeonin = chart.tenGods.find((t) => t.god === "pyeonin" && t.part === "stem");
  const siksin = chart.tenGods.find((t) => t.god === "siksin");
  if (pyeonin && siksin && (pyeonin.pos === siksin.pos || siksin.pos === "month")) {
    const combined = chart.relations.find((r) => r.kind === "stemCombine" && (r.a === pyeonin.pos || r.b === pyeonin.pos));
    out.push({
      id: "pat-in-sik",
      title: "충분히 이해한 뒤에 만들고 싶은 이야기",
      body: `깊이 이해하려는 기운과 바로 만들어 내려는 기운이 가까이 있습니다. 전통 해석은 이 둘이 순서를 다툰다고 봅니다. 생각이 정리되기 전에는 시작이 늦어지고, 정리되면 결과물의 완성도가 높아지는 장면으로 읽을 수 있습니다.${combined ? " 다만 이 차트에서는 배움의 글자가 다른 글자와 묶여(합) 그 다툼이 약해진다고 보는 해석도 있습니다." : ""}`,
      ruleIds: ["PAT-IN-SIK-001", ...(combined ? ["REL-NATAL-001"] : [])],
      facts: [
        `${POS_KO[pyeonin.pos]} 윗글자 ${STEMS[pyeonin.char]} → 편인(偏印)`,
        `${POS_KO[siksin.pos]} ${siksin.part === "stem" ? "윗글자" : "아랫글자"} ${siksin.part === "stem" ? STEMS[siksin.char] : BRANCHES[siksin.char]} → 식신(食神)`,
        ...(combined ? [`${combined.label}`] : []),
      ],
      alt: ["현실과 성과의 기운(재성)이 배움의 기운을 제어하면 문제가 되지 않는다는 해석"],
      question: "시작하기 전에 '충분히 안다'고 느끼는 기준을 낮춰 본 적이 있나요?",
    });
  }
  // 식상생재
  if (has("create") && chart.groupCounts.result >= 2) {
    out.push({
      id: "pat-siksang-jae",
      title: "만든 것이 결과로 이어지는 이야기",
      body: "표현·생산의 기운과 현실·성과의 기운이 함께 있어, 만들어 낸 것이 돈이나 성과로 연결되는 흐름으로 읽습니다. 무엇을 만들지보다 '만든 것을 어떻게 결과로 바꿀지'가 반복되는 질문일 수 있습니다.",
      ruleIds: ["PAT-SIKSANG-JAE-001"],
      facts: [...tgFact(chart, "create"), ...tgFact(chart, "result")],
      alt: ["일간의 힘이 약하면 이 흐름이 부담으로 작용한다고 보는 해석(학파별 강약 판단 상이)"],
      question: "지금까지 만든 것 중 결과(수입·인정)로 이어진 것과 이어지지 않은 것의 차이는 무엇이었나요?",
    });
  }
  // 마주 선 두 기운
  const ec = chart.elementCounts;
  for (let e = 0; e < 5; e++) {
    const controlled = (e + 2) % 5;
    if (ec[e] >= 3 && ec[controlled] >= 3) {
      out.push({
        id: `pat-oppose-${e}`,
        title: `${j(ELEMENT_KO[e], "와/과")} ${j(ELEMENT_KO[controlled], "이/가")} 마주 선 이야기`,
        body: `여덟 글자 중 ${ELEMENT_KO[e]} 기운 ${ec[e]}개, ${ELEMENT_KO[controlled]} 기운 ${ec[controlled]}개가 비슷한 비중으로 마주 서 있습니다. 전통 해석은 상황에 따라 서로 다른 두 모드가 번갈아 나오는 구조로 읽습니다. 당신에게 그 두 모드가 각각 언제 나오는지 직접 관찰해 보세요.`,
        ruleIds: ["PAT-OPPOSE-001"],
        facts: [`겉글자 기준 오행 개수: ${ELEMENT_KO.map((k, i) => `${k} ${ec[i]}`).join(" · ")}`],
        alt: ["두 기운을 이어 주는 중간 기운(통관)이 있으면 긴장이 완화된다는 해석"],
        question: "차분하게 계산할 때와 뜨겁게 밀어붙일 때, 각각 어떤 상황이었나요?",
      });
    }
  }
  return out;
}

// ---------------- 화면 D: 인생 지도 ----------------

export interface YearCell {
  year: number;
  age: number;
  stemGroup: ThemeGroup;
  branchGroup: ThemeGroup;
  label: { hanja: string; ko: string };
  luckIndex: number | null;
  shift: string[]; // 전통적 변화 지점 사유
}

export interface DecadeView {
  index: number;
  startYear: number;
  startAge: number;
  endYear: number;
  stemGroup: ThemeGroup;
  branchGroup: ThemeGroup;
  label: { hanja: string; ko: string };
  block: Block;
}

export function buildDecades(chart: ChartResult): DecadeView[] {
  return chart.luck.periods.map((p, i, arr) => {
    const sg = GROUP_OF[tenGod(chart.dayMaster, p.stem)];
    const bg = GROUP_OF[tenGod(chart.dayMaster, branchMainStem(p.branch))];
    const label = pillarLabel(p);
    const endYear = arr[i + 1] ? arr[i + 1].startYear - 1 : p.startYear + 9;
    return {
      index: p.index, startYear: p.startYear, startAge: p.startAge, endYear, stemGroup: sg, branchGroup: bg, label,
      block: {
        id: `decade-${p.index}`,
        title: GROUP_TEXT[sg].decadeTheme,
        body: `${GROUP_TEXT[sg].decadeBody} 생활 환경 쪽으로는 '${GROUP_LABEL[bg]}' 주제가 함께 들어옵니다.`,
        ruleIds: ["LUCK-DECADE-001"],
        facts: [
          `대운 ${label.hanja}: ${STEMS[p.stem]} → ${TEN_GOD_KO[tenGod(chart.dayMaster, p.stem)]}, ${BRANCHES[p.branch]}(본기 ${STEMS[branchMainStem(p.branch)]}) → ${TEN_GOD_KO[tenGod(chart.dayMaster, branchMainStem(p.branch))]}`,
          `시작: 만 ${p.startAge.toFixed(1)}세 무렵(${p.startYear}년), 방향 ${chart.luck.direction === "backward" ? "역행" : "순행"}${chart.luck.direction ? "" : "(성별 미선택 — 임시)"}`,
        ],
        question: GROUP_TEXT[sg].yearQuestion,
      },
    };
  });
}

export function buildYears(chart: ChartResult, span = 90): YearCell[] {
  const out: YearCell[] = [];
  const by = chart.solarDate.y;
  const dayBranch = chart.pillars.day.branch;
  for (let y = by; y <= by + span; y++) {
    const ap = annualPillar(y);
    const lp = luckPeriodAt(chart, y);
    const shift: string[] = [];
    if (chart.luck.periods.some((p) => p.startYear === y)) shift.push("10년 흐름이 바뀌는 해");
    for (const k of branchRelations(ap.branch, dayBranch)) {
      if (k === "branchClash") shift.push("그해 글자가 태어난 날 자리와 부딪히는 해(충)");
      if (k === "branchCombine") shift.push("그해 글자가 태어난 날 자리와 묶이는 해(합)");
    }
    out.push({
      year: y, age: y - by,
      stemGroup: GROUP_OF[tenGod(chart.dayMaster, ap.stem)],
      branchGroup: GROUP_OF[tenGod(chart.dayMaster, branchMainStem(ap.branch))],
      label: pillarLabel(ap), luckIndex: lp?.index ?? null, shift,
    });
  }
  return out;
}

export function yearBlock(chart: ChartResult, cell: YearCell): Block {
  const sg = cell.stemGroup, bg = cell.branchGroup;
  const ap = annualPillar(cell.year);
  const lp = luckPeriodAt(chart, cell.year);
  const lpG = lp ? GROUP_OF[tenGod(chart.dayMaster, lp.stem)] : null;
  const same = sg === bg;
  let body = `한 해의 겉으로 드러나는 주제는 '${GROUP_LABEL[sg]}', 생활 속 장면은 ${jq(GROUP_LABEL[bg], "으로/로")} 읽습니다.`;
  if (same) body = `한 해 전체가 '${GROUP_LABEL[sg]}' 주제로 모이는 해로 읽습니다. 같은 주제가 위아래로 겹쳐 체감이 분명할 수 있습니다.`;
  if (lpG) body += ` 이 해가 속한 10년의 주제는 '${GROUP_LABEL[lpG]}'입니다${lpG === sg ? ". 10년 흐름과 한 해 주제가 같은 방향입니다" : ""}.`;
  if (cell.shift.length) body += ` 전통적으로 변화가 체감되기 쉬운 해로 표시합니다(${cell.shift.join(", ")}). 좋고 나쁨을 뜻하지 않습니다.`;
  return {
    id: `year-${cell.year}`,
    title: `${GROUP_TEXT[sg].yearTheme}${same ? "" : ` · ${GROUP_TEXT[bg].yearTheme}`}`,
    body,
    ruleIds: ["LUCK-YEAR-001", ...(cell.shift.length ? ["LUCK-SHIFT-001"] : []), ...(lp ? ["LUCK-DECADE-001"] : [])],
    facts: [
      `세운 ${cell.label.hanja}: ${STEMS[ap.stem]} → ${TEN_GOD_KO[tenGod(chart.dayMaster, ap.stem)]}, ${BRANCHES[ap.branch]} → ${TEN_GOD_KO[tenGod(chart.dayMaster, branchMainStem(ap.branch))]}`,
      ...(lp ? [`대운 ${pillarLabel(lp).hanja} (${lp.index}번째 10년)`] : ["대운 시작 전"]),
      `연도 경계: 그해 입춘부터 적용`,
    ],
    question: GROUP_TEXT[sg].yearQuestion,
  };
}

// ---------------- 화면 E: 돈과 일 ----------------

export interface WorkSection {
  id: string;
  question: string;
  traditional: Block;
  practical: string[];
  verify: string[];
}

export function buildWork(chart: ChartResult, interest: Interest, now = new Date().getFullYear()): WorkSection[] {
  const ranked = rankGroups(chart);
  const top = ranked.slice(0, 2);
  const c = chart.groupCounts;
  const prac = INTEREST_PRACTICAL[interest];
  const lp = luckPeriodAt(chart, now);
  const ap = annualPillar(now);
  const yG = GROUP_OF[tenGod(chart.dayMaster, ap.stem)];
  const lpG = lp ? GROUP_OF[tenGod(chart.dayMaster, lp.stem)] : null;

  const valueBody = c.create > 0 && c.result >= 2
    ? "기술·작업·아이디어로 무언가를 만들고, 그것이 성과나 돈으로 이어지는 흐름으로 읽습니다. 가치는 '만든 것'과 '결과로 바꾸는 과정' 두 단계에서 생깁니다."
    : c.result >= 2
      ? "자원과 기회를 직접 다루고 관리하면서 가치를 만드는 흐름으로 읽습니다."
      : c.create >= 2
        ? "표현하고 만들어 내는 과정 자체가 가치가 되는 흐름으로 읽습니다. 결과로 바꾸는 장치는 의식적으로 설계할 필요가 있다고 봅니다."
        : c.learn >= 2
          ? "깊이 이해하고 정리한 지식이 가치가 되는 흐름으로 읽습니다."
          : "역할과 책임을 맡아 신뢰를 쌓으며 가치를 만드는 흐름으로 읽습니다.";

  return [
    {
      id: "value",
      question: "어떤 방식으로 가치를 만드는 이야기인가?",
      traditional: {
        id: "w-value", title: "가치가 생기는 경로", body: valueBody,
        ruleIds: c.create > 0 && c.result >= 2 ? ["PAT-SIKSANG-JAE-001", "COUNT-GROUP-001"] : ["COUNT-GROUP-001"],
        facts: [...tgFact(chart, "create"), ...tgFact(chart, "result")],
      },
      practical: [prac.advice[0]],
      verify: [prac.verify[0]],
    },
    {
      id: "role",
      question: "일을 할 때 어떤 역할을 생각해 볼 수 있는가?",
      traditional: {
        id: "w-role", title: "연상되는 역할",
        body: `가장 자주 보이는 두 주제 '${GROUP_LABEL[top[0]]}'${top[1] ? `, '${GROUP_LABEL[top[1]]}'` : ""}에서 떠올릴 수 있는 역할입니다: ${[...GROUP_TEXT[top[0]].role, ...(top[1] ? GROUP_TEXT[top[1]].role.slice(0, 2) : [])].join(", ")}. 적성 검사 결과가 아니라 생각의 출발점입니다.`,
        ruleIds: ["WORK-ROLE-001", "COUNT-GROUP-001"],
        facts: top.map((g) => `${GROUP_LABEL[g]} ${c[g]}곳`),
      },
      practical: ["지금 하는 일 중 위 역할에 해당하는 업무 비율을 적어 보세요.", prac.advice[1]],
      verify: ["그 역할을 하고 있을 때 시간 가는 줄 모르는가, 아니면 피곤한가"],
    },
    {
      id: "earn-keep",
      question: "돈을 버는 문제와 관리하는 문제를 어떻게 구분할 것인가?",
      traditional: {
        id: "w-earn", title: "들어오는 흐름과 지키는 흐름",
        body: c.self >= 2 && c.result >= 2
          ? "현실·성과의 기운과 나와 같은 기운이 함께 보입니다. 전통 해석은 기회와 함께 '나눠야 할 사람·나갈 곳'도 함께 생기는 구조로 읽습니다. 버는 계획과 지키는 계획을 따로 세우는 편이 이 구조와 맞습니다."
          : c.result >= 2
            ? "현실·성과의 기운이 여러 곳에 보입니다. 다룰 자원이 많아질수록 관리 체계가 중요해지는 구조로 읽습니다."
            : c.result === 0
              ? "현실·성과의 기운이 겉으로 드러나지 않습니다. 돈의 흐름을 의식적으로 기록하는 습관이 이 구조를 보완한다고 보는 관점이 있습니다."
              : "현실·성과의 기운이 한두 곳에 보입니다. 수입원의 수보다 하나의 수입원을 깊게 관리하는 편이 맞는 구조로 읽습니다.",
        ruleIds: ["COUNT-GROUP-001"],
        facts: [...tgFact(chart, "result"), ...tgFact(chart, "self")],
        alt: ["재물의 크기는 원국보다 운의 흐름과 실제 선택에 달려 있다는 해석"],
      },
      practical: INTEREST_PRACTICAL["재정관리"].advice,
      verify: INTEREST_PRACTICAL["재정관리"].verify.slice(0, 1),
    },
    {
      id: "solo-team",
      question: "독립과 협업을 어떻게 바라볼 것인가?",
      traditional: {
        id: "w-solo", title: "혼자와 함께 사이",
        body: c.structure === 0
          ? `외부의 규칙·직함을 뜻하는 기운이 겉으로 드러나지 않아, 정해진 틀보다 스스로 정한 기준으로 움직이는 구조로 읽는 관점이 있습니다.${c.self >= 2 ? " 나와 같은 기운도 함께 있어, 협업한다면 역할과 몫을 처음부터 문서로 정해 두는 편이 맞습니다." : ""}`
          : c.self >= 2
            ? "나와 같은 기운이 여러 곳에 있어 동료·파트너와의 관계가 일의 중요한 변수로 읽힙니다. 협업할 때 역할과 몫을 처음부터 분명히 하는 편이 맞습니다."
            : "책임과 규칙의 기운이 있어, 분명한 구조 안에서 역할을 맡을 때 힘이 실리는 흐름으로 읽습니다.",
        ruleIds: ["COUNT-GROUP-001", ...(c.structure === 0 ? ["COUNT-ABSENT-001"] : [])],
        facts: [`책임과 규칙 ${c.structure}곳 · 나와 동료 ${c.self}곳`],
      },
      practical: ["협업 전 '누가 무엇을 결정하는가'를 한 문단으로 합의합니다.", ...(interest === "창업" ? ["공동 창업이라면 지분·베스팅·이탈 조건을 계약서로 남깁니다."] : [])],
      verify: ["혼자 했을 때와 함께 했을 때의 결과물 차이를 최근 사례로 비교"],
    },
    {
      id: "now",
      question: "지금 무엇을 검증해야 하는가?",
      traditional: {
        id: "w-now", title: `${now}년 무렵의 주제`,
        body: `${now}년의 주제는 '${GROUP_LABEL[yG]}'${lpG ? `, 지금 지나고 있는 10년의 주제는 '${GROUP_LABEL[lpG]}'` : ""}입니다. 전통 해석의 시기 주제는 무엇을 확인해 볼지 고르는 데에만 참고하세요. 결정은 아래 현실 근거로 합니다.`,
        ruleIds: ["LUCK-YEAR-001", "LUCK-DECADE-001"],
        facts: [`세운 ${pillarLabel(ap).hanja}`, ...(lp ? [`대운 ${pillarLabel(lp).hanja}`] : [])],
      },
      practical: prac.advice,
      verify: prac.verify,
    },
  ];
}

// ---------------- 화면 F: 관계 ----------------

export interface PairResult {
  aReadsB: Block;
  bReadsA: Block;
  dayBranch: Block;
  complement: Block;
  differences: { topic: string; a: string; b: string }[];
  questions: string[];
  scenarios: { situation: string; tension: string; lines: { who: "A" | "B"; text: string }[] }[];
}

const READ_AS: Record<ThemeGroup, string> = {
  self: "동료처럼 나란히 서는 사람",
  create: "내가 무언가를 해 주고 싶어지는 사람",
  result: "함께 현실을 꾸려 가는 사람",
  structure: "나를 다잡게 만드는 사람",
  learn: "기대고 배우게 되는 사람",
};

export function buildPair(a: ChartResult, b: ChartResult, nameA: string, nameB: string): PairResult {
  const gAB = GROUP_OF[tenGod(a.dayMaster, b.dayMaster)];
  const gBA = GROUP_OF[tenGod(b.dayMaster, a.dayMaster)];
  const rels = branchRelations(a.pillars.day.branch, b.pillars.day.branch);
  const relLabels = rels.map((k) => describeRel(k, a.pillars.day.branch, b.pillars.day.branch, false));
  const lackA = a.elementCounts.map((n, i) => (n === 0 && b.elementCounts[i] >= 2 ? i : -1)).filter((i) => i >= 0);
  const lackB = b.elementCounts.map((n, i) => (n === 0 && a.elementCounts[i] >= 2 ? i : -1)).filter((i) => i >= 0);
  const topA = rankGroups(a)[0], topB = rankGroups(b)[0];

  const differences = [
    { topic: "기본 비유", a: DAY_MASTER[a.dayMaster].image, b: DAY_MASTER[b.dayMaster].image },
    { topic: "자주 보이는 주제", a: GROUP_LABEL[topA], b: GROUP_LABEL[topB] },
    {
      topic: "드러나지 않은 주제",
      a: (Object.keys(a.groupCounts) as ThemeGroup[]).filter((g) => a.groupCounts[g] === 0).map((g) => GROUP_LABEL[g]).join(", ") || "없음",
      b: (Object.keys(b.groupCounts) as ThemeGroup[]).filter((g) => b.groupCounts[g] === 0).map((g) => GROUP_LABEL[g]).join(", ") || "없음",
    },
  ];

  const scenarios: PairResult["scenarios"] = [];
  const resultGap = Math.abs(a.groupCounts.result - b.groupCounts.result) >= 2;
  scenarios.push({
    situation: "돈을 쓰는 방식이 다를 때",
    tension: resultGap ? `현실·성과 주제의 비중이 서로 다르게 읽힙니다(${nameA} ${a.groupCounts.result}곳, ${nameB} ${b.groupCounts.result}곳).` : "두 사람 모두 비슷한 비중으로 현실 주제를 갖고 있어, 기준이 비슷하거나 같은 지점에서 부딪힐 수 있습니다.",
    lines: [
      { who: "A", text: "이번 달 큰 지출 하나는 미리 같이 정해 두면 나는 마음이 편할 것 같아." },
      { who: "B", text: "좋아. 대신 나머지는 각자 판단하는 범위를 정해 두자. 얼마까지면 괜찮을까?" },
    ],
  });
  scenarios.push({
    situation: "연락과 혼자만의 시간",
    tension: topA === "self" || topB === "self" ? "한쪽에 '나와 동료' 주제가 두드러져, 혼자 정리하는 시간이 필요하다고 읽히는 지점이 있습니다." : "서로가 생각하는 '충분한 연락'의 기준을 확인해 볼 지점입니다.",
    lines: [
      { who: "A", text: "답이 늦으면 내가 서운해서가 아니라 걱정이 돼서 그래. 바쁜 날은 한 줄만 보내 줄래?" },
      { who: "B", text: "알겠어. 나는 몰입할 때 연락을 못 보는 편이라, 그럴 땐 미리 말해 둘게." },
    ],
  });
  scenarios.push({
    situation: "계획과 즉흥 사이",
    tension: rels.includes("branchClash") ? "생활 자리(일지)가 서로 부딪히는 관계로 읽혀, 생활 리듬 차이가 대화 주제가 되기 쉽습니다." : "생활 리듬을 맞추는 방식에 대해 미리 이야기해 둘 만합니다.",
    lines: [
      { who: "A", text: "주말 계획을 금요일까지 하나만 정해 두면 좋겠어. 나머지는 비워 두고." },
      { who: "B", text: "그럼 토요일은 정해 두고, 일요일은 그날 기분대로 하자." },
    ],
  });

  return {
    aReadsB: {
      id: "pair-ab", title: `${nameA}에게 ${j(nameB, "은/는")} '${READ_AS[gAB]}'으로 읽힙니다`,
      body: `${nameA}의 태어난 날 기준으로 ${nameB}의 일간은 '${GROUP_LABEL[gAB]}' 주제에 해당합니다. 전통 해석은 이를 상대를 대하는 방식의 단서로 봅니다.`,
      ruleIds: ["REL-PAIR-001"],
      facts: [`${STEMS[a.dayMaster]} 기준 ${STEMS[b.dayMaster]} → ${TEN_GOD_KO[tenGod(a.dayMaster, b.dayMaster)]}`],
    },
    bReadsA: {
      id: "pair-ba", title: `${nameB}에게 ${j(nameA, "은/는")} '${READ_AS[gBA]}'으로 읽힙니다`,
      body: `반대로 ${nameB}의 기준에서 ${j(nameA, "은/는")} '${GROUP_LABEL[gBA]}' 주제에 해당합니다. 같은 관계도 서로 다르게 읽힐 수 있다는 점이 대화의 출발점입니다.`,
      ruleIds: ["REL-PAIR-001"],
      facts: [`${STEMS[b.dayMaster]} 기준 ${STEMS[a.dayMaster]} → ${TEN_GOD_KO[tenGod(b.dayMaster, a.dayMaster)]}`],
    },
    dayBranch: {
      id: "pair-day", title: rels.length ? `생활 자리: ${relLabels.map((r) => r.plain).join(", ")}` : "생활 자리: 특별한 합·충 없음",
      body: rels.length
        ? `두 사람의 태어난 날 아랫글자 사이에 ${relLabels.map((r) => r.plain).join(", ")}가 있습니다. 관계의 결과를 뜻하지 않으며, 생활 리듬에 대해 이야기해 볼 주제로만 사용합니다.`
        : "두 사람의 생활 자리 사이에 전통적인 합이나 충이 없습니다. 생활 리듬은 사주보다 실제 대화로 맞춰 가는 영역입니다.",
      ruleIds: ["REL-PAIR-002"],
      facts: [`일지 ${BRANCHES[a.pillars.day.branch]} · ${BRANCHES[b.pillars.day.branch]}${relLabels.length ? " → " + relLabels.map((r) => r.label).join(", ") : ""}`],
      alt: ["다른 자리의 합이 일지의 충을 완충한다는 해석"],
    },
    complement: {
      id: "pair-comp", title: lackA.length || lackB.length ? "서로 채워 주는 기운이 있습니다" : "서로 겹치는 기운이 많습니다",
      body: [
        ...lackA.map((e) => `${nameA}에게 겉으로 드러나지 않은 '${ELEMENT_KO[e]}' 기운이 ${nameB}에게 ${b.elementCounts[e]}개 있습니다.`),
        ...lackB.map((e) => `${nameB}에게 겉으로 드러나지 않은 '${ELEMENT_KO[e]}' 기운이 ${nameA}에게 ${a.elementCounts[e]}개 있습니다.`),
      ].join(" ") || "한쪽에 없는 기운을 다른 쪽이 크게 채워 주는 구조는 아닙니다. 비슷한 기운을 공유하는 관계로 읽습니다.",
      ruleIds: ["REL-PAIR-003"],
      facts: [`${nameA} 오행: ${a.elementCounts.join("/")}`, `${nameB} 오행: ${b.elementCounts.join("/")}`, "(나무/불/흙/쇠/물, 겉글자 기준)"],
    },
    differences,
    questions: [
      `${j(nameA, "이/가")} ${jq(GROUP_LABEL[topA], "을/를")} 중요하게 여길 때, ${j(nameB, "은/는")} 그걸 어떻게 느끼나요?`,
      "서로에게 가장 고마웠던 장면 하나와 가장 서운했던 장면 하나를 각자 말해 보세요.",
      "앞으로 1년 동안 둘이 함께 만들고 싶은 장면은 무엇인가요?",
    ],
    scenarios,
  };
}

// ---------------- 화면 G: 선택 실험실 ----------------

export function choiceThemes(chart: ChartResult, now = new Date().getFullYear()): Block {
  const years = [now, now + 1, now + 2].map((y) => ({ y, g: GROUP_OF[tenGod(chart.dayMaster, annualPillar(y).stem)] }));
  const lp = luckPeriodAt(chart, now);
  const lpG = lp ? GROUP_OF[tenGod(chart.dayMaster, lp.stem)] : null;
  return {
    id: "choice-theme",
    title: "전통 해석에서 생각해 볼 주제",
    body: `${lpG ? `지금 지나는 10년의 주제는 '${GROUP_LABEL[lpG]}'이고, ` : ""}앞으로 3년의 주제는 ${years.map((x) => `${x.y}년 '${GROUP_LABEL[x.g]}'`).join(", ")}${particle(GROUP_LABEL[years[2].g], "으로/로")} 읽힙니다. 어느 선택이 맞는지가 아니라, 각 선택지를 이 주제에 비추어 어떤 질문을 던질지에 사용하세요.`,
    ruleIds: ["LUCK-DECADE-001", "LUCK-YEAR-001"],
    facts: [...(lp ? [`대운 ${pillarLabel(lp).hanja}`] : []), ...years.map((x) => `${x.y} ${pillarLabel(annualPillar(x.y)).hanja}`)],
  };
}
