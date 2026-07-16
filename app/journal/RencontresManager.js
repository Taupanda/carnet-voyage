"use client";
import { useState, useEffect, useRef } from "react";
import { supabaseBrowser } from "../../lib/supabaseClient";

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

const EMPTY = { prenom: "", nom: "", pays: "", lieu_rencontre: "", activites: "", anecdote: "", reseaux: "", photo_url: null };

export default function RencontresManager({ onClose }) {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null); // objet en cours d'édition, ou null
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  async function load() {
    const res = await api("/api/rencontres");
    if (res.ok) setList(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function uploadPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const { data: sess } = await supabaseBrowser().auth.getSession();
      const token = sess.session?.access_token;
      const form = new FormData();
      form.append("file", file);
      form.append("date", "rencontres");
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error((await res.json()).error || "upload");
      const { url } = await res.json();
      setEditing((ed) => ({ ...ed, photo_url: url }));
    } catch (e2) {
      setErr("Photo refusée : " + e2.message);
    }
    setBusy(false);
  }

  async function save() {
    if (!editing.prenom?.trim()) { setErr("Le prénom est requis."); return; }
    setBusy(true);
    setErr(null);
    const res = await api("/api/rencontres", { method: "POST", body: JSON.stringify(editing) });
    setBusy(false);
    if (res.ok) { setEditing(null); load(); }
    else setErr("Échec : " + (await res.json()).error);
  }

  async function del(id) {
    if (!confirm("Supprimer cette rencontre ?")) return;
    await api("/api/rencontres", { method: "DELETE", body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
        <h2 className="serif" style={{ fontSize: 19 }}>Rencontres</h2>
        <button className="btn-secondary" style={{ marginLeft: "auto", padding: "8px 14px" }} onClick={onClose}>Fermer</button>
      </div>

      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {editing.photo_url ? (
              <img src={editing.photo_url} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <span className="avatar avatar-fallback" style={{ width: 64, height: 64, fontSize: 26 }}>{(editing.prenom || "?")[0]?.toUpperCase()}</span>
            )}
            <button className="btn-secondary" style={{ padding: "9px 14px", fontSize: 13 }} onClick={() => fileRef.current?.click()} disabled={busy}>
              {editing.photo_url ? "Changer la photo" : "Ajouter une photo"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadPhoto} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="Prénom *" value={editing.prenom} onChange={(e) => setEditing({ ...editing, prenom: e.target.value })} />
            <input className="input" placeholder="Nom" value={editing.nom} onChange={(e) => setEditing({ ...editing, nom: e.target.value })} />
          </div>
          <input className="input" placeholder="Pays d'origine" value={editing.pays} onChange={(e) => setEditing({ ...editing, pays: e.target.value })} />
          <input className="input" placeholder="Lieu de rencontre" value={editing.lieu_rencontre} onChange={(e) => setEditing({ ...editing, lieu_rencontre: e.target.value })} />
          <input className="input" placeholder="Activités menées ensemble" value={editing.activites} onChange={(e) => setEditing({ ...editing, activites: e.target.value })} />
          <textarea className="input" rows={2} placeholder="Une anecdote" value={editing.anecdote} onChange={(e) => setEditing({ ...editing, anecdote: e.target.value })} />
          <div>
            <label className="lbl">🔒 Réseaux sociaux (privé — jamais affiché publiquement)</label>
            <input className="input" placeholder="@instagram, WhatsApp, email…" value={editing.reseaux} onChange={(e) => setEditing({ ...editing, reseaux: e.target.value })} />
          </div>

          {err && <p className="error">{err}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setEditing(null); setErr(null); }}>Annuler</button>
            <button className="btn" style={{ flex: 1 }} onClick={save} disabled={busy}>{busy ? "…" : "Enregistrer"}</button>
          </div>
        </div>
      ) : (
        <>
          <button className="btn" style={{ width: "100%", marginBottom: 16 }} onClick={() => setEditing({ ...EMPTY })}>+ Nouvelle rencontre</button>
          {list.length === 0 && <p className="empty">Aucune rencontre enregistrée.</p>}
          {list.map((r) => (
            <div key={r.id} className="pm" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {r.photo_url ? (
                <img src={r.photo_url} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <span className="avatar avatar-fallback" style={{ width: 44, height: 44, fontSize: 18 }}>{(r.prenom || "?")[0]?.toUpperCase()}</span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.prenom} {r.nom || ""}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{[r.pays, r.lieu_rencontre].filter(Boolean).join(" · ")}</div>
              </div>
              <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setEditing(r)}>Éditer</button>
              <button className="cmt-del" onClick={() => del(r.id)}>✕</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
