"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMode } from "./ModeProvider";
import { supabaseBrowser } from "../lib/supabaseClient";
import { todayLocal } from "../lib/stages";
import { jetonCourant } from "../lib/jeton";

// Quatre destinations et un bouton d'ajout. Elles absorbent les dix-neuf
// entrées du Menu : Outils recueille tout ce qui n'est ni le voyage, ni le
// carnet, ni un geste du jour.
const ONGLETS = [
  { href: "/accueil", label: "Accueil", ic: "⌂" },
  { href: "/journal", label: "Journal", ic: "📖" },
  { href: "/itineraire", label: "Voyage", ic: "🧭", aussi: ["/planning"] },
  { href: "/atelier", label: "Outils", ic: "⚙" },
];

export default function BarreAdmin() {
  const { adminView } = useMode();
  const pathname = usePathname();
  const [journeeManquante, setJourneeManquante] = useState(false);

  useEffect(() => {
    if (!adminView) return;
    let annule = false;
    (async () => {
      try {
        const token = await jetonCourant();
        if (!token) return;
        const jour = todayLocal();
        const res = await fetch(`/api/entries?date=${jour}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const rows = await res.json();
        if (!annule) setJourneeManquante(!rows.some((r) => r.date === jour));
      } catch {}
    })();
    return () => { annule = true; };
  }, [adminView, pathname]);

  if (!adminView) return null;

  const actif = (o) => pathname === o.href || (o.aussi || []).includes(pathname);

  return (
    <nav className="barre-admin" aria-label="Navigation">
      {ONGLETS.slice(0, 2).map((o) => (
        <Link key={o.href} href={o.href} className={"barre-geste" + (actif(o) ? " on" : "")}>
          <span className="barre-ic">
            {o.ic}
            {/* La journée pas encore écrite se signale ici plutôt que sur le
                bouton d'ajout : une pastille collée au cercle le faisait
                paraître de travers. */}
            {o.href === "/journal" && journeeManquante && (
              <span className="barre-pastille" aria-hidden="true" />
            )}
          </span>
          <span className="barre-label">{o.label}</span>
        </Link>
      ))}

      {/* Ajouter un post, c'est raconter sa journée : un seul geste pour les
          deux, plutôt qu'un bouton et une carte qui font la même chose. */}
      <Link
        href="/journal"
        className={"barre-fab" + (journeeManquante ? " du" : "")}
        aria-label={journeeManquante ? "Raconter ma journée — pas encore écrite" : "Raconter ma journée"}
      >
        +
      </Link>

      {ONGLETS.slice(2).map((o) => (
        <Link key={o.href} href={o.href} className={"barre-geste" + (actif(o) ? " on" : "")}>
          <span className="barre-ic">{o.ic}</span>
          <span className="barre-label">{o.label}</span>
        </Link>
      ))}
    </nav>
  );
}
