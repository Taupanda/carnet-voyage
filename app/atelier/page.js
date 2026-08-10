"use client";
import Link from "next/link";
import AdminGate from "../AdminGate";
import { useMode } from "../ModeProvider";

const APPS = [
  { href: "/journal", label: "Journal", ic: "✏️", c: "#BC5B2E" },
  { href: "/budget", label: "Budget", ic: "💰", c: "#5C6B4C" },
  { href: "/workout", label: "Workout", ic: "💪", c: "#C99A3B" },
  { href: "/convertisseur", label: "Change", ic: "💱", c: "#3F8CA5" },
  { href: "/reservations", label: "Réserv.", ic: "🏨", c: "#8B5A8C" },
  { href: "/coffre", label: "Coffre", ic: "🔐", c: "#6B7280" },
  { href: "/checklist", label: "Check-list", ic: "✅", c: "#5C6B4C" },
  { href: "/resumes", label: "Résumés", ic: "📮", c: "#C99A3B" },
  { href: "/livre-d-or", label: "Livre d'or", ic: "💛", c: "#D9A441" },
];

export default function Atelier() {
  return (
    <AdminGate>
      <AtelierBody />
    </AdminGate>
  );
}

function AtelierBody() {
  const { setMode } = useMode();
  return (
    <main className="container-wide" style={{ paddingTop: 26, paddingBottom: 70 }}>
      <div className="atelier-top">
        <h1 className="display" style={{ fontSize: "clamp(24px, 5vw, 36px)" }}>Menu</h1>
        <button className="btn-secondary" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setMode("user")}>
          👁 Voir le site
        </button>
      </div>

      <div className="atelier-grid">
        {APPS.map((a) => (
          <Link key={a.href} href={a.href} className="app-tile" style={{ "--c": a.c }}>
            <span className="app-tile-ic">{a.ic}</span>
            <span className="app-tile-label">{a.label}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
