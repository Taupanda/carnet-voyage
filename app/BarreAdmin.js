"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMode } from "./ModeProvider";
import { supabaseBrowser } from "../lib/supabaseClient";
import { todayLocal } from "../lib/stages";

// Les gestes du quotidien, plus l'accès au Menu qui indexe tout le reste. Tout le reste vit dans le Menu : ici on ne
// met que ce qui se fait plusieurs fois par jour, ou debout dans une rue.
const GESTES = [
  { href: "/notes", label: "Noter", ic: "📝" },
  { href: "/journal", label: "Raconter", ic: "✏️", pastille: true },
  { href: "/planning", label: "Planning", ic: "🗓️" },
  { href: "/convertisseur", label: "Change", ic: "💱" },
  { href: "/atelier", label: "Menu", ic: "🧰" },
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

  // Le journal occupe déjà tout l'écran et a sa propre navigation interne.
  if (!adminView || pathname?.startsWith("/journal")) return null;

  return (
    <nav className="barre-admin" aria-label="Actions du jour">
      {GESTES.map((g) => {
        const actif = pathname === g.href;
        return (
          <Link key={g.href} href={g.href} className={"barre-geste" + (actif ? " on" : "")}>
            <span className="barre-ic">
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
