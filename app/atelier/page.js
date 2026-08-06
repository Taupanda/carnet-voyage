"use client";
import Link from "next/link";
import AdminGate from "../AdminGate";

const APPS = [
  { href: "/journal", label: "Journal", desc: "Écrire & publier", ic: "✏️", c: "#BC5B2E" },
  { href: "/budget", label: "Budget", desc: "Suivi des dépenses", ic: "💰", c: "#5C6B4C" },
  { href: "/workout", label: "Workout", desc: "Séances & assiduité", ic: "💪", c: "#C99A3B" },
  { href: "/convertisseur", label: "Convertisseur", desc: "Peso ⇄ euro", ic: "💱", c: "#3F8CA5" },
  { href: "/reservations", label: "Réservations", desc: "Hôtels, transport, billets", ic: "🏨", c: "#8B5A8C" },
  { href: "/coffre", label: "Coffre", desc: "Documents importants", ic: "🔐", c: "#6B7280" },
  { href: "/checklist", label: "Check-list", desc: "Valise & préparatifs", ic: "✅", c: "#5C6B4C" },
  { href: "/resumes", label: "Résumés", desc: "Le récap hebdo (IA)", ic: "📮", c: "#C99A3B" },
];

export default function Atelier() {
  return (
    <AdminGate>
      <main className="container-wide" style={{ paddingTop: 30, paddingBottom: 70 }}>
        <p className="eyebrow">Mode éditeur</p>
        <h1 className="display" style={{ fontSize: "clamp(26px, 5vw, 40px)", margin: "8px 0 6px" }}>Atelier</h1>
        <p style={{ color: "var(--muted)", marginBottom: 26 }}>Tes outils de bord, en un clic.</p>

        <div className="atelier-grid">
          {APPS.map((a) => (
            <Link key={a.href} href={a.href} className="app-tile" style={{ "--c": a.c }}>
              <span className="app-tile-ic">{a.ic}</span>
              <span className="app-tile-label">{a.label}</span>
              <span className="app-tile-desc">{a.desc}</span>
            </Link>
          ))}
        </div>
      </main>
    </AdminGate>
  );
}
