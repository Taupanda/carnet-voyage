"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMode } from "./ModeProvider";
import { supabaseBrowser } from "../lib/supabaseClient";
import { todayLocal } from "../lib/stages";

// Quatre destinations et un bouton d'ajout. Elles absorbent les dix-neuf
// entrées du Menu : Outils recueille tout ce qui n'est ni le voyage, ni le
// carnet, ni un geste du jour.
const ONGLETS = [
  { href: "/accueil", label: "Accueil", ic: "⌂" },
  { href: "/itineraire", label: "Voyage", ic: "🧭", aussi: ["/planning"] },
  { href: "/journal", label: "Journal", ic: "📖", pastille: true },
  { href: "/atelier", label: "Outils", ic: "⚙" },
];

// Ce qu'on ajoute quand on sort le téléphone sans savoir encore quoi en faire.
const AJOUTS = [
  { href: "/accueil", label: "Une note", ic: "📝" },
  { href: "/accueil", label: "Une dépense", ic: "💰" },
  { href: "/journal", label: "Une photo", ic: "📷" },
];

export default function BarreAdmin() {
  const { adminView } = useMode();
  const pathname = usePathname();
  const [journeeManquante, setJourneeManquante] = useState(false);
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    if (!adminView) return;
    let annule = false;
    (async () => {
      try {
        const { data } = await supabaseBrowser().auth.getSession();
        const token = data.session?.access_token;
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

  // Le panneau d'ajout se referme dès qu'on change d'écran.
  useEffect(() => { setOuvert(false); }, [pathname]);

  if (!adminView) return null;

  const actif = (o) => pathname === o.href || (o.aussi || []).includes(pathname);

  return (
    <>
      {ouvert && (
        <>
          <button className="ajout-voile" onClick={() => setOuvert(false)} aria-label="Fermer" />
          <div className="ajout-panneau" role="menu">
            {AJOUTS.map((a) => (
              <Link key={a.label} href={a.href} className="ajout-choix" role="menuitem">
                <span>{a.ic}</span> {a.label}
              </Link>
            ))}
          </div>
        </>
      )}

      <nav className="barre-admin" aria-label="Navigation">
        {ONGLETS.slice(0, 2).map((o) => (
          <Link key={o.href} href={o.href} className={"barre-geste" + (actif(o) ? " on" : "")}>
            <span className="barre-ic">{o.ic}</span>
            <span className="barre-label">{o.label}</span>
          </Link>
        ))}

        <button
          className={"barre-fab" + (ouvert ? " on" : "")}
          onClick={() => setOuvert((v) => !v)}
          aria-expanded={ouvert}
          aria-label="Ajouter"
        >
          +
        </button>

        {ONGLETS.slice(2).map((o) => (
          <Link key={o.href} href={o.href} className={"barre-geste" + (actif(o) ? " on" : "")}>
            <span className="barre-ic">
              {o.ic}
              {o.pastille && journeeManquante && <span className="barre-pastille" aria-hidden="true" />}
            </span>
            <span className="barre-label">{o.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
