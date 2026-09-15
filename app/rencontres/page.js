"use client";
import { useState, useEffect, useCallback } from "react";
import { useMode } from "../ModeProvider";
import { appelApi, jetonCourant } from "../../lib/jeton";
import RencontreForm, { RENCONTRE_VIDE } from "../RencontreForm";

// Page publique — et modifiable par l'auteur, sur place.
//
// L'édition n'existait que dans un panneau du journal : depuis les Outils, on
// arrivait ici et on ne pouvait que regarder, sans même un bouton pour corriger
// un prénom. Les visiteurs voient exactement la même page, sans les boutons ni
// le champ privé.
export default function Rencontres() {
  const { adminView } = useMode();
  const [rencs, setRencs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // En admin, la requête porte le jeton : sans lui, l'API retire « reseaux » et
  // enregistrer une fiche l'effacerait au passage.
  const charger = useCallback(async () => {
    try {
      const res = adminView ? await appelApi("/api/rencontres") : await fetch("/api/rencontres");
      const d = res.ok ? await res.json() : [];
      setRencs(Array.isArray(d) ? d : []);
    } catch { /* liste vide, message ci-dessous */ }
    setLoading(false);
  }, [adminView]);
  useEffect(() => { charger(); }, [charger]);

  async function envoyerPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setErr(null);
    try {
      const token = await jetonCourant();
      const form = new FormData();
      form.append("file", file);
      form.append("date", "rencontres");
      const res = await fetch("/api/upload", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
      if (!res.ok) throw new Error((await res.json()).error || "envoi refusé");
      const { url } = await res.json();
      setEditing((ed) => ({ ...ed, photo_url: url }));
    } catch (e2) { setErr("Photo refusée : " + e2.message); }
    setBusy(false);
  }

  async function enregistrer() {
    if (!editing.prenom?.trim()) { setErr("Le prénom est requis."); return; }
    setBusy(true); setErr(null);
    const res = await appelApi("/api/rencontres", { method: "POST", body: JSON.stringify(editing) });
    setBusy(false);
    if (!res.ok) { setErr("Échec : " + ((await res.json().catch(() => ({}))).error || res.status)); return; }
    setEditing(null);
    charger();
  }

  async function supprimer(id) {
    if (!confirm("Supprimer cette rencontre ?")) return;
    setBusy(true); setErr(null);
    const res = await appelApi("/api/rencontres", { method: "DELETE", body: JSON.stringify({ id }) });
    setBusy(false);
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      setErr(res.status === 401
        ? "Suppression refusée : session non reconnue. Reconnecte-toi."
        : "Échec de la suppression : " + (detail?.error || res.status));
      return;
    }
    setEditing(null);
    charger();
  }

  const pays = [...new Set(rencs.map((r) => r.pays).filter(Boolean))];

  if (editing) {
    return (
      <main className="container" style={{ paddingTop: 30, paddingBottom: 70, maxWidth: 520 }}>
        <h1 className="display" style={{ fontSize: 26, margin: "0 0 18px" }}>
          {editing.id ? "Modifier la rencontre" : "Nouvelle rencontre"}
        </h1>
        <RencontreForm
          valeur={editing}
          onChange={setEditing}
          onEnvoyerPhoto={envoyerPhoto}
          onEnregistrer={enregistrer}
          onAnnuler={() => { setEditing(null); setErr(null); }}
          busy={busy}
          err={err}
        />
        {editing.id && (
          <button className="btn-danger" style={{ width: "100%", marginTop: 12 }} onClick={() => supprimer(editing.id)} disabled={busy}>
            Supprimer cette rencontre
          </button>
        )}
      </main>
    );
  }

  return (
    <main className="container-wide" style={{ paddingTop: 30, paddingBottom: 70 }}>
      <p className="eyebrow">{rencs.length} rencontre{rencs.length > 1 ? "s" : ""}{pays.length ? ` · ${pays.length} pays` : ""}</p>
      <h1 className="display" style={{ fontSize: "clamp(28px, 5vw, 44px)", margin: "8px 0 6px" }}>
        Mes rencontres du voyage
      </h1>
      <p style={{ color: "var(--ink2)", marginBottom: 20, maxWidth: 480 }}>
        Un voyage en solo n'est jamais vraiment solitaire. Voici celles et ceux qui ont croisé ma route.
      </p>

      {adminView && (
        <button className="btn" style={{ marginBottom: 20 }} onClick={() => { setErr(null); setEditing({ ...RENCONTRE_VIDE }); }}>
          + Nouvelle rencontre
        </button>
      )}
      {err && <p className="error" style={{ marginBottom: 16 }}>{err}</p>}

      {loading ? (
        <p className="empty">Chargement…</p>
      ) : rencs.length === 0 ? (
        <p className="empty">Aucune rencontre pour l'instant. Le voyage commence à peine.</p>
      ) : (
        <div className="renc-grid">
          {rencs.map((r) => (
            <div key={r.id} className="renc-card">
              <div className="renc-photo" onClick={() => r.photo_url && setZoom(r.photo_url)}>
                {r.photo_url ? (
                  <img src={r.photo_url} alt={r.prenom} />
                ) : (
                  <span className="renc-initial">{r.prenom?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="renc-body">
                <div className="renc-name">{r.prenom} {r.nom || ""}</div>
                {r.pays && <div className="renc-pays">📍 {r.pays}</div>}
                {r.lieu_rencontre && (
                  <div className="renc-meta"><span className="renc-meta-k">Rencontré·e à</span> {r.lieu_rencontre}</div>
                )}
                {r.activites && (
                  <div className="renc-meta"><span className="renc-meta-k">Ensemble</span> {r.activites}</div>
                )}
                {r.anecdote && <p className="renc-anecdote">« {r.anecdote} »</p>}
                {adminView && (
                  <button className="btn-secondary renc-editer" onClick={() => { setErr(null); setEditing({ ...r }); }}>
                    Modifier
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {zoom && (
        <div className="lb" onClick={() => setZoom(null)}>
          <button className="lb-close" onClick={() => setZoom(null)}>✕</button>
          <img src={zoom} alt="" />
        </div>
      )}
    </main>
  );
}
