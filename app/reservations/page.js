"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import AdminGate from "../AdminGate";
import { supabaseBrowser } from "../../lib/supabaseClient";

const TYPES = [
  { id: "hotel", label: "Hôtel", ic: "🏨" },
  { id: "transport", label: "Transport", ic: "🚌" },
  { id: "autre", label: "Autre", ic: "📌" },
];
const typeOf = (id) => TYPES.find((t) => t.id === id) || TYPES[2];

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

async function uploadTicket(file) {
  const { data } = await supabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/ticket-upload", {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, // pas de Content-Type : le navigateur pose le boundary
    body: fd,
  });
  if (!res.ok) throw new Error((await res.json()).error || "upload échoué");
  return res.json();
}

const EMPTY = { id: null, type: "hotel", titre: "", lieu: "", date_debut: "", date_fin: "", plateforme_url: "", notes: "", fichiers: [] };
const fmtDate = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : null);

export default function Reservations() {
  return (
    <AdminGate>
      <ResaBody />
    </AdminGate>
  );
}

function ResaBody() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const res = await api("/api/reservations");
    if (res.ok) setList(await res.json());
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function edit(r) {
    setForm({
      id: r.id, type: r.type || "hotel", titre: r.titre || "", lieu: r.lieu || "",
      date_debut: r.date_debut || "", date_fin: r.date_fin || "",
      plateforme_url: r.plateforme_url || "", notes: r.notes || "",
      fichiers: Array.isArray(r.fichiers) ? r.fichiers : [],
    });
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
        const meta = await uploadTicket(file);
        setForm((f) => ({ ...f, fichiers: [...f.fichiers, meta] }));
      }
    } catch (e2) {
      setErr(e2.message);
    }
    setUploading(false);
    e.target.value = "";
  }

  function removeFile(path) {
    setForm((f) => ({ ...f, fichiers: f.fichiers.filter((x) => x.path !== path) }));
  }

  async function save() {
    if (!form.titre.trim()) { setErr("Donne un titre à la réservation."); return; }
    setBusy(true);
    setErr(null);
    const res = await api("/api/reservations", { method: "POST", body: JSON.stringify(form) });
    setBusy(false);
    if (res.ok) {
      setForm(EMPTY);
      setShowForm(false);
      load();
    } else {
      setErr("Échec : " + ((await res.json()).error || "inconnu"));
    }
  }

  async function del(id) {
    if (!confirm("Supprimer cette réservation et ses billets ?")) return;
    await api("/api/reservations", { method: "DELETE", body: JSON.stringify({ id }) });
    setList((l) => l.filter((r) => r.id !== id));
  }

  return (
    <main className="container-wide" style={{ paddingTop: 24, paddingBottom: 70 }}>
      <Link href="/atelier" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>← Atelier</Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "10px 0 22px" }}>
        <h1 className="display" style={{ fontSize: "clamp(26px, 4vw, 38px)" }}>Réservations</h1>
        <button className="btn" onClick={() => { setForm(EMPTY); setShowForm((s) => !s); setErr(null); }}>
          {showForm ? "Fermer" : "+ Nouvelle"}
        </button>
      </div>

      {showForm && (
        <div className="budget-card" style={{ marginBottom: 24 }}>
          <div className="aside-head">{form.id ? "Modifier la réservation" : "Nouvelle réservation"}</div>

          <div className="filters" style={{ marginBottom: 12 }}>
            {TYPES.map((t) => (
              <button key={t.id} className={"filter" + (form.type === t.id ? " on" : "")} onClick={() => set("type", t.id)}>
                {t.ic} {t.label}
              </button>
            ))}
          </div>

          <input className="input" placeholder="Titre (ex. Hôtel Casa Pepe, Bus Oaxaca → San Cristóbal)" value={form.titre} onChange={(e) => set("titre", e.target.value)} style={{ marginBottom: 8 }} />
          <input className="input" placeholder="Lieu (facultatif)" value={form.lieu} onChange={(e) => set("lieu", e.target.value)} style={{ marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 130 }}>
              <label className="lbl">Du</label>
              <input className="input" type="date" value={form.date_debut} onChange={(e) => set("date_debut", e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 130 }}>
              <label className="lbl">Au</label>
              <input className="input" type="date" value={form.date_fin} onChange={(e) => set("date_fin", e.target.value)} />
            </div>
          </div>
          <input className="input" placeholder="Lien plateforme (https://…)" value={form.plateforme_url} onChange={(e) => set("plateforme_url", e.target.value)} style={{ marginBottom: 8 }} />
          <textarea className="input" rows={2} placeholder="Notes (n° de réservation, contact…)" value={form.notes} onChange={(e) => set("notes", e.target.value)} style={{ marginBottom: 10 }} />

          {/* billets */}
          <label className="lbl">Billets (PDF, JPG, PNG)</label>
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
            {uploading ? "Envoi…" : "+ Ajouter un billet"}
            <input type="file" accept="application/pdf,image/*" multiple hidden onChange={onFiles} disabled={uploading} />
          </label>

          {err && <p className="error" style={{ marginBottom: 8 }}>{err}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setShowForm(false); setForm(EMPTY); }}>Annuler</button>
            <button className="btn" style={{ flex: 1 }} onClick={save} disabled={busy || uploading}>{busy ? "…" : form.id ? "Enregistrer" : "Ajouter"}</button>
          </div>
        </div>
      )}

      {/* liste */}
      {!loaded ? (
        <p className="empty">Chargement…</p>
      ) : list.length === 0 ? (
        <p className="empty">Aucune réservation pour l'instant.</p>
      ) : (
        <div className="renc-grid">
          {list.map((r) => {
            const t = typeOf(r.type);
            const files = Array.isArray(r.fichiers) ? r.fichiers : [];
            return (
              <div key={r.id} className="renc-card">
                <div className="renc-body">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{t.ic}</span>
                    <span className="renc-pays" style={{ margin: 0 }}>{t.label}</span>
                    <button className="cmt-del" style={{ marginLeft: "auto" }} onClick={() => del(r.id)}>✕</button>
                  </div>
                  <div className="renc-name" style={{ marginTop: 6, cursor: "pointer" }} onClick={() => edit(r)}>{r.titre}</div>
                  {r.lieu && <div className="renc-meta" style={{ marginTop: 2 }}>📍 {r.lieu}</div>}
                  {(r.date_debut || r.date_fin) && (
                    <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                      {fmtDate(r.date_debut)}{r.date_fin && r.date_fin !== r.date_debut ? " → " + fmtDate(r.date_fin) : ""}
                    </div>
                  )}
                  {r.notes && <div className="renc-meta" style={{ marginTop: 8 }}>{r.notes}</div>}

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {r.plateforme_url && (
                      <a href={r.plateforme_url} target="_blank" rel="noopener noreferrer" className="filter">🔗 Plateforme</a>
                    )}
                    {files.map((f) => (
                      <a key={f.path} href={f.url || "#"} target="_blank" rel="noopener noreferrer" className="filter">
                        {f.type === "application/pdf" ? "📄" : "🖼️"} {f.name?.slice(0, 18) || "Billet"}
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
