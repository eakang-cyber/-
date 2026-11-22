"use client";
// 베타 테스트 피드백. 목적: '진짜 돈이 될 만한가'를 판단할 신호 모으기.
// - 응답 + 행동 신호(둘러본 화면, 모의 결제 클릭, 내 정보 입력 여부)만 담는다. 출생 정보·이름은 담지 않는다.
// - 기본 경로: 요약 문구를 복사해 운영자에게 보낸다(누구나 가능).
// - 보조 경로: claude.ai 아티팩트에서 쓰기 권한이 있는 뷰어면 db 에 자동 저장한다.
import { useState } from "react";
import { useStore } from "@/state/store";
import { useRouter } from "@/ui/router";
import { Badge, Button, Field, Notice, Segmented, cx } from "@/ui/kit";
import { Page, ScreenTitle } from "@/ui/layout";

const SCREEN_LABEL: Record<string, string> = {
  me: "인생 캐릭터", map: "인생 지도", work: "돈과 일", relation: "관계", lab: "선택 실험실",
  archive: "아카이브", report: "마스터 리포트", premium: "가격 화면", method: "계산 기준",
};

const Q = {
  sat: { label: "전체적으로 얼마나 마음에 들었나요?", options: ["1 별로", "2", "3 보통", "4", "5 아주 좋음"] },
  best: { label: "가장 흥미로웠던 화면은?", options: ["인생 캐릭터", "인생 지도", "돈과 일", "관계", "선택 실험실", "아카이브"] },
  pay: { label: "이 리포트가 실제로 9,900원이라면?", options: ["바로 결제할 것 같다", "할인·이벤트가 있으면 결제", "무료 부분만 쓸 것 같다", "쓰지 않을 것 같다"] },
  price: { label: "내가 낼 만하다고 느끼는 가격은?", options: ["0원", "3,900원", "9,900원", "19,900원", "29,000원 이상"] },
  back: { label: "한 달 뒤에 다시 들어올 것 같나요?", options: ["예", "아마도", "아니요"] },
} as const;
type Key = keyof typeof Q;

type SaveState = "idle" | "saving" | "saved" | "unavailable";

async function trySave(payload: Record<string, unknown>): Promise<SaveState> {
  const c = (typeof window !== "undefined" ? (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude : undefined);
  if (!c?.use) return "unavailable";
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), 8000));
  try {
    const [user, db] = await Promise.all([Promise.race([c.use("user"), timeout]), Promise.race([c.use("db"), timeout])]) as [
      { id: () => Promise<string | null>; can: (n: string) => Promise<boolean | null> } | null,
      { doc: (p: string) => { set: (d: Record<string, unknown>) => Promise<void> } } | null,
    ];
    if (!user || !db) return "unavailable";
    if ((await user.can("data.write")) === false) return "unavailable";
    const id = await user.id();
    if (!id) return "unavailable";
    await db.doc(`feedback/${id}`).set(payload);
    return "saved";
  } catch {
    return "unavailable";
  }
}

export function Feedback() {
  const { state, toast } = useStore();
  const { go } = useRouter();
  const [a, setA] = useState<Partial<Record<Key, string>>>({});
  const [wish, setWish] = useState("");
  const [done, setDone] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");
  const [showText, setShowText] = useState(false);

  const visited = state.beta.visited.filter((r) => SCREEN_LABEL[r]).map((r) => SCREEN_LABEL[r]);
  const answered = (Object.keys(Q) as Key[]).filter((k) => a[k]).length;
  const ready = answered >= 3;

  const summary = [
    "[운명OS 베타 피드백]",
    ...(Object.keys(Q) as Key[]).map((k) => `- ${Q[k].label} ${a[k] ?? "(무응답)"}`),
    `- 바라는 점: ${wish.trim() || "(없음)"}`,
    `- 둘러본 화면(${visited.length}): ${visited.join(", ") || "없음"}`,
    `- 모의 결제 버튼 누름: ${state.beta.purchaseClicked ? "예" : "아니요"}`,
    `- 내 생년월일로 봤나: ${state.profileIsSample ? "아니요(예시 인물로만 봄)" : "예"}`,
  ].join("\n");

  const submit = async () => {
    setDone(true);
    setSave("saving");
    const res = await trySave({
      v: 1, at: new Date().toISOString(),
      answers: a, wish: wish.trim().slice(0, 600),
      visited: state.beta.visited, purchaseClicked: state.beta.purchaseClicked, ownProfile: !state.profileIsSample,
    });
    setSave(res);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(summary); toast("복사했습니다. 보내 주신 분께 붙여 넣어 주세요"); }
    catch { setShowText(true); toast("복사가 막혀 있어요. 아래 글을 직접 선택해 복사해 주세요"); }
  };

  return (
    <Page>
      <ScreenTitle eyebrow="베타 테스트" title="30초 의견 보내기"
        desc="이 서비스가 실제로 돈을 내고 쓸 만한지 판단하는 데 쓰입니다. 솔직할수록 도움이 됩니다." />

      <Notice title="함께 담기는 정보">
        답변과 함께 <b className="text-ivory">둘러본 화면 목록, 모의 결제 버튼을 눌렀는지, 내 생년월일로 봤는지</b>만 담깁니다. 이름과 출생 정보는 담지 않습니다.
      </Notice>

      {!done ? (
        <section className="flex flex-col gap-7">
          {(Object.keys(Q) as Key[]).map((k) => (
            <Field key={k} label={Q[k].label}>
              <Segmented size="sm" label={Q[k].label} value={(a[k] ?? "") as string} onChange={(v) => setA((x) => ({ ...x, [k]: v }))}
                options={Q[k].options.map((o) => ({ value: o, label: o }))} />
            </Field>
          ))}
          <Field label="어떤 기능이 있으면 돈을 내겠나요? 아쉬웠던 점도 좋아요. (선택)" htmlFor="fb-wish">
            <textarea id="fb-wish" rows={4} maxLength={600} value={wish} onChange={(e) => setWish(e.target.value)}
              className="w-full rounded-xl bg-night border border-line px-4 py-3 text-ivory placeholder:text-faint focus:border-gold/70 outline-none text-[0.95rem]"
              placeholder="예: 매달 알림이 오면 좋겠다 / 연애 궁합만 따로 사고 싶다" />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={submit} disabled={!ready}>의견 정리하기</Button>
            <span className="text-[0.8rem] text-faint">{ready ? `${answered}/5 답함` : `3개 이상 답해 주세요 (${answered}/5)`}</span>
          </div>
          {visited.length < 2 && (
            <p className="text-[0.82rem] text-mist">아직 둘러본 화면이 적어요. <button className="text-gold underline underline-offset-4 cursor-pointer" onClick={() => go(state.profileIsSample ? "start" : "map")}>{state.profileIsSample ? "내 생년월일로 먼저 보기" : "인생 지도 보기"}</button></p>
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <div className="rounded-2xl border border-gold/40 bg-deep p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2"><Badge layer="user">내 의견</Badge><span className="text-[0.82rem] text-faint">고맙습니다</span></div>
            <p className="text-ivory">아래 버튼으로 복사해서, 이 링크를 보내 준 분께 카톡이나 메시지로 붙여 넣어 주세요.</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={copy}>의견 복사하기</Button>
              <Button variant="ghost" onClick={() => setShowText((x) => !x)}>{showText ? "글 숨기기" : "글로 보기"}</Button>
              <Button variant="quiet" onClick={() => { setDone(false); setSave("idle"); }}>답 고치기</Button>
            </div>
            {showText && (
              <textarea readOnly rows={10} value={summary} onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-xl bg-night border border-line px-4 py-3 text-[0.85rem] text-ivory font-mono" aria-label="의견 요약" />
            )}
            <p className={cx("text-[0.8rem]", save === "saved" ? "text-ok" : "text-faint")}>
              {save === "saving" && "자동 저장을 시도하는 중…"}
              {save === "saved" && "운영자에게 자동으로도 저장됐습니다. 복사해서 보내지 않아도 괜찮습니다."}
              {save === "unavailable" && "이 화면에서는 자동 저장이 되지 않아요. 복사해서 보내 주세요."}
            </p>
          </div>
        </section>
      )}
    </Page>
  );
}

/** 다른 화면에 넣는 짧은 안내 카드 */
export function BetaCard() {
  const { go } = useRouter();
  return (
    <button onClick={() => go("feedback")} className="group w-full text-left rounded-2xl border border-gold/30 bg-raised/60 hover:border-gold/60 px-5 py-4 flex items-center gap-4 cursor-pointer">
      <div className="flex-1">
        <p className="text-[0.75rem] text-gold">베타 테스트 중</p>
        <p className="text-ivory text-[0.95rem] mt-0.5">이 서비스, 돈 내고 쓸 만한가요? 30초만 의견을 들려주세요.</p>
      </div>
      <span className="text-gold transition-transform group-hover:translate-x-1" aria-hidden>→</span>
    </button>
  );
}
