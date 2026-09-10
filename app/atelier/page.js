"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminGate from "../AdminGate";

// Le Menu est le seul carrefour de navigation : il indexe le blog public ET les
// outils de l'auteur. Quatre sections nommées plutôt qu'un damier de vingt
// tuiles — on lit quatre listes courtes au lieu de balayer une grille.
const SECTIONS = [
  {
    titre: "Le blog",
    aide: "Ce que voient les visiteurs",
    apps: [
      { href: "/", label: "Journal", ic: "📖", c: "#BC5B2E" },
      { href: "/itineraire", label: "Itinéraire", ic: "🧭", c: "#3F8CA5" },
      { href: "/album", label: "Album", ic: "🖼️", c: "#8B5A8C" },
      { href: "/rencontres", label: "Rencontres", ic: "🤝", c: "#5C6B4C" },
      { href: "/recos", label: "Conseils", ic: "💡", c: "#C99A3B" },
      { href: "/livre-d-or", label: "Livre d'or", ic: "💛", c: "#D9A441" },
    ],
  },
  {
    titre: "Écrire",
    aide: "Le carnet, jour après jour",
    apps: [
      { href: "/journal", label: "Raconter", ic: "✏️", c: "#BC5B2E" },
      { href: "/notes", label: "Calepin", ic: "📝", c: "#C4703A" },
      { href: "/resumes", label: "Résumés", ic: "📮", c: "#C99A3B" },
      { href: "/livre", label: "Le livre", ic: "📕", c: "#8B5A2E" },
    ],
  },
  {
    titre: "En voyage",
    aide: "Ce qui sert sur la route",
    apps: [
      { href: "/planning", label: "Planning", ic: "🗓️", c: "#7A6BA8" },
      { href: "/reservations", label: "Réservations", ic: "🏨", c: "#8B5A8C" },
      { href: "/coffre", label: "Coffre", ic: "🔐", c: "#6B7280" },
      { href: "/checklist", label: "Check-list", ic: "✅", c: "#5C6B4C" },
      { href: "/convertisseur", label: "Change", ic: "💱", c: "#3F8CA5" },
      { href: "/vocabulaire", label: "Vocabulaire", ic: "🗣️", c: "#3F8CA5" },
    ],
  },
  {
    titre: "Gestion",
    aide: "De loin en loin",
    apps: [
      { href: "/budget", label: "Budget", ic: "💰", c: "#5C6B4C" },
      { href: "/workout", label: "Workout", ic: "💪", c: "#C99A3B" },
      { href: "/moderation", label: "Modération", ic: "🛡️", c: "#6B7280" },
    ],
  },
];

export default function Atelier() {
  return (
    <AdminGate>
      <AtelierBody />
    </AdminGate>
  );
}

function AtelierBody() {
  const path = usePathname();
  return (
    <main className="container-wide" style={{ paddingTop: 26, paddingBottom: 70 }}>
      <div className="atelier-top">
        <h1 className="display" style={{ fontSize: "clamp(24px, 5vw, 36px)" }}>Menu</h1>
      </div>

      {SECTIONS.map((s) => (
        <section key={s.titre} className="atelier-bloc">
          <div className="atelier-bloc-tete">
            <h2>{s.titre}</h2>
            <span>{s.aide}</span>
          </div>
          <div className="atelier-grid">
            {s.apps.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={"app-tile" + (path === a.href ? " on" : "")}
                style={{ "--c": a.c }}
              >
                <span className="app-tile-ic">{a.ic}</span>
                <span className="app-tile-label">{a.label}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
