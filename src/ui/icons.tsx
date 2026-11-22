// 1.5px 선 아이콘. 장식이 아닌 내비게이션 식별용.
const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
export const Icon = {
  me: () => (<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...P}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" /></svg>),
  map: () => (<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...P}><path d="M3 17c3-6 6-6 9-3s6 3 9-4" /><circle cx="12" cy="14" r="1.6" /><path d="M3 21h18" /></svg>),
  work: () => (<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...P}><rect x="3.5" y="7" width="17" height="12" rx="2" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17" /></svg>),
  relation: () => (<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...P}><circle cx="9" cy="12" r="5" /><circle cx="15" cy="12" r="5" /></svg>),
  lab: () => (<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...P}><path d="M12 4v16M5 8h5M14 16h5" /><circle cx="7.5" cy="8" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></svg>),
  archive: () => (<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...P}><rect x="3.5" y="4" width="17" height="5" rx="1.5" /><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4" /></svg>),
  report: () => (<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...P}><path d="M6 3.5h9l4 4V20a.5.5 0 0 1-.5.5h-12.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" /><path d="M14.5 3.5V8h4.5M8.5 12.5h7M8.5 16h5" /></svg>),
  method: () => (<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...P}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>),
  ask: () => (<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...P}><path d="M5 4.5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-7l-4.5 3.5v-3.5H5a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" /><path d="M9.5 9.2a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.6-.8 1.1v.3M12 14.6h.01" /></svg>),
  menu: () => (<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...P}><path d="M4 7h16M4 12h16M4 17h10" /></svg>),
  close: () => (<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...P}><path d="M6 6l12 12M18 6 6 18" /></svg>),
  arrow: () => (<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...P}><path d="M5 12h14M13 6l6 6-6 6" /></svg>),
  back: () => (<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...P}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>),
  plus: () => (<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...P}><path d="M12 5v14M5 12h14" /></svg>),
  lock: () => (<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden {...P}><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>),
  shield: () => (<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...P}><path d="M12 3.5 5 6v5.5c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6z" /><path d="m9 12 2 2 4-4" /></svg>),
};
