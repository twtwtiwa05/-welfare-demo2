import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { computeScore, riskBand, type Band } from "../../lib/scoring";
import type { Household } from "../../lib/types";
import SimBadge from "../SimBadge";
import { MapPin } from "lucide-react";

// ★ 실제 지도(OpenStreetMap) 위에 방문 동선을 올린다 — 사실감.
// ⚠️ 좌표는 합성(0~1)이며, 데모 사실감을 위해 실제 주거지(수원 인근) 위에 *예시 위치*로 매핑한다.
//    실제 주소가 아니다 — 실서비스에선 법적 근거 하 재식별 후에만 실위치 표시가 가능하다.
const DOT: Record<Band, string> = {
  high: "#ef4444",
  mid: "#f59e0b",
  low: "#94a3b8",
};
const sc = (h: Household) => computeScore(h.signals, h.profileGroup).score;

// 합성 좌표(0~1) → 위경도. 수원 인근 ~2km 박스(세 모녀 사건 맥락).
const LAT0 = 37.2636;
const LAT_SPAN = 0.016;
const LNG0 = 127.0286;
const LNG_SPAN = 0.02;
function toLatLng(h: Household): [number, number] {
  return [LAT0 + (1 - h.coords.y) * LAT_SPAN, LNG0 + h.coords.x * LNG_SPAN];
}

function numberedIcon(n: number, color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#fff;border:2.5px solid ${color};color:#1e293b;font-weight:700;font-size:13px;box-shadow:0 1px 5px rgba(15,23,42,.35)">${n}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function RouteMap({
  all,
  stops,
  onPick,
}: {
  all: Household[];
  stops: Household[];
  onPick: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  // 지도 1회 초기화
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false, // 페이지 스크롤 우선 (모바일 친화)
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);
    map.setView([LAT0 + LAT_SPAN / 2, LNG0 + LNG_SPAN / 2], 15);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // 컨테이너 사이징 보정
    const t = window.setTimeout(() => map.invalidateSize(), 80);
    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // 마커·경로 갱신
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const stopIds = new Set(stops.map((s) => s.id));

    // 경로 밖 후보 (흐리게)
    all.forEach((h) => {
      if (stopIds.has(h.id)) return;
      L.circleMarker(toLatLng(h), {
        radius: 5,
        color: DOT[riskBand(sc(h))],
        weight: 1,
        opacity: 0.35,
        fillOpacity: 0.3,
      })
        .addTo(layer)
        .on("click", () => onPickRef.current(h.id));
    });

    // 경로선
    if (stops.length > 1) {
      L.polyline(stops.map(toLatLng), {
        color: "#2f6bbf",
        weight: 4,
        opacity: 0.85,
        lineJoin: "round",
      }).addTo(layer);
    }

    // 번호 정류장
    stops.forEach((h, i) => {
      L.marker(toLatLng(h), { icon: numberedIcon(i + 1, DOT[riskBand(sc(h))]) })
        .addTo(layer)
        .on("click", () => onPickRef.current(h.id));
    });

    // 화면 맞춤
    if (stops.length > 0) {
      map.fitBounds(L.latLngBounds(stops.map(toLatLng)).pad(0.6), {
        maxZoom: 16,
        animate: false,
      });
    }
  }, [all, stops]);

  return (
    <div className="card overflow-hidden">
      <div className="card-head">
        <span className="card-title flex items-center gap-1.5">
          <MapPin size={15} className="text-brand-600" /> 방문 동선
        </span>
        <span className="text-[11px] text-slate-400">예시 위치 · 실제 주소 아님</span>
      </div>

      <div
        ref={containerRef}
        className="w-full"
        style={{ height: "46vh", minHeight: 280, zIndex: 0 }}
        role="img"
        aria-label={`방문 동선 지도 — ${stops.length}곳을 번호 순서로 연결`}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
        <span>번호 = 방문 순서</span>
        <Legend color={DOT.high} label="고위험" />
        <Legend color={DOT.mid} label="주의" />
        <Legend color={DOT.low} label="관찰" />
        <span className="ml-auto inline-flex items-center gap-1">
          <SimBadge label="합성 좌표" /> 실위치 아님
        </span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
