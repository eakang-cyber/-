// 시간 처리: 역사적 시간대(서머타임·UTC+8:30 시기 포함), 경도 보정, 균시차.
// 시간대 규칙은 직접 하드코딩하지 않고 실행 환경의 IANA tzdata(Intl)를 사용한다.

export const KOREA_TZ = "Asia/Seoul";
const MIN = 60_000;

export interface Wall {
  y: number; m: number; d: number; h: number; mi: number;
}

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function dtf(tz: string) {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    dtfCache.set(tz, f);
  }
  return f;
}

/** 해당 UTC 순간의 시간대 오프셋(분). */
export function tzOffsetMinutes(utcMs: number, tz = KOREA_TZ): number {
  const parts = Object.fromEntries(dtf(tz).formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / MIN);
}

export const wallToMs = (w: Wall) => Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi);
export function msToWall(ms: number): Wall {
  const d = new Date(ms);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() };
}

export interface LocalToUtcResult {
  utcMs: number;
  offsetMin: number;
  /** 서머타임 전환으로 같은 시각이 두 번 있거나(중복) 존재하지 않는(공백) 경우 */
  anomaly: "none" | "ambiguous" | "nonexistent";
}

/** 현지 벽시계 시각 → UTC. 서머타임 경계의 중복/공백을 감지한다. */
export function localToUtc(w: Wall, tz = KOREA_TZ): LocalToUtcResult {
  const wallMs = wallToMs(w);
  const candidates = new Set<number>();
  for (const probeOffset of [480, 510, 540, 570, 600]) {
    const guess = wallMs - probeOffset * MIN;
    const off = tzOffsetMinutes(guess, tz);
    const utc = wallMs - off * MIN;
    if (tzOffsetMinutes(utc, tz) === off) candidates.add(utc);
  }
  const list = [...candidates].sort((a, b) => a - b);
  if (list.length === 0) {
    // 존재하지 않는 시각(서머타임 시작 직후 공백) — 표준시 기준으로 해석하고 표시한다.
    const off = tzOffsetMinutes(wallMs - 540 * MIN, tz);
    return { utcMs: wallMs - off * MIN, offsetMin: off, anomaly: "nonexistent" };
  }
  const utcMs = list[0];
  return { utcMs, offsetMin: tzOffsetMinutes(utcMs, tz), anomaly: list.length > 1 ? "ambiguous" : "none" };
}

/** 균시차(분). NOAA 근사식, 오차 약 ±1분. 진태양시 = 평균태양시 + 균시차 */
export function equationOfTimeMinutes(utcMs: number): number {
  const start = Date.UTC(new Date(utcMs).getUTCFullYear(), 0, 1);
  const n = Math.floor((utcMs - start) / 86_400_000) + 1;
  const b = (2 * Math.PI * (n - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/** 그레고리력 날짜의 율리우스일(JDN, 정오 기준 정수). */
export function julianDayNumber(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

export function isValidSolarDate(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12 || d < 1) return false;
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= dim;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");
export const fmtWall = (w: Wall) => `${w.y}.${pad2(w.m)}.${pad2(w.d)} ${pad2(w.h)}:${pad2(w.mi)}`;
export const fmtUtcAsKst = (utcMs: number) => {
  const off = tzOffsetMinutes(utcMs);
  return fmtWall(msToWall(utcMs + off * MIN));
};
