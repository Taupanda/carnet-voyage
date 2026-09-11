"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AdminGate from "../AdminGate";
import { supabaseBrowser } from "../../lib/supabaseClient";
import { appelApi } from "../../lib/jeton";

// Le jeton vient du cache d'AuthProvider : plus de getSession() par requête,
// et un délai maximal, pour qu'un appel finisse toujours — réponse ou erreur.
const api = appelApi;

// Message d'erreur lisible à partir d'une réponse non-ok.
async function motifEchec(res) {
  if (res.status === 401) return "session admin non reconnue, reconnecte-toi";
  const detail = await res.json().catch(() => null);
  return detail?.error || `erreur ${res.status}`;
}

// La langue traduite : c'est de ce côté que vivent les synonymes.
const cible = (source) => (source === "fr" ? "es" : "fr");

// Remplace la traduction par l'alternative choisie et remet l'ancienne dans la
// liste : on peut toujours revenir en arrière, rien n'est perdu.
function permuter(mot, alt) {
  const c = cible(mot.source);
  const ancienne = mot[c];
  return {
    ...mot,
    [c]: alt,
    alternatives: [ancienne, ...(mot.alternatives || []).filter((a) => a !== alt)],
  };
}

export default function Vocabulaire() {
  return (
    <AdminGate>
      <VocabulaireBody />
    </AdminGate>
  );
}

function VocabulaireBody() {
  const [mots, setMots] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [propose, setPropose] = useState(null); // traduction en attente de validation
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [filtre, setFiltre] = useState("");
  const [edit, setEdit] = useState(null); // copie locale de la ligne en édition

  async function load() {
    const res = await api("/api/vocabulaire");
    if (res.ok) setMots(await res.json());
    else setErr("Chargement impossible : " + (await motifEchec(res)));
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  const visibles = useMemo(() => {
    const q = filtre.trim().toLowerCase();
    if (!q) return mots;
    return mots.filter((m) => m.fr.toLowerCase().includes(q) || m.es.toLowerCase().includes(q));
  }, [mots, filtre]);

  async function traduire() {
    const mot = saisie.trim();
    if (!mot || busy) return;
    setBusy(true);
    setErr(null);
    const res = await api("/api/vocabulaire/traduire", { method: "POST", body: JSON.stringify({ mot }) });
    setBusy(false);
    if (!res.ok) { setErr("Traduction impossible : " + (await motifEchec(res))); return; }
    setPropose(await res.json());
  }

  async function enregistrer() {
    if (!propose || busy) return;
    setBusy(true);
    setErr(null);
    const res = await api("/api/vocabulaire", { method: "POST", body: JSON.stringify(propose) });
    setBusy(false);
    if (!res.ok) { setErr("Enregistrement refusé : " + (await motifEchec(res))); return; }
    const cree = await res.json();
    setMots((ms) => [cree, ...ms]);
    setPropose(null);
    setSaisie("");
  }

  async function sauverEdition() {
    if (!edit || busy) return;
    setBusy(true);
    setErr(null);
    const res = await api("/api/vocabulaire", {
      method: "PATCH",
      body: JSON.stringify({ id: edit.id, fr: edit.fr, es: edit.es, alternatives: edit.alternatives, note: edit.note || "" }),
    });
    setBusy(false);
    if (!res.ok) { setErr("Modification refusée : " + (await motifEchec(res))); return; }
    const maj = await res.json();
    setMots((ms) => ms.map((m) => (m.id === maj.id ? maj : m)));
    setEdit(null);
  }

  async function supprimer(m) {
    if (!confirm(`Retirer « ${m.fr} » du vocabulaire ?`)) return;
    setErr(null);
    const res = await api("/api/vocabulaire", { method: "DELETE", body: JSON.stringify({ id: m.id }) });
    if (!res.ok) { setErr("Suppression refusée : " + (await motifEchec(res))); return; }
    setMots((ms) => ms.filter((x) => x.id !== m.id));
    if (edit?.id === m.id) setEdit(null);
  }

  // Les deux champs d'un mot, côte à côte, avec les synonymes cliquables dessous.
  function Paire({ mot, onChange }) {
    const c = cible(mot.source);
    return (
      <>
        <div className="voc-fields">
          <label className="voc-field">
            <span className="lbl">🇫🇷 Français</span>
            <input className="input" value={mot.fr} onChange={(e) => onChange({ ...mot, fr: e.target.value })} />
          </label>
          <label className="voc-field">
            <span className="lbl">🇲🇽 Español</span>
            <input className="input" value={mot.es} onChange={(e) => onChange({ ...mot, es: e.target.value })} />
          </label>
        </div>
        {mot.note && <p className="voc-note">ℹ️ {mot.note}</p>}
        {mot.alternatives?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <span className="voc-alts-head">
              Pas le mot appris ? Choisis un synonyme {c === "es" ? "espagnol" : "français"} :
            </span>
            <div className="chips" style={{ margin: "6px 0 0" }}>
              {mot.alternatives.map((a) => (
                <button key={a} type="button" className="voc-alt" onClick={() => onChange(permuter(mot, a))}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 70, maxWidth: 640 }}>
      <Link href="/atelier" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>← Menu</Link>
      <h1 className="display" style={{ fontSize: "clamp(26px, 4vw, 38px)", margin: "10px 0 4px" }}>Vocabulaire</h1>
      <p style={{ color: "var(--ink2)", marginBottom: 20 }}>
        Saisis un mot en français ou en español : la traduction se fait toute seule.
      </p>

      <div className="cmt-form">
        <input
          className="input"
          placeholder="un mot, une expression…"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && traduire()}
          disabled={busy}
        />
        <button className="btn" style={{ padding: "10px 18px" }} onClick={traduire} disabled={busy || !saisie.trim()}>
          {busy && !propose ? "…" : "Traduire"}
        </button>
      </div>

      {err && <p className="error" style={{ marginTop: 12 }}>{err}</p>}

      {propose && (
        <div className="budget-card" style={{ marginTop: 14 }}>
          <div className="aside-head" style={{ marginTop: 0 }}>
            Détecté : {propose.source === "fr" ? "français" : "español"}
          </div>
          <Paire mot={propose} onChange={setPropose} />
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setPropose(null); setErr(null); }} disabled={busy}>
              Annuler
            </button>
            <button className="btn" style={{ flex: 1 }} onClick={enregistrer} disabled={busy}>
              {busy ? "…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "26px 0 12px" }}>
        <div className="aside-head" style={{ margin: 0 }}>
          {mots.length} mot{mots.length > 1 ? "s" : ""} appris
        </div>
        {mots.length > 6 && (
          <input
            className="input"
            style={{ maxWidth: 200, marginLeft: "auto", padding: "7px 11px", fontSize: 13 }}
            placeholder="Rechercher…"
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
          />
        )}
      </div>

      {!loaded ? (
        <p className="empty">Chargement…</p>
      ) : visibles.length === 0 ? (
        <p className="empty">{mots.length ? "Aucun mot ne correspond." : "Le carnet de vocabulaire est vide."}</p>
      ) : (
        visibles.map((m) =>
          edit?.id === m.id ? (
            <div key={m.id} className="budget-card" style={{ marginBottom: 10 }}>
              <Paire mot={edit} onChange={setEdit} />
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setEdit(null); setErr(null); }} disabled={busy}>
                  Annuler
                </button>
                <button className="btn" style={{ flex: 1 }} onClick={sauverEdition} disabled={busy}>
                  {busy ? "…" : "Enregistrer"}
                </button>
              </div>
            </div>
          ) : (
            <div key={m.id} className="voc-row">
              <div className="voc-pair">
                <span className="voc-fr">{m.fr}</span>
                <span className="voc-sep">→</span>
                <span className="voc-es">{m.es}</span>
              </div>
              {m.alternatives?.length > 0 && (
                <span className="voc-count" title={m.alternatives.join(", ")}>+{m.alternatives.length}</span>
              )}
              <button className="btn-secondary voc-edit" onClick={() => { setEdit({ ...m, alternatives: m.alternatives || [] }); setErr(null); }}>
                Éditer
              </button>
              <button className="cmt-del" onClick={() => supprimer(m)}>✕</button>
            </div>
          )
        )
      )}
    </main>
  );
}
