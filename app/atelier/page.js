"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminGate from "../AdminGate";

// Le Menu est le seul carrefour de navigation : il indexe le blog public ET les
// outils de l'auteur. Quatre sections nommées plutôt qu'un damier de vingt
// tuiles — on lit quatre listes courtes au lieu de balayer une grille.
const SECTIONS = [
  {
    titre: "Se poser sur le voyage",
    aide: "Quand tu prends le temps",
    apps: [
      { href: "/itineraire", label: "Itinéraire", ic: "🧭", c: "#3F8CA5" },
      { href: "/planning", label: "Planning", ic: "🗓️", c: "#7A6BA8" },
      { href: "/reservations", label: "Réservations", ic: "🏨", c: "#8B5A8C" },
    ],
  },
  {
    titre: "Le carnet",
    aide: "Écrire et publier",
    apps: [
      { href: "/journal", label: "Raconter", ic: "✏️", c: "#BC5B2E" },
      { href: "/notes", label: "Calepin", ic: "📝", c: "#C4703A" },
      { href: "/rencontres", label: "Rencontres", ic: "🤝", c: "#5C6B4C" },
      { href: "/resumes", label: "Résumés", ic: "📮", c: "#C99A3B" },
      { href: "/livre", label: "Le livre", ic: "📕", c: "#8B5A2E" },
    ],
  },
  {
    titre: "Mon suivi",
    aide: "Ce que je trace",
    apps: [
      { href: "/budget", label: "Budget", ic: "💰", c: "#5C6B4C" },
      { href: "/workout", label: "Workout", ic: "💪", c: "#C99A3B" },
      { href: "/vocabulaire", label: "Vocabulaire", ic: "🗣️", c: "#3F8CA5" },
      { href: "/coffre", label: "Coffre", ic: "🔐", c: "#6B7280" },
      { href: "/convertisseur", label: "Change", ic: "💱", c: "#3F8CA5" },
    ],
  },
  {
    titre: "Le blog et les retours",
    aide: "Ce que voient et disent les autres",
    apps: [
      { href: "/", label: "Journal public", ic: "📖", c: "#BC5B2E" },
      { href: "/album", label: "Album", ic: "🖼️", c: "#8B5A8C" },
      { href: "/recos", label: "Conseils", ic: "💡", c: "#C99A3B" },
      { href: "/livre-d-or", label: "Livre d'or", ic: "💛", c: "#D9A441" },
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
    <main className="container-wide" style={{ paddingTop: 14, paddingBottom: 20 }}>
      <div className="atelier-top">
        <h1 className="display" style={{ fontSize: "clamp(19px, 3.5vw, 25px)" }}>Menu</h1>
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
