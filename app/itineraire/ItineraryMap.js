"use client";
import { useEffect, useRef } from "react";

export default function ItineraryMap({ phases, activeId }) {
  const ref = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // charger Leaflet depuis le CDN
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => init();
    document.head.appendChild(script);

    function init() {
      const L = window.L;
      if (!L || !ref.current || mapRef.current) return;
      const map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: false });
      mapRef.current = map;
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd", maxZoom: 19,
      }).addTo(map);

      const pts = [];
      phases.forEach((p) => {
        const c = p.cities[0];
        pts.push([c.lat, c.lng]);
        const icon = L.divIcon({
          className: "",
          html: `<div style="background:${p.color};width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#15101A;font-family:monospace;font-weight:700;font-size:11px;border:2px solid #16111C;box-shadow:0 0 0 3px rgba(255,255,255,0.18)">${p.num}</div>`,
          iconSize: [26, 26], iconAnchor: [13, 13],
        });
        L.marker([c.lat, c.lng], { icon }).addTo(map).bindTooltip(`${p.num}. ${p.title}`);
      });
      L.polyline(pts, { color: "#F2A93B", weight: 2, dashArray: "2,8", opacity: 0.85 }).addTo(map);
      map.fitBounds(L.latLngBounds(pts), { padding: [30, 30] });
      setTimeout(() => map.invalidateSize(), 200);
    }

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [phases]);

  return <div ref={ref} style={{ width: "100%", height: 360, borderRadius: 14, overflow: "hidden", border: "1px solid var(--line)", background: "#0D1119" }} />;
}
