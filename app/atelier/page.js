"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminGate from "../AdminGate";
import { OUTILS } from "../../lib/outils";

// Une grille plate, sans titre : la barre du bas dit déjà « Outils ». Les
// sections nommées reprenaient de la place et obligeaient à se demander dans
// quelle catégorie un outil avait été rangé ; l'ordre du catalogue, de l'outil
// quotidien au plus rare, fait le travail sans rien écrire.
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
    <main className="container-wide" style={{ paddingTop: 12, paddingBottom: 20 }}>
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
