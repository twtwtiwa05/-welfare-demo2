// 합성 좌표(0~1) → 위경도 매핑 + 외부 지도 앱 연결(원탭 길찾기).
// ⚠️ 좌표는 합성이며 수원 인근 ~2km 박스에 *예시 위치*로만 매핑한다(RouteMap과 단일 출처).
//    실서비스에선 법적 근거 하 재식별 후에만 실위치 사용 가능.

import type { Household } from "./types";

export const LAT0 = 37.2636;
export const LAT_SPAN = 0.016;
export const LNG0 = 127.0286;
export const LNG_SPAN = 0.02;

export function toLatLng(h: Household): [number, number] {
  return [LAT0 + (1 - h.coords.y) * LAT_SPAN, LNG0 + h.coords.x * LNG_SPAN];
}

/** 카카오맵 길찾기(도착지) 링크 — 앱 설치 시 앱으로, 미설치 시 웹으로 열린다. */
export function mapRouteUrl(h: Household): string {
  const [lat, lng] = toLatLng(h);
  // 도착지 이름은 마스킹된 식별자만 노출(개인정보 보호 톤 유지)
  return `https://map.kakao.com/link/to/${encodeURIComponent(
    `대상자 ${h.id} (예시 위치)`
  )},${lat.toFixed(6)},${lng.toFixed(6)}`;
}
