// 독립 검증용: 태양 겉보기 황경 저정밀 계산(Meeus, Astronomical Algorithms 25장 저정밀식).
// 정밀도는 약 0.01°(≈15분) 수준이므로 절기 시각 '교차 확인'에만 사용한다.

export function sunApparentLongitude(utcMs: number): number {
  const jd = utcMs / 86_400_000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const r = Math.PI / 180;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * r)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M * r) + 0.000289 * Math.sin(3 * M * r);
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * r);
  return ((lambda % 360) + 360) % 360;
}

/** 태양 황경이 target(도)에 도달하는 UTC 시각을 근방 탐색으로 찾는다. */
export function findSolarLongitude(targetDeg: number, nearUtcMs: number): number {
  let lo = nearUtcMs - 20 * 86_400_000, hi = nearUtcMs + 20 * 86_400_000;
  const f = (t: number) => {
    const d = sunApparentLongitude(t) - targetDeg;
    return ((d + 540) % 360) - 180;
  };
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** 12절의 태양 황경 */
export const JIE_LONGITUDE: Record<string, number> = {
  立春: 315, 惊蛰: 345, 清明: 15, 立夏: 45, 芒种: 75, 小暑: 105, 立秋: 135, 白露: 165, 寒露: 195, 立冬: 225, 大雪: 255, 小寒: 285,
};
