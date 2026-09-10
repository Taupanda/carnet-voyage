"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminGate from "../AdminGate";
import { OUTILS } from "../../lib/outils";

// Une grille plate. Les sections nommées reprenaient de la place et obligeaient
// à se demander dans quelle catégorie un outil avait été rangé : sur dix-huit
// entrées tenant sur un écran, la question ne se pose plus.
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
      <h1 className="display" style={{ fontSize: "clamp(19px, 3.5vw, 25px)", marginBottom: 12 }}>Outils</h1>
      <div className="atelier-grid">
        {OUTILS.map((o) => (
          <Link key={o.href} href={o.href} className={"app-tile" + (path === o.href ? " on" : "")}>
            <span className="app-tile-ic">{o.ic}</span>
            <span className="app-tile-label">{o.label}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
