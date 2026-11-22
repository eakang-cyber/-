"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/state/store";
import { useRouter } from "@/ui/router";
import { Page, SampleBanner } from "@/ui/layout";
import { Badge, Button, Card, Notice, SectionHead, cx } from "@/ui/kit";
import { buildCharacter, buildDecades } from "@/rules/interpret";
import { GROUP_LABEL } from "@/engine/constants";

const INCLUDED = [
  { title: "전체 인생 지도(0~90세 연도별)", desc: "모든 해를 눌러 그해의 주제와 근거를 확인합니다." },
  { title: "돈과 일 심층 분석(관심사 5종 전체)", desc: "직장·창업·이직·부업·재정관리를 모두 전환해 비교합니다." },
  { title: "관계 심층 분석(갈등 상황별 대화 예시)", desc: "상황별 대화 예시와 서로 다르게 읽히는 지점을 정리합니다." },
  { title: "10년 연도별 해석", desc: "지금 지나는 10년을 한 해씩 펼쳐 봅니다." },
  { title: "선택 실험실 확장 분석", desc: "직접 매긴 기준으로 두 선택지를 비교하고 점검 질문을 받습니다." },
  { title: "개인화 질문 3개", desc: "궁금한 것을 직접 묻고, 근거가 연결된 답을 받습니다." },
  { title: "리포트 저장 및 다시 보기", desc: "결과를 아카이브에 저장하고 언제든 다시 엽니다." },
];

const COMPARE: { item: string; free: string; paid: string }[] = [
  { item: "인생 캐릭터", free: "핵심 문장 · 3가지 이야기 · 근거 보기", paid: "강점·갈등 장면 전체 + 관찰 포인트 전체" },
  { item: "인생 지도", free: "10년 흐름 전체 + 지난해·올해·내년", paid: "0~90세 모든 해를 직접 탐색" },
  { item: "돈과 일", free: "관심사 1개 선택", paid: "관심사 5종을 전환하며 비교" },
  { item: "관계", free: "두 사람 기본 비교", paid: "갈등 상황별 대화 예시 · 생활 리듬 분석" },
  { item: "선택 실험실", free: "두 선택지 나란히 비교", paid: "가중치 비교 · 결정 전 점검 질문 확장" },
  { item: "질문", free: "—", paid: "개인화 질문 3개(근거 연결)" },
  { item: "저장", free: "이 화면에서만 보기", paid: "아카이브에 저장 · 다시 보기" },
];

export function Premium() {
  const { state, dispatch, chart, subject, toast } = useStore();
  const { go } = useRouter();
  const [agree, setAgree] = useState(false);
  const [phase, setPhase] = useState<"idle" | "processing">("idle");
  const character = useMemo(() => buildCharacter(chart), [chart]);
  const decades = useMemo(() => buildDecades(chart), [chart]);
  const now = new Date().getFullYear();
  const current = decades.find((d) => d.startYear <= now && now <= d.endYear) ?? null;

  const pay = () => {
    if (!agree || phase === "processing") return;
    setPhase("processing");
    dispatch({ type: "betaPurchaseClick" }); // 베타: '결제하려 했다'는 행동 신호
    setTimeout(() => {
      dispatch({ type: "setPremium", value: true });
      toast("데모 결제 완료 — 실제 청구는 없습니다");
      setPhase("idle");
      go("report");
    }, 900);
  };

  return (
    <Page>
      <SampleBanner />
      <header className="flex flex-col gap-3">
        <p className="eyebrow">인생 마스터 리포트</p>
        <h1 className="font-display text-[1.75rem] lg:text-[2.1rem] leading-[1.3] font-semibold text-ivory">
          여기까지가 당신의 이야기의 시작입니다.
        </h1>
        <p className="text-mist text-[0.98rem] leading-relaxed max-w-[40rem]">
          무료로 본 결과는 그대로 남아 있습니다. 리포트는 같은 계산 위에서 더 많은 해를 직접 탐색하고, 비교하고, 저장하는 기능을 엽니다.
        </p>
      </header>

      {/* 지금까지 본 것 */}
      <Card>
        <p className="text-[0.8rem] text-faint">{subject.name || "나"}님이 지금까지 확인한 것</p>
        <p className="mt-2 font-display text-[1.1rem] leading-snug text-ivory">“{character.coreSentence}”</p>
        <ul className="mt-4 flex flex-col gap-2 text-[0.9rem] text-mist">
          <li className="flex gap-2"><span className="text-gold" aria-hidden>·</span>서로 다른 3가지 이야기: {character.stories.map((s) => s.title).join(" / ")}</li>
          {current && (
            <li className="flex gap-2"><span className="text-gold" aria-hidden>·</span>
              지금 지나는 10년({current.startYear}~{current.endYear}): {current.block.title}, 생활 쪽 주제는 ‘{GROUP_LABEL[current.branchGroup]}’
            </li>
          )}
          <li className="flex gap-2"><span className="text-gold" aria-hidden>·</span>모든 해석의 근거(rule_id)와 계산 기준</li>
        </ul>
      </Card>

      {state.premium ? (
        <Card className="border-gold/40">
          <div className="flex flex-wrap items-center gap-2"><Badge layer="demo" /><Badge layer="premium">데모 프리미엄 사용 중</Badge></div>
          <p className="mt-3 text-[0.95rem] text-ivory/90">데모 결제로 리포트가 열려 있습니다. 실제 결제는 일어나지 않았습니다.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => go("report")}>리포트 열기</Button>
            <Button variant="ghost" onClick={() => { dispatch({ type: "setPremium", value: false }); toast("데모 프리미엄을 해제했습니다"); }}>데모 프리미엄 해제</Button>
          </div>
        </Card>
      ) : (
        <section aria-labelledby="price-title" className="paper rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-[12rem]">
              <p className="text-[0.78rem] tracking-[0.14em] text-ink-soft font-medium">ONE-TIME · 1회 결제</p>
              <h2 id="price-title" className="font-display text-[1.35rem] font-semibold mt-1">인생 마스터 리포트</h2>
            </div>
            <div className="text-right">
              <p className="font-display text-[2rem] font-semibold tabular leading-none">9,900<span className="text-[1rem] ml-0.5">원</span></p>
              <p className="text-[0.75rem] text-ink-soft mt-1">부가세 포함 · 구독 아님 · 자동 결제 없음</p>
            </div>
          </div>
          <ul className="flex flex-col gap-3">
            {INCLUDED.map((i) => (
              <li key={i.title} className="flex gap-3">
                <span aria-hidden className="mt-[0.55rem] h-1.5 w-1.5 rounded-full bg-ink shrink-0" />
                <div>
                  <p className="text-[0.95rem] font-medium">{i.title}</p>
                  <p className="text-[0.84rem] text-ink-soft">{i.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-ink/15 bg-white/50 p-4 text-[0.84rem] text-ink leading-relaxed">
            <div className="flex items-center gap-2 mb-1.5">
              <p className="font-medium">환불 조건</p>
              <span className="inline-flex h-5 items-center rounded-full border border-ink/30 px-2 text-[0.68rem] text-ink-soft">초안 · 법률 검토 필요</span>
            </div>
            <ul className="flex flex-col gap-1 list-disc pl-4">
              <li>결제 후 7일 이내, 리포트를 열람하지 않았다면 전액 환불합니다.</li>
              <li>열람 후에는 디지털 콘텐츠 특성상 환불이 제한될 수 있습니다.</li>
              <li>단, 계산 오류가 확인되면 열람 여부와 관계없이 전액 환불합니다.</li>
              <li>결제 대행: Toss Payments(연동 예정).</li>
            </ul>
          </div>

          <div className="rounded-xl border-2 border-dashed border-ink/30 p-4 text-[0.86rem] leading-relaxed">
            <p className="font-semibold">데모 안내</p>
            <p className="text-ink-soft mt-0.5">이 프로토타입에서는 실제 결제가 일어나지 않습니다. 카드 정보도 입력받지 않습니다. 아래 버튼은 데모 프리미엄 화면을 여는 용도입니다.</p>
          </div>

          <label htmlFor="terms" className="flex items-start gap-3 cursor-pointer text-[0.9rem]">
            <input id="terms" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-5 w-5 accent-[#101827]" />
            <span>상품 구성, 가격, 환불 조건과 “전통 해석은 미래를 예측하지 않는다”는 안내를 확인했습니다.</span>
          </label>
          <Button variant="paper" size="lg" onClick={pay} disabled={!agree || phase === "processing"} aria-busy={phase === "processing"}>
            {phase === "processing" ? "데모 결제 처리 중…" : "모의 결제 진행 (데모)"}
          </Button>
          {!agree && <p className="text-[0.78rem] text-ink-soft -mt-2">확인란을 선택하면 버튼이 활성화됩니다.</p>}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="무료와 리포트" title="글자 수가 아니라, 할 수 있는 일이 늘어납니다" desc="무료 결과도 완결된 경험입니다. 리포트는 같은 계산 결과를 더 넓게 탐색하고 기록하는 도구를 더합니다." />
        <div className="overflow-x-auto rounded-2xl border border-line/70">
          <table className="w-full min-w-[34rem] text-[0.88rem]">
            <thead className="bg-raised text-left">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium text-mist w-[22%]">기능</th>
                <th scope="col" className="px-4 py-3 font-medium text-mist">무료</th>
                <th scope="col" className="px-4 py-3 font-medium text-gold">인생 마스터 리포트</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((r, i) => (
                <tr key={r.item} className={cx("border-t border-line/60", i % 2 === 1 && "bg-deep/50")}>
                  <th scope="row" className="px-4 py-3 text-left font-medium text-ivory">{r.item}</th>
                  <td className="px-4 py-3 text-mist">{r.free}</td>
                  <td className="px-4 py-3 text-ivory/90">{r.paid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Notice title="결제 전에 알아 두세요">
        리포트의 해석은 전통 명리학 규칙에 근거한 설명이며, 미래 사건이나 성공 여부를 예측하지 않습니다. 재정·건강·법률 같은 중요한 결정은 실제 근거와 전문가 상담을 우선하세요.
      </Notice>
      {!state.premium && (
        <Button variant="ghost" onClick={() => go("report")}>리포트 샘플 먼저 보기</Button>
      )}
    </Page>
  );
}
