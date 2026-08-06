"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AdminGate from "../AdminGate";
import { supabaseBrowser } from "../../lib/supabaseClient";

const GROUPES = [
  { id: "avant_depart", label: "Avant le départ", ic: "🚀" },
  { id: "valise", label: "Valise", ic: "🎒" },
  { id: "administratif", label: "Administratif", ic: "📋" },
  { id: "general", label: "Général", ic: "✅" },
];

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

export default function Checklist() {
  return (
    <AdminGate>
      <ChecklistBody />
    </AdminGate>
  );
}

function ChecklistBody() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [drafts, setDrafts] = useState({}); // saisie par groupe

  async function load() {
    const res = await api("/api/checklist");
    if (res.ok) setItems(await res.json());
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  const byGroup = useMemo(() => {
    const m = {};
    GROUPES.forEach((g) => (m[g.id] = []));
    items.forEach((it) => { (m[it.groupe] = m[it.groupe] || []).push(it); });
    return m;
  }, [items]);

  const total = items.length;
  const done = items.filter((i) => i.done).length;

  async function add(groupe) {
    const texte = (drafts[groupe] || "").trim();
    if (!texte) return;
    setDrafts((d) => ({ ...d, [groupe]: "" }));
    const res = await api("/api/checklist", { method: "POST", body: JSON.stringify({ groupe, texte }) });
    if (res.ok) { const created = await res.json(); setItems((its) => [...its, created]); }
  }

  async function toggle(it) {
    setItems((its) => its.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)));
    await api("/api/checklist", { method: "PATCH", body: JSON.stringify({ id: it.id, done: !it.done }) });
  }

  async function del(id) {
    setItems((its) => its.filter((x) => x.id !== id));
    await api("/api/checklist", { method: "DELETE", body: JSON.stringify({ id }) });
  }

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 70, maxWidth: 640 }}>
      <Link href="/atelier" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>← Atelier</Link>
      <h1 className="display" style={{ fontSize: "clamp(26px, 4vw, 38px)", margin: "10px 0 6px" }}>Check-list</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
        <div style={{ flex: 1, height: 8, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
          <div style={{ width: (total ? (done / total) * 100 : 0) + "%", height: "100%", background: "var(--olive)", transition: "width .3s" }} />
        </div>
        <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{done}/{total}</span>
      </div>

      {!loaded ? (
        <p className="empty">Chargement…</p>
      ) : (
        GROUPES.map((g) => {
          const list = byGroup[g.id] || [];
          const d = list.filter((i) => i.done).length;
          return (
            <div key={g.id} className="budget-card" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div className="aside-head" style={{ margin: 0 }}>{g.ic} {g.label}</div>
                {list.length > 0 && <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{d}/{list.length}</span>}
              </div>

              {list.map((it) => (
                <div key={it.id} className={"chk-row" + (it.done ? " done" : "")}>
                  <button className="chk-box" onClick={() => toggle(it)} aria-pressed={it.done}>{it.done ? "✓" : ""}</button>
                  <span className="chk-text">{it.texte}</span>
                  <button className="cmt-del" onClick={() => del(it.id)}>✕</button>
                </div>
              ))}

              <div className="cmt-form" style={{ marginTop: 8 }}>
                <input
                  className="input"
                  placeholder="Ajouter…"
                  value={drafts[g.id] || ""}
                  onChange={(e) => setDrafts((dd) => ({ ...dd, [g.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && add(g.id)}
                />
                <button className="btn" style={{ padding: "10px 16px" }} onClick={() => add(g.id)}>+</button>
              </div>
            </div>
          );
        })
      )}
    </main>
  );
}
