// 출생 도시 — 진태양시(경도) 보정에만 사용한다. 좌표는 시청 기준 근사값(소수 둘째 자리).
// 상용 전환 시 행정구역 좌표 원천 데이터로 교체하고 출처를 기록한다.
export interface City { id: string; name: string; lon: number; lat: number }

export const CITIES: City[] = [
  { id: "seoul", name: "서울", lon: 126.98, lat: 37.57 },
  { id: "busan", name: "부산", lon: 129.08, lat: 35.18 },
  { id: "incheon", name: "인천", lon: 126.71, lat: 37.46 },
  { id: "daegu", name: "대구", lon: 128.6, lat: 35.87 },
  { id: "daejeon", name: "대전", lon: 127.38, lat: 36.35 },
  { id: "gwangju", name: "광주", lon: 126.85, lat: 35.16 },
  { id: "ulsan", name: "울산", lon: 129.31, lat: 35.54 },
  { id: "suwon", name: "수원", lon: 127.03, lat: 37.26 },
  { id: "cheongju", name: "청주", lon: 127.49, lat: 36.64 },
  { id: "jeonju", name: "전주", lon: 127.15, lat: 35.82 },
  { id: "chuncheon", name: "춘천", lon: 127.73, lat: 37.88 },
  { id: "gangneung", name: "강릉", lon: 128.88, lat: 37.75 },
  { id: "changwon", name: "창원", lon: 128.68, lat: 35.23 },
  { id: "pohang", name: "포항", lon: 129.34, lat: 36.02 },
  { id: "jeju", name: "제주", lon: 126.53, lat: 33.5 },
];

export const cityById = (id: string) => CITIES.find((c) => c.id === id) ?? CITIES[0];
