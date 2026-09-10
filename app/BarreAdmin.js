"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMode } from "./ModeProvider";
import { supabaseBrowser } from "../lib/supabaseClient";
import { todayLocal } from "../lib/stages";

// Les gestes du quotidien, plus l'accès au Menu qui indexe tout le reste. Tout le reste vit dans le Menu : ici on ne
// met que ce qui se fait plusieurs fois par jour, ou debout dans une rue.
// L'accès rapide vit désormais sur la page d'accueil, où les gestes se font sur
// place. La barre n'a plus qu'à relier les deux lieux : là où l'on agit, et là
// où l'on se pose.
const GESTES = [
  { href: "/accueil", label: "Accueil", ic: "⌂", sobre: true, pastille: true },
  { href: "/atelier", label: "Menu", ic: "☰", sobre: true },
];

export default function BarreAdmin() {
  const { adminView } = useMode();
  const pathname = usePathname();
  const [journeeManquante, setJourneeManquante] = useState(false);

  // Une pastille sur « Raconter » tant que la journée du jour n'est pas écrite :
  // c'est le seul de ces gestes qui a une échéance.
  useEffect(() => {
    if (!adminView) return;
    let annule = false;
    (async () => {
      try {
        const { data } = await supabaseBrowser().auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;
        const jour = todayLocal();
        const res = await fetch(`/api/entries?date=${jour}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const rows = await res.json();
        if (!annule) setJourneeManquante(!rows.some((r) => r.date === jour));
      } catch {}
    })();
    return () => { annule = true; };
  }, [adminView, pathname]);

  if (!adminView) return null;

  return (
    <nav className="barre-admin" aria-label="Actions du jour">
      {GESTES.map((g) => {
        const actif = pathname === g.href;
        return (
          <Link key={g.href} href={g.href} className={"barre-geste" + (actif ? " on" : "")}>
            <span className={"barre-ic" + (g.sobre ? " sobre" : "")}>
              {g.ic}
              {g.pastille && journeeManquante && <span className="barre-pastille" aria-hidden="true" />}
            </span>
            <span className="barre-label">{g.label}</span>
            {g.pastille && journeeManquante && <span className="sr-only">journée non écrite</span>}
          </Link>
        );
      })}
    </nav>
  );
}
