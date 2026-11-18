"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGate from "../AdminGate";
import { appelApi } from "../../lib/jeton";
import { afficheJour } from "../../lib/stages";
import { filtrerAnecdotes } from "../../lib/anecdotes";
import { useCalendrier } from "../EtapesProvider";

// Toutes les anecdotes du voyage sur une seule page, rangées par étape, avec
// une étoile pour les préférées — de quoi retrouver d'un coup les histoires à
// raconter au retour, ou à mettre en avant dans le livre.
export default function Anecdotes() {
  return (
    <AdminGate>
      <AnecdotesBody />
    </AdminGate>
  );
}

const dateCourte = (d) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function AnecdotesBody() {
  const { stageForDate } = useCalendrier();
  const [liste, setListe] = useState(null);
  const [err, setErr] = useState(null);
  const [avertissement, setAvertissement] = useState(null);
  const [etoilees, setEtoilees] = useState(false);
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    (async () => {
      const res = await appelApi("/api/anecdotes");
      if (!res.ok) { setErr("Chargement impossible : " + ((await res.json().catch(() => ({}))).error || res.status)); setListe([]); return; }
      const d = await res.json();
      setListe(d.anecdotes || []);
      if (d.etoilesIndisponibles) setAvertissement("Les étoiles ne sont pas encore activées : il manque la table « anecdotes_etoiles » dans Supabase.");
    })();
  }, []);

  // L'étoile change tout de suite à l'écran, et revient en arrière si le
  // serveur refuse.
  async function basculer(a) {
    const cle = (x) => x.date === a.date && x.texte === a.texte;
    setListe((l) => l.map((x) => (cle(x) ? { ...x, etoile: !a.etoile } : x)));
    setErr(null);
    const res = await appelApi("/api/anecdotes", { method: "POST", body: JSON.stringify({ date: a.date, texte: a.texte, etoile: !a.etoile }) });
    if (!res.ok) {
      setListe((l) => l.map((x) => (cle(x) ? { ...x, etoile: a.etoile } : x)));
      setErr("Étoile non enregistrée : " + ((await res.json().catch(() => ({}))).error || res.status));
    }
  }

  const visibles = useMemo(() => filtrerAnecdotes(liste || [], { etoilees, recherche }), [liste, etoilees, recherche]);

  // Regroupées par étape, la plus récente en tête.
  const groupes = useMemo(() => {
    const g = [];
    for (const a of visibles) {
      const s = stageForDate(a.date);
      const cle = s?.n ?? 0;
      if (!g.length || g[g.length - 1].cle !== cle) g.push({ cle, etape: s, items: [] });
      g[g.length - 1].items.push(a);
    }
    return g;
  }, [visibles, stageForDate]);

  const total = liste?.length || 0;
  const nbEtoiles = (liste || []).filter((a) => a.etoile).length;

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 70, maxWidth: 680 }}>
      <Link href="/atelier" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>← Menu</Link>
      <h1 className="display" style={{ fontSize: "clamp(26px, 4vw, 38px)", margin: "10px 0 4px" }}>Les anecdotes</h1>
      <p style={{ color: "var(--ink2)", marginBottom: 14 }}>
        {liste === null ? "Chargement…" : `${total} anecdote${total > 1 ? "s" : ""} depuis le départ · ${nbEtoiles} ★`}
      </p>

      <div className="anec-outils">
        <button className={"anec-filtre" + (!etoilees ? " on" : "")} onClick={() => setEtoilees(false)}>Toutes</button>
        <button className={"anec-filtre" + (etoilees ? " on" : "")} onClick={() => setEtoilees(true)}>★ Préférées</button>
        <input className="input anec-recherche" type="search" placeholder="Chercher (lieu, mot…)" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
      </div>

      {avertissement && <p className="error" style={{ marginBottom: 12 }}>{avertissement}</p>}
      {err && <p className="error" style={{ marginBottom: 12 }}>{err}</p>}

      {liste !== null && visibles.length === 0 && (
        <p className="empty">
          {total === 0 ? "Pas encore d'anecdote dans les posts." : etoilees && !recherche ? "Aucune préférée pour l'instant : touche l'étoile d'une anecdote pour l'ajouter ici." : "Rien ne correspond."}
        </p>
      )}

      {groupes.map((g) => (
        <section key={g.cle} className="anec-etape" style={{ "--stage": g.etape?.couleur || "var(--accent)" }}>
          <h2 className="anec-etape-titre">{g.etape ? `Étape ${g.etape.n} — ${g.etape.nom}` : "Hors étapes"}</h2>
          {g.items.map((a) => (
            <article key={`${a.date}-${a.rang}`} className={"anec-carte" + (a.etoile ? " etoilee" : "")}>
              <button
                className={"anec-etoile" + (a.etoile ? " on" : "")}
                onClick={() => basculer(a)}
                aria-pressed={a.etoile}
                aria-label={a.etoile ? "Retirer des préférées" : "Ajouter aux préférées"}
                disabled={!!avertissement}
              >
                {a.etoile ? "★" : "☆"}
              </button>
              <div className="anec-corps">
                <p className="anec-texte">{a.texte}</p>
                <p className="anec-meta">
                  <Link href={g.etape ? `/etape/${g.etape.n}#jour-${a.day_number}` : `/#jour-${a.day_number}`}>
                    Jour {afficheJour(a.day_number)} · {dateCourte(a.date)}
                  </Link>
                  {a.lieux.length > 0 && ` · ${a.lieux.slice(0, 2).join(", ")}`}
                  {a.brouillon && " · brouillon"}
                </p>
              </div>
            </article>
          ))}
        </section>
      ))}
    </main>
  );
}
