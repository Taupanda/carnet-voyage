"use client";
import { useEffect, useRef, useState } from "react";
import { STAGES, stageForDate } from "../lib/stages";

export default function TripMap({ points }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setFailed(true);
      return;
    }

    // load mapbox-gl from CDN (no npm install needed)
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js";
    script.onload = () => setReady(true);
    script.onerror = () => setFailed(true);
    document.head.appendChild(script);

    return () => {
      css.remove();
      script.remove();
    };
  }, []);

  useEffect(() => {
    if (!ready || !window.mapboxgl || mapRef.current || !containerRef.current) return;
    const mapboxgl = window.mapboxgl;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: points.length ? [points[points.length - 1].lng, points[points.length - 1].lat] : [-99.13, 19.43],
      zoom: points.length ? 4.2 : 3.6,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      if (!points.length) return;

      // trail line
      map.addSource("trail", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: points.map((p) => [p.lng, p.lat]),
          },
        },
      });
      map.addLayer({
        id: "trail-line",
        type: "line",
        source: "trail",
        paint: {
          "line-color": "#F7F1E8",
          "line-width": 2.5,
          "line-opacity": 0.75,
          "line-dasharray": [2, 1.5],
        },
      });

      // day points
      map.addSource("days", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: points.map((p) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [p.lng, p.lat] },
            properties: {
              titre: p.titre,
              jour: p.day_number,
              date: p.date,
              couleur: stageForDate(p.date)?.couleur || "#F2A93B",
            },
          })),
        },
      });
      map.addLayer({
        id: "day-dots",
        type: "circle",
        source: "days",
        paint: {
          "circle-radius": ["case", ["==", ["get", "jour"], points[points.length - 1].day_number], 9, 5.5],
          "circle-color": ["get", "couleur"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#16111C",
        },
      });

      // fit to the trail
      const bounds = points.reduce(
        (b, p) => b.extend([p.lng, p.lat]),
        new mapboxgl.LngLatBounds([points[0].lng, points[0].lat], [points[0].lng, points[0].lat])
      );
      map.fitBounds(bounds, { padding: 50, maxZoom: 7, duration: 0 });

      // popups
      map.on("click", "day-dots", (e) => {
        const f = e.features[0];
        new mapboxgl.Popup({ offset: 12, closeButton: false })
          .setLngLat(f.geometry.coordinates)
          .setHTML(
            `<div style="font-family:system-ui;padding:2px 4px">
               <div style="font-size:10px;color:#F2A93B;text-transform:uppercase;letter-spacing:0.5px">Jour ${f.properties.jour}</div>
               <div style="font-size:13px;color:#1E2340;font-weight:600">${f.properties.titre}</div>
             </div>`
          )
          .addTo(map);
      });
      map.on("mouseenter", "day-dots", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "day-dots", () => (map.getCanvas().style.cursor = ""));
    });
  }, [ready, points]);

  if (failed) {
    return (
      <div style={{ height: 340, borderRadius: 14, background: "var(--bg3)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13 }}>
        Carte indisponible
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div ref={containerRef} style={{ height: 340, borderRadius: 14, overflow: "hidden", border: "1px solid var(--line)" }} />
      {points.length === 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13, pointerEvents: "none" }}>
          Le tracé apparaîtra avec le premier jour publié
        </div>
      )}
    </div>
  );
}
