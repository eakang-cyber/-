"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { RouterProvider, Route, useRouter } from "./router";
import { StoreProvider, useStore } from "@/state/store";
import { Icon } from "./icons";
import { cx } from "./kit";
import { Landing } from "@/screens/Landing";
import { Onboarding } from "@/screens/Onboarding";
import { Character } from "@/screens/Character";
import { LifeMap } from "@/screens/LifeMap";
import { WorkMoney } from "@/screens/WorkMoney";
import { Relation } from "@/screens/Relation";
import { ChoiceLab } from "@/screens/ChoiceLab";
import { Premium } from "@/screens/Premium";
import { Report } from "@/screens/Report";
import { Archive } from "@/screens/Archive";
import { Method } from "@/screens/Method";
import { Feedback } from "@/screens/Feedback";
import { Counsel } from "@/screens/Counsel";
import { Decision } from "@/screens/Decision";

const MAIN_NAV: { route: Route; label: string; icon: keyof typeof Icon }[] = [
  { route: "ask", label: "고민상담", icon: "ask" },
  { route: "me", label: "나", icon: "me" },
  { route: "map", label: "인생 지도", icon: "map" },
  { route: "work", label: "일·돈", icon: "work" },
  { route: "relation", label: "관계", icon: "relation" },
];
const SUB_NAV: { route: Route; label: string; icon: keyof typeof Icon }[] = [
  { route: "decide", label: "결정 리포트", icon: "lab" },
  { route: "lab", label: "선택 실험실", icon: "lab" },
  { route: "archive", label: "인생 아카이브", icon: "archive" },
  { route: "report", label: "마스터 리포트", icon: "report" },
  { route: "method", label: "계산 기준과 근거", icon: "method" },
  { route: "feedback", label: "의견 보내기", icon: "report" },
];

export function DestinyApp() {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onToast = useCallback((m: string) => {
    setToastMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(null), 2600);
  }, []);
  return (
    <RouterProvider>
      <StoreProvider onToast={onToast}>
        <Shell />
        <div aria-live="polite" className="fixed inset-x-0 bottom-24 lg:bottom-8 z-50 flex justify-center pointer-events-none gutter">
          {toastMsg && <div className="screen-enter rounded-full bg-ivory text-ink px-5 py-2.5 text-[0.9rem] shadow-lg shadow-black/30">{toastMsg}</div>}
        </div>
      </StoreProvider>
    </RouterProvider>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route) {
    case "landing": return <Landing />;
    case "start": return <Onboarding />;
    case "me": return <Character />;
    case "map": return <LifeMap />;
    case "work": return <WorkMoney />;
    case "relation": return <Relation />;
    case "lab": return <ChoiceLab />;
    case "premium": return <Premium />;
    case "report": return <Report />;
    case "archive": return <Archive />;
    case "method": return <Method />;
    case "feedback": return <Feedback />;
    case "ask": return <Counsel />;
    case "decide": return <Decision />;
  }
}

function Shell() {
  const { route, go } = useRouter();
  const { state, dispatch } = useStore();
  const [menu, setMenu] = useState(false);
  useEffect(() => dispatch({ type: "visit", route }), [route, dispatch]);
  const bare = route === "landing" || route === "start";
  useEffect(() => setMenu(false), [route]);
  useEffect(() => {
    const t: Record<Route, string> = {
      landing: "운명OS", start: "출생 정보 입력", me: "나의 인생 캐릭터", map: "0~90세 인생 지도", work: "돈과 일의 지도",
      relation: "관계 시뮬레이터", lab: "인생 선택 실험실", premium: "인생 마스터 리포트", report: "마스터 리포트", archive: "인생 아카이브", method: "계산 기준과 근거", feedback: "의견 보내기", ask: "고민상담소", decide: "결정 리포트",
    };
    document.title = `${t[route]} · DESTINY OS`;
  }, [route]);

  return (
    <div className="min-h-dvh">
      {/* 상단 바 */}
      <header className="sticky top-0 z-40 bg-night/85 backdrop-blur-md border-b border-line/50" style={{ top: "env(safe-area-inset-top, 0px)" }}>
        <div className={cx("gutter h-14 flex items-center gap-3 mx-auto", bare ? "max-w-6xl" : "lg:pl-[17rem] max-w-none")}>
          <button onClick={() => go("landing")} className="flex items-baseline gap-2 cursor-pointer" aria-label="운명OS 처음으로">
            <span className="text-[0.82rem] tracking-[0.32em] font-semibold text-ivory">DESTINY OS</span>
            <span className="text-[0.75rem] text-faint hidden sm:inline">운명OS</span>
          </button>
          <span className="ml-auto" />
          {state.premium && <span className="hidden sm:inline-flex h-6 items-center rounded-full border border-warn/60 px-2.5 text-[0.7rem] text-warn">데모 프리미엄</span>}
          {!bare && (
            <button onClick={() => go("archive")} className="lg:hidden h-10 w-10 grid place-items-center rounded-full text-mist hover:text-ivory cursor-pointer" aria-label="인생 아카이브">
              <Icon.archive />
            </button>
          )}
          {bare ? (
            <button onClick={() => go("me")} className="text-[0.85rem] text-mist hover:text-gold cursor-pointer">예시 둘러보기</button>
          ) : (
            <button onClick={() => setMenu(true)} className="lg:hidden h-10 w-10 grid place-items-center rounded-full text-mist hover:text-ivory cursor-pointer" aria-label="전체 메뉴 열기" aria-expanded={menu}>
              <Icon.menu />
            </button>
          )}
        </div>
      </header>

      {/* 데스크톱 사이드바 */}
      {!bare && (
        <nav aria-label="주요 화면" className="hidden lg:flex fixed left-0 top-14 bottom-0 w-[16rem] flex-col gap-1 border-r border-line/50 px-4 py-6 bg-night">
          <ProfileChip />
          <div className="h-4" />
          {MAIN_NAV.map((n) => <SideItem key={n.route} {...n} active={route === n.route} onClick={() => go(n.route)} />)}
          <div className="my-3 h-px bg-line/60" />
          {SUB_NAV.map((n) => <SideItem key={n.route} {...n} active={route === n.route || (n.route === "report" && route === "premium")} onClick={() => go(n.route)} />)}
          <p className="mt-auto text-[0.72rem] leading-relaxed text-faint">Phase 1 프로토타입 · 입력 정보는 서버로 전송되지 않습니다.</p>
        </nav>
      )}

      <main className={cx(!bare && "lg:pl-[16rem] pb-28 lg:pb-16")}>
        <div key={route} className="screen-enter">
          <Screen route={route} />
        </div>
      </main>

      {/* 모바일 하단 탭 */}
      {!bare && (
        <nav aria-label="주요 화면" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-night/92 backdrop-blur-md border-t border-line/60 safe-bottom gutter">
          <ul className="grid grid-cols-5 max-w-lg mx-auto">
            {MAIN_NAV.map((n) => {
              const I = Icon[n.icon];
              const active = route === n.route;
              return (
                <li key={n.route}>
                  <button onClick={() => go(n.route)} aria-current={active ? "page" : undefined}
                    className={cx("w-full flex flex-col items-center gap-0.5 pt-2.5 pb-1 text-[0.7rem] cursor-pointer", active ? "text-gold" : "text-faint hover:text-mist")}>
                    <I />{n.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* 모바일 전체 메뉴 */}
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="전체 메뉴">
          <button className="absolute inset-0 bg-black/50 cursor-default" aria-label="메뉴 닫기" onClick={() => setMenu(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[min(20rem,86vw)] bg-deep border-l border-line p-5 flex flex-col gap-1 screen-enter" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top, 0px))" }}>
            <div className="flex items-center mb-4">
              <span className="text-[0.8rem] tracking-[0.3em] font-semibold">DESTINY OS</span>
              <button onClick={() => setMenu(false)} className="ml-auto h-10 w-10 grid place-items-center text-mist cursor-pointer" aria-label="닫기"><Icon.close /></button>
            </div>
            <ProfileChip />
            <div className="h-3" />
            {[...MAIN_NAV, ...SUB_NAV].map((n) => <SideItem key={n.route} {...n} active={route === n.route} onClick={() => go(n.route)} />)}
            <div className="my-2 h-px bg-line/60" />
            <SideItem route="start" label="출생 정보 다시 입력" icon="plus" active={false} onClick={() => go("start")} />
          </div>
        </div>
      )}
    </div>
  );
}

function SideItem({ label, icon, active, onClick }: { route: Route; label: string; icon: keyof typeof Icon; active: boolean; onClick: () => void }) {
  const I = Icon[icon];
  return (
    <button onClick={onClick} aria-current={active ? "page" : undefined}
      className={cx("flex items-center gap-3 h-11 px-3 rounded-xl text-[0.93rem] cursor-pointer text-left", active ? "bg-raised text-gold" : "text-mist hover:text-ivory hover:bg-deep")}>
      <I />{label}
    </button>
  );
}

function ProfileChip() {
  const { state, subject, chart } = useStore();
  const { go } = useRouter();
  return (
    <button onClick={() => go("start")} className="rounded-xl border border-line/70 bg-deep px-3.5 py-3 text-left cursor-pointer hover:border-gold/50">
      <div className="flex items-center gap-2">
        <span className="text-[0.95rem] text-ivory font-medium">{subject.name || "나"}</span>
        {state.profileIsSample && <span className="text-[0.68rem] text-warn border border-warn/50 rounded-full px-2">예시</span>}
      </div>
      <div className="text-[0.75rem] text-faint tabular mt-0.5">
        {chart.solarDate.y}.{String(chart.solarDate.m).padStart(2, "0")}.{String(chart.solarDate.d).padStart(2, "0")} · {subject.timeKnown ? `${String(subject.hour).padStart(2, "0")}:${String(subject.minute).padStart(2, "0")}` : "시간 미상"}
      </div>
    </button>
  );
}
