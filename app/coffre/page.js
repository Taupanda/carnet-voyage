"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import AdminGate from "../AdminGate";
import { supabaseBrowser } from "../../lib/supabaseClient";

const CATS = [
  { id: "passeport", label: "Identité", ic: "🛂" },
  { id: "assurance", label: "Assurance", ic: "🛡️" },
  { id: "sante", label: "Santé", ic: "💊" },
  { id: "contact", label: "Contacts", ic: "☎️" },
  { id: "autre", label: "Autre", ic: "📄" },
];
const catOf = (id) => CATS.find((c) => c.id === id) || CATS[4];

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

async function uploadDoc(file) {
  const { data } = await supabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/coffre-upload", {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: fd,
  });
  if (!res.ok) throw new Error((await res.json()).error || "upload échoué");
  return res.json();
}

const EMPTY = { id: null, categorie: "passeport", titre: "", notes: "", fichiers: [] };

export default function Coffre() {
  return (
    <AdminGate>
      <CoffreBody />
    </AdminGate>
  );
}

function CoffreBody() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const res = await api("/api/coffre");
    if (res.ok) setList(await res.json());
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function edit(r) {
    setForm({ id: r.id, categorie: r.categorie || "autre", titre: r.titre || "", notes: r.notes || "", fichiers: Array.isArray(r.fichiers) ? r.fichiers : [] });
    setShowForm(true);
    setErr(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setErr(null);
    try {
      for (const file of files) {
        const meta = await uploadDoc(file);
        setForm((f) => ({ ...f, fichiers: [...f.fichiers, meta] }));
      }
    } catch (e2) { setErr(e2.message); }
    setUploading(false);
    e.target.value = "";
  }

  function removeFile(path) {
    setForm((f) => ({ ...f, fichiers: f.fichiers.filter((x) => x.path !== path) }));
  }

  async function save() {
    if (!form.titre.trim()) { setErr("Donne un titre au document."); return; }
    setBusy(true);
    setErr(null);
    const res = await api("/api/coffre", { method: "POST", body: JSON.stringify(form) });
    setBusy(false);
    if (res.ok) { setForm(EMPTY); setShowForm(false); load(); }
    else setErr("Échec : " + ((await res.json()).error || "inconnu"));
  }

  async function del(id) {
    if (!confirm("Supprimer ce document et ses fichiers ?")) return;
    await api("/api/coffre", { method: "DELETE", body: JSON.stringify({ id }) });
    setList((l) => l.filter((r) => r.id !== id));
  }

  return (
    <main className="container-wide" style={{ paddingTop: 24, paddingBottom: 70 }}>
      <Link href="/atelier" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>← Menu</Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "10px 0 6px" }}>
        <h1 className="display" style={{ fontSize: "clamp(26px, 4vw, 38px)" }}>🔐 Coffre</h1>
        <button className="btn" onClick={() => { setForm(EMPTY); setShowForm((s) => !s); setErr(null); }}>
          {showForm ? "Fermer" : "+ Ajouter"}
        </button>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
        Documents importants au même endroit. Stockés en privé, jamais publics.
      </p>

      {showForm && (
        <div className="budget-card" style={{ marginBottom: 24 }}>
          <div className="aside-head">{form.id ? "Modifier" : "Nouveau document"}</div>
          <div className="filters" style={{ marginBottom: 12 }}>
            {CATS.map((c) => (
              <button key={c.id} className={"filter" + (form.categorie === c.id ? " on" : "")} onClick={() => set("categorie", c.id)}>
                {c.ic} {c.label}
              </button>
            ))}
          </div>
          <input className="input" placeholder="Titre (ex. Passeport, Assurance Chapka, Contact ambassade)" value={form.titre} onChange={(e) => set("titre", e.target.value)} style={{ marginBottom: 8 }} />
          <textarea className="input" rows={3} placeholder="Notes (numéros, contacts, dates de validité…)" value={form.notes} onChange={(e) => set("notes", e.target.value)} style={{ marginBottom: 10 }} />

          <label className="lbl">Fichiers (PDF, JPG, PNG)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {form.fichiers.map((f) => (
              <span key={f.path} className="renc-mini" style={{ paddingRight: 10 }}>
                <span style={{ marginLeft: 6 }}>{f.type === "application/pdf" ? "📄" : "🖼️"}</span>
                <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                <button className="cmt-del" onClick={() => removeFile(f.path)} style={{ marginLeft: 4 }}>✕</button>
              </span>
            ))}
          </div>
          <label className="btn-secondary" style={{ display: "inline-block", cursor: "pointer", marginBottom: 10 }}>
            {uploading ? "Envoi…" : "+ Ajouter un fichier"}
            <input type="file" accept="application/pdf,image/*" multiple hidden onChange={onFiles} disabled={uploading} />
          </label>

          {err && <p className="error" style={{ marginBottom: 8 }}>{err}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setShowForm(false); setForm(EMPTY); }}>Annuler</button>
            <button className="btn" style={{ flex: 1 }} onClick={save} disabled={busy || uploading}>{busy ? "…" : form.id ? "Enregistrer" : "Ajouter"}</button>
          </div>
        </div>
      )}

      {!loaded ? (
        <p className="empty">Chargement…</p>
      ) : list.length === 0 ? (
        <p className="empty">Coffre vide.</p>
      ) : (
        <div className="renc-grid">
          {list.map((r) => {
            const c = catOf(r.categorie);
            const files = Array.isArray(r.fichiers) ? r.fichiers : [];
            return (
              <div key={r.id} className="renc-card">
                <div className="renc-body">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{c.ic}</span>
                    <span className="renc-pays" style={{ margin: 0 }}>{c.label}</span>
                    <button className="cmt-del" style={{ marginLeft: "auto" }} onClick={() => del(r.id)}>✕</button>
                  </div>
                  <div className="renc-name" style={{ marginTop: 6, cursor: "pointer" }} onClick={() => edit(r)}>{r.titre}</div>
                  {r.notes && <div className="renc-meta" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{r.notes}</div>}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {files.map((f) => (
                      <a key={f.path} href={f.url || "#"} target="_blank" rel="noopener noreferrer" className="filter">
                        {f.type === "application/pdf" ? "📄" : "🖼️"} {f.name?.slice(0, 18) || "Fichier"}
                      </a>
                    ))}
                    <button className="filter" onClick={() => edit(r)}>✏️ Modifier</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
