"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const ROUTES = ["landing", "start", "me", "map", "work", "relation", "lab", "premium", "report", "archive", "method", "feedback"] as const;
export type Route = (typeof ROUTES)[number];

const parse = (): Route => {
  if (typeof window === "undefined") return "landing";
  const h = window.location.hash.replace(/^#/, "");
  return (ROUTES as readonly string[]).includes(h) ? (h as Route) : "landing";
};

interface RouterCtx { route: Route; go: (r: Route, opts?: { anchor?: string }) => void }
const Ctx = createContext<RouterCtx>({ route: "landing", go: () => {} });

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<Route>("landing");
  useEffect(() => {
    setRoute(parse());
    const on = () => setRoute(parse());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = useCallback((r: Route, opts?: { anchor?: string }) => {
    setRoute(r);
    try {
      const next = r === "landing" ? " " : `#${r}`;
      if (r === "landing") history.pushState(null, "", window.location.pathname + window.location.search);
      else if (window.location.hash !== next) window.location.hash = r;
    } catch { /* 샌드박스 환경에서도 상태 전환은 동작 */ }
    requestAnimationFrame(() => {
      if (opts?.anchor) document.getElementById(opts.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0 });
    });
  }, []);
  return <Ctx.Provider value={{ route, go }}>{children}</Ctx.Provider>;
}

export const useRouter = () => useContext(Ctx);
