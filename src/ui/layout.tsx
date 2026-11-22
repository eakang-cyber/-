"use client";
import { useStore } from "@/state/store";
import { useRouter } from "./router";
import { Badge, Button, cx } from "./kit";

/** 앱 화면 공통 래퍼: 모바일 단일 컬럼, 데스크톱 넓은 읽기 컬럼 */
export function Page({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={cx("gutter mx-auto w-full py-6 lg:py-10 flex flex-col gap-8", wide ? "max-w-[64rem]" : "max-w-[46rem]")}>{children}</div>;
}

/** 화면 제목(h1) */
export function ScreenTitle({ eyebrow, title, desc, children }: { eyebrow: string; title: string; desc?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-3">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="font-display text-[1.75rem] lg:text-[2.1rem] leading-[1.3] font-semibold text-ivory">{title}</h1>
      {desc && <p className="text-mist text-[0.98rem] leading-relaxed max-w-[40rem]">{desc}</p>}
      {children}
    </header>
  );
}

/** 샘플 사용자로 보고 있음을 항상 알린다 */
export function SampleBanner() {
  const { state, subject } = useStore();
  const { go } = useRouter();
  if (!state.profileIsSample) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warn/40 bg-warn/5 px-4 py-3">
      <Badge layer="sample" />
      <p className="text-[0.85rem] text-ivory/90 flex-1 min-w-[12rem]">
        테스트 사용자 <b className="font-medium">{subject.name}</b>님의 출생 정보(1996.03.27 09:58 서울)로 계산한 결과입니다.
      </p>
      <Button size="sm" variant="ghost" onClick={() => go("start")}>내 정보로 보기</Button>
    </div>
  );
}

/** 계산 상태 표시: 미검증 */
export function CalcStatus() {
  const { go } = useRouter();
  const { chart } = useStore();
  return (
    <div className="flex flex-wrap items-center gap-2 text-[0.8rem] text-faint">
      <Badge layer="calc" />
      <Badge layer="unverified" />
      <span>{chart.engineVersion} · 독립 자료 대조 전 결과입니다.</span>
      <button onClick={() => go("method")} className="underline underline-offset-4 decoration-line hover:text-gold cursor-pointer">계산 기준 보기</button>
    </div>
  );
}

/** 다음 화면으로 자연스럽게 이어지는 카드 */
export function NextStep({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group w-full text-left rounded-2xl border border-line/70 bg-deep hover:border-gold/50 p-5 flex items-center gap-4 cursor-pointer">
      <div className="flex-1">
        <p className="text-[0.78rem] text-faint">다음으로</p>
        <p className="font-display text-[1.1rem] font-semibold text-ivory mt-0.5">{title}</p>
        <p className="text-[0.88rem] text-mist mt-1">{desc}</p>
      </div>
      <span className="text-gold transition-transform group-hover:translate-x-1" aria-hidden>→</span>
    </button>
  );
}
