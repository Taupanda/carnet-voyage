"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import AdminGate from "../AdminGate";
import { supabaseBrowser } from "../../lib/supabaseClient";
import { todayLocal, afficheJour, dayNumberOf } from "../../lib/stages";

async function api(path, opts = {}) {
  const { data } = await supabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  return fetch(path, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}

async function motifEchec(res) {
  if (res.status === 401) return "session admin non reconnue, reconnecte-toi";
  const detail = await res.json().catch(() => null);
  return detail?.error || `erreur ${res.status}`;
}

const heure = (d) =>
  new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const jourLong = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export default function Notes() {
  return (
    <AdminGate>
      <NotesBody />
    </AdminGate>
  );
}

function NotesBody() {
  const [notes, setNotes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [texte, setTexte] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editTexte, setEditTexte] = useState("");
  const champRef = useRef(null);

  const aujourdhui = todayLocal();

  async function load() {
    const res = await api("/api/notes");
    if (!res.ok) { setErr("Chargement impossible : " + (await motifEchec(res))); setLoaded(true); return; }
    setNotes(await res.json());
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  // Le champ prend le focus à l'arrivée : la page sert à noter vite, pas à lire.
  useEffect(() => { if (loaded) champRef.current?.focus(); }, [loaded]);

  async function ajouter() {
    const t = texte.trim();
    if (!t || busy) return;
    setBusy(true);
    setErr(null);
    const res = await api("/api/notes", { method: "POST", body: JSON.stringify({ date: aujourdhui, texte: t }) });
    setBusy(false);
    if (!res.ok) { setErr("Note non enregistrée : " + (await motifEchec(res))); return; }
    const creee = await res.json();
    setNotes((ns) => [creee, ...ns]);
    setTexte("");
    champRef.current?.focus();
  }

  async function supprimer(id) {
    setErr(null);
    const res = await api("/api/notes", { method: "DELETE", body: JSON.stringify({ id }) });
    if (!res.ok) { setErr("Suppression refusée : " + (await motifEchec(res))); return; }
    setNotes((ns) => ns.filter((n) => n.id !== id));
  }

  async function sauverEdition() {
    const id = editId;
    const t = editTexte.trim();
    setEditId(null);
    if (!id || !t) return;
    const res = await api("/api/notes", { method: "PATCH", body: JSON.stringify({ id, texte: t }) });
    if (!res.ok) { setErr("Modification refusée : " + (await motifEchec(res))); return; }
    const maj = await res.json();
    setNotes((ns) => ns.map((n) => (n.id === maj.id ? maj : n)));
  }

  // Regroupées par journée, la plus récente en tête.
  const parJour = useMemo(() => {
    const m = new Map();
    for (const n of notes) {
      if (!m.has(n.date)) m.set(n.date, []);
      m.get(n.date).push(n);
    }
    for (const liste of m.values()) liste.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [notes]);

  const duJour = notes.filter((n) => n.date === aujourdhui).length;
  const enAttente = notes.filter((n) => !n.utilisee).length;

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 70, maxWidth: 640 }}>
      <Link href="/atelier" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>← Menu</Link>
      <h1 className="display" style={{ fontSize: "clamp(26px, 4vw, 38px)", margin: "10px 0 4px" }}>Le calepin</h1>
      <p style={{ color: "var(--ink2)", marginBottom: 18 }}>
        Note au fil de la journée, en trois secondes. Le soir, tout remonte dans le journal —
        l'assistant part de tes notes au lieu de ta mémoire.
      </p>

      <div className="cmt-form">
        <input
          ref={champRef}
          className="input"
          placeholder="Ce que je veux retenir…"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ajouter()}
          disabled={busy}
        />
        <button className="btn" style={{ padding: "10px 18px" }} onClick={ajouter} disabled={busy || !texte.trim()}>
          {busy ? "…" : "Noter"}
        </button>
      </div>

      <p className="note-compteur">
        {duJour === 0 ? "Rien de noté aujourd'hui." : `${duJour} note${duJour > 1 ? "s" : ""} aujourd'hui.`}
        {enAttente > 0 && ` ${enAttente} en attente d'être racontée${enAttente > 1 ? "s" : ""}.`}
      </p>

      {err && <p className="error" style={{ marginBottom: 12 }}>{err}</p>}

      {!loaded ? (
        <p className="empty">Chargement…</p>
      ) : parJour.length === 0 ? (
        <p className="empty">Le calepin est vide. Note la première chose qui te vient.</p>
      ) : (
        parJour.map(([jour, liste]) => {
          const num = afficheJour(dayNumberOf(jour));
          return (
            <div key={jour} className="note-jour">
              <div className="note-jour-tete">
                <span>{jour === aujourdhui ? "Aujourd'hui" : jourLong(jour)}</span>
                {num > 0 && <span className="note-jour-num">Jour {num}</span>}
                {liste.every((n) => n.utilisee) && <span className="note-tag ok">racontée</span>}
              </div>
              {liste.map((n) => (
                <div key={n.id} className={"note-ligne" + (n.utilisee ? " utilisee" : "")}>
                  <span className="note-heure">{heure(n.created_at)}</span>
                  {editId === n.id ? (
                    <input
                      className="input"
                      autoFocus
                      value={editTexte}
                      onChange={(e) => setEditTexte(e.target.value)}
                      onBlur={sauverEdition}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") sauverEdition();
                        if (e.key === "Escape") setEditId(null);
                      }}
                    />
                  ) : (
                    <span className="note-texte" onClick={() => { setEditId(n.id); setEditTexte(n.texte); }}>
                      {n.texte}
                    </span>
                  )}
                  <button className="cmt-del" onClick={() => supprimer(n.id)} aria-label="Supprimer la note">✕</button>
                </div>
              ))}
            </div>
          );
        })
      )}
    </main>
  );
}
