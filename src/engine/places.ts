// 방위 판단용 장소 좌표(근사값, 소수 둘째 자리). 8방위 판정에만 쓰므로 수 km 오차는 결과에 영향이 거의 없다.
// 상용 전환 시 행정구역 좌표 원천(국토지리정보원 등)으로 교체한다.
import { CITIES } from "./cities";

export interface Place { name: string; lat: number; lon: number }

const EXTRA: Place[] = [
  { name: "신탄진", lat: 36.45, lon: 127.43 }, { name: "대덕구", lat: 36.35, lon: 127.42 }, { name: "유성", lat: 36.36, lon: 127.36 },
  { name: "세종", lat: 36.48, lon: 127.29 }, { name: "오송", lat: 36.63, lon: 127.33 }, { name: "오창", lat: 36.72, lon: 127.43 },
  { name: "천안", lat: 36.82, lon: 127.11 }, { name: "아산", lat: 36.79, lon: 127.0 }, { name: "평택", lat: 36.99, lon: 127.11 },
  { name: "화성", lat: 37.2, lon: 126.83 }, { name: "용인", lat: 37.24, lon: 127.18 }, { name: "성남", lat: 37.42, lon: 127.13 },
  { name: "판교", lat: 37.4, lon: 127.11 }, { name: "김포", lat: 37.62, lon: 126.72 }, { name: "파주", lat: 37.76, lon: 126.78 },
  { name: "고양", lat: 37.66, lon: 126.83 }, { name: "일산", lat: 37.68, lon: 126.77 }, { name: "의정부", lat: 37.74, lon: 127.03 },
  { name: "안산", lat: 37.32, lon: 126.83 }, { name: "시흥", lat: 37.38, lon: 126.8 }, { name: "송도", lat: 37.38, lon: 126.66 },
  { name: "강남", lat: 37.52, lon: 127.05 }, { name: "마곡", lat: 37.56, lon: 126.83 }, { name: "진천", lat: 36.86, lon: 127.44 },
  { name: "음성", lat: 36.94, lon: 127.69 }, { name: "충주", lat: 36.99, lon: 127.93 }, { name: "당진", lat: 36.89, lon: 126.63 },
  { name: "서산", lat: 36.78, lon: 126.45 }, { name: "구미", lat: 36.12, lon: 128.34 }, { name: "김해", lat: 35.23, lon: 128.89 },
  { name: "양산", lat: 35.34, lon: 129.04 }, { name: "광양", lat: 34.94, lon: 127.7 }, { name: "여수", lat: 34.76, lon: 127.66 },
  { name: "군산", lat: 35.97, lon: 126.74 }, { name: "원주", lat: 37.34, lon: 127.92 }, { name: "속초", lat: 38.21, lon: 128.59 },
  { name: "경주", lat: 35.86, lon: 129.22 }, { name: "목포", lat: 34.81, lon: 126.39 }, { name: "안동", lat: 36.57, lon: 128.73 },
];

export const PLACES: Place[] = [...EXTRA, ...CITIES.map((c) => ({ name: c.name, lat: c.lat, lon: c.lon }))];

/** 글 속에서 아는 장소 이름을 찾는다(긴 이름 우선). */
export function findPlace(text: string): Place | null {
  const hits = PLACES.filter((p) => text.includes(p.name)).sort((a, b) => b.name.length - a.name.length);
  return hits[0] ?? null;
}

/** from → to 방위각(0=북, 90=동)과 거리(km). 짧은 거리용 등거리 근사. */
export function bearing(from: { lat: number; lon: number }, to: { lat: number; lon: number }) {
  const k = Math.cos(((from.lat + to.lat) / 2) * (Math.PI / 180));
  const dx = (to.lon - from.lon) * k, dy = to.lat - from.lat;
  const deg = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
  return { deg, km: Math.sqrt(dx * dx + dy * dy) * 111 };
}

// ---------- 지역 안 후보지(지역 추천용) ----------
// 좌표는 근사값. 후보 목록은 대표 산업 입지 예시이며 실제 분양·매물 여부와 무관하다.
export interface Region { name: string; center: Place; aliases: string[]; sites: (Place & { area: string })[] }

export const REGIONS: Region[] = [
  {
    name: "대전", center: { name: "대전시청", lat: 36.35, lon: 127.38 }, aliases: ["대전", "대덕", "유성"],
    sites: [
      { name: "신탄진 일대", area: "대덕구 북부", lat: 36.45, lon: 127.43 },
      { name: "대덕산업단지", area: "대덕구 문평·신일동", lat: 36.42, lon: 127.42 },
      { name: "대덕테크노밸리", area: "유성구 관평동", lat: 36.43, lon: 127.39 },
      { name: "대전산업단지", area: "대덕구 대화동", lat: 36.37, lon: 127.41 },
      { name: "장대 도시첨단산업단지", area: "유성구 장대동", lat: 36.37, lon: 127.33 },
      { name: "평촌산업단지", area: "서구 평촌동", lat: 36.24, lon: 127.33 },
      { name: "하소산업단지", area: "동구 하소동", lat: 36.28, lon: 127.48 },
    ],
  },
];

/** 글·장소에서 추천 대상 지역을 찾는다. 등록 지역이 없으면 장소 주변 45km를 임시 지역으로 만든다. */
export function findRegion(text: string): Region | null {
  const r = REGIONS.find((x) => x.aliases.some((a) => text.includes(a)) || x.sites.some((s) => text.includes(s.name.split(" ")[0])));
  if (r) return r;
  const p = findPlace(text);
  if (!p) return null;
  const sites = PLACES.filter((q) => q.name !== p.name && bearing(p, q).km < 45).map((q) => ({ ...q, area: "인근 지역" }));
  return sites.length >= 3 ? { name: `${p.name} 일대`, center: p, aliases: [p.name], sites: [{ ...p, area: "중심" }, ...sites].slice(0, 8) } : null;
}
