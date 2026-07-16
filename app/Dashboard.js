import Link from "next/link";
import { STAGES, stageDays } from "../lib/stages";

// regroupement des étapes par pays
const PAYS = [
  { nom: "Mexique", drapeau: "🇲🇽", etapes: [1,2,3,4,5,6,7,8,9], couleur: "#BC5B2E" },
  { nom: "Belize", drapeau: "🇧🇿", etapes: [10], couleur: "#0F9B8E" },
  { nom: "Guatemala", drapeau: "🇬🇹", etapes: [11], couleur: "#5C6B4C" },
  { nom: "Salvador", drapeau: "🇸🇻", etapes: [12], couleur: "#C99A3B" },
];

export default function Dashboard({ stats, dayNum, started }) {
  return (
    <div style={{ marginBottom: 30 }}>
      {/* hero */}
      <div className="dash-hero">
        <div className="dash-hero-inner">
          <p className="eyebrow" style={{ color: "rgba(255,255,255,0.85)" }}>Carnet de voyage</p>
          <h1 className="display" style={{ fontSize: "clamp(30px, 5vw, 50px)", color: "#fff", margin: "8px 0 10px", lineHeight: 1.05 }}>
            Max // Atlas
          </h1>
          <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 16, maxWidth: 400 }}>
            Cent jours en solo, du Mexique au Salvador. Un jour à la fois.
          </p>
          {started && (
            <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(6px)", padding: "8px 16px", borderRadius: 999 }}>
              <span className="mono" style={{ color: "#fff", fontSize: 13 }}>JOUR {dayNum} / 100</span>
            </div>
          )}
        </div>
      </div>

      {/* stats en bref */}
      <div className="dash-stats">
        <Stat n={stats.jours} label="Jours racontés" ic="📅" />
        <Stat n={stats.villes} label="Lieux" ic="📍" />
        <Stat n={stats.photos} label="Photos" ic="📷" />
        <Stat n={stats.rencontres} label="Rencontres" ic="🤝" />
      </div>

      {/* cartes pays */}
      <div className="dash-section-head">
        <h2 className="serif" style={{ fontSize: 20 }}>Les pays traversés</h2>
      </div>
      <div className="dash-pays">
        {PAYS.map((p) => {
          const jours = p.etapes.reduce((s, n) => {
            const st = STAGES.find((x) => x.n === n);
            return s + (st ? stageDays(st) + 1 : 0);
          }, 0);
          return (
            <div key={p.nom} className="pays-card" style={{ "--c": p.couleur }}>
              <div className="pays-flag">{p.drapeau}</div>
              <div className="pays-nom">{p.nom}</div>
              <div className="pays-meta">{jours} jours · {p.etapes.length} étape{p.etapes.length > 1 ? "s" : ""}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ n, label, ic }) {
  return (
    <div className="dash-stat">
      <span className="dash-stat-ic">{ic}</span>
      <span className="dash-stat-n">{n}</span>
      <span className="dash-stat-label">{label}</span>
    </div>
  );
}
