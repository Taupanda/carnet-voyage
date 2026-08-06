"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import AdminGate from "../AdminGate";
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

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtWeek = (d) => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

export default function Resumes() {
  return (
    <AdminGate>
      <ResumesBody />
    </AdminGate>
  );
}

function ResumesBody() {
  const [list, setList] = useState([]);
  const [week, setWeek] = useState(todayStr());
  const [current, setCurrent] = useState(null); // brouillon/résumé en cours d'édition
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const res = await api("/api/weekly-recap");
    if (res.ok) setList(await res.json());
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    setBusy(true);
    setErr(null);
    const res = await api("/api/weekly-recap", { method: "POST", body: JSON.stringify({ action: "generate", semaine: week }) });
    setBusy(false);
    if (res.ok) { setCurrent(await res.json()); load(); }
    else setErr(((await res.json()).error) || "Échec de la génération.");
  }

  async function save(status) {
    if (!current) return;
    setBusy(true);
    setErr(null);
    const res = await api("/api/weekly-recap", {
      method: "POST",
      body: JSON.stringify({ id: current.id, semaine_debut: current.semaine_debut, titre: current.titre, contenu: current.contenu, status }),
    });
    setBusy(false);
    if (res.ok) { setCurrent(await res.json()); load(); }
    else setErr(((await res.json()).error) || "Échec.");
  }

  async function del(id) {
    if (!confirm("Supprimer ce résumé ?")) return;
    await api("/api/weekly-recap", { method: "DELETE", body: JSON.stringify({ id }) });
    if (current?.id === id) setCurrent(null);
    setList((l) => l.filter((r) => r.id !== id));
  }

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 70, maxWidth: 640 }}>
      <Link href="/atelier" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>← Atelier</Link>
      <h1 className="display" style={{ fontSize: "clamp(26px, 4vw, 38px)", margin: "10px 0 6px" }}>Résumés hebdo</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
        L'IA rédige un brouillon à partir de tes posts publiés. Tu valides avant publication.
      </p>

      <div className="budget-card" style={{ marginBottom: 16 }}>
        <label className="lbl">Semaine à résumer (n'importe quel jour)</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="input" type="date" value={week} onChange={(e) => setWeek(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
          <button className="btn" onClick={generate} disabled={busy}>{busy ? "…" : "✨ Générer"}</button>
        </div>
        {err && <p className="error" style={{ marginTop: 10 }}>{err}</p>}
      </div>

      {current && (
        <div className="budget-card budget-add" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span className="aside-head" style={{ margin: 0, color: "var(--accent)" }}>Semaine du {fmtWeek(current.semaine_debut)}</span>
            <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: current.status === "published" ? "var(--olive)" : "var(--muted)" }}>
              {current.status === "published" ? "● publié" : "○ brouillon"}
            </span>
          </div>
          <input className="input serif" style={{ fontSize: 17, marginBottom: 8 }} value={current.titre || ""} onChange={(e) => setCurrent({ ...current, titre: e.target.value })} placeholder="Titre" />
          <textarea className="input" rows={8} value={current.contenu || ""} onChange={(e) => setCurrent({ ...current, contenu: e.target.value })} style={{ lineHeight: 1.6 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn-secondary" onClick={() => save("draft")} disabled={busy}>Enregistrer le brouillon</button>
            {current.status === "published" ? (
              <button className="btn-secondary" onClick={() => save("draft")} disabled={busy}>Dépublier</button>
            ) : (
              <button className="btn" onClick={() => save("published")} disabled={busy}>Publier</button>
            )}
            <button className="btn-danger" onClick={() => del(current.id)} style={{ marginLeft: "auto" }}>Supprimer</button>
          </div>
        </div>
      )}

      <div className="aside-head" style={{ marginBottom: 10 }}>Tous les résumés</div>
      {!loaded ? (
        <p className="empty">Chargement…</p>
      ) : list.length === 0 ? (
        <p className="empty">Aucun résumé pour l'instant.</p>
      ) : (
        list.map((r) => (
          <div key={r.id} className="depense-row" style={{ cursor: "pointer" }} onClick={() => { setCurrent(r); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <span style={{ fontSize: 16 }}>{r.status === "published" ? "📮" : "📝"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{r.titre || "Sans titre"}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>Semaine du {fmtWeek(r.semaine_debut)} · {r.status === "published" ? "publié" : "brouillon"}</div>
            </div>
          </div>
        ))
      )}
    </main>
  );
}
