"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import AdminGate from "../AdminGate";
import { supabaseBrowser } from "../../lib/supabaseClient";

const GROUPES = [
  { id: "avant_depart", label: "À faire avant de partir", ic: "🚀" },
  { id: "acheter", label: "À acheter", ic: "🛒" },
  { id: "valise", label: "Valise", ic: "🎒" },
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
  const [drafts, setDrafts] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [dragId, setDragId] = useState(null);
  const rowRefs = useRef({});

  async function load() {
    const res = await api("/api/checklist");
    if (res.ok) setItems(await res.json());
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  const byGroup = useMemo(() => {
    const m = {};
    GROUPES.forEach((g) => (m[g.id] = []));
    items.forEach((it) => { if (m[it.groupe]) m[it.groupe].push(it); });
    Object.values(m).forEach((arr) => arr.sort((a, b) => (a.ordre - b.ordre) || (a.created_at < b.created_at ? -1 : 1)));
    return m;
  }, [items]);

  const total = items.filter((i) => GROUPES.some((g) => g.id === i.groupe)).length;
  const done = items.filter((i) => i.done && GROUPES.some((g) => g.id === i.groupe)).length;

  async function add(groupe) {
    const texte = (drafts[groupe] || "").trim();
    if (!texte) return;
    setDrafts((d) => ({ ...d, [groupe]: "" }));
    const ordre = (byGroup[groupe] || []).length;
    const res = await api("/api/checklist", { method: "POST", body: JSON.stringify({ groupe, texte, ordre }) });
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

  function startEdit(it) { setEditingId(it.id); setEditText(it.texte); }
  async function saveEdit() {
    const id = editingId;
    const texte = editText.trim();
    setEditingId(null);
    if (!id || !texte) return;
    setItems((its) => its.map((x) => (x.id === id ? { ...x, texte } : x)));
    await api("/api/checklist", { method: "PATCH", body: JSON.stringify({ id, texte }) });
  }

  // ---- glisser-déposer (pointer events : souris + tactile) ----
  function reorderWithin(list, groupe, fromId, toId) {
    const g = list.filter((i) => i.groupe === groupe).sort((a, b) => a.ordre - b.ordre);
    const from = g.findIndex((i) => i.id === fromId);
    const to = g.findIndex((i) => i.id === toId);
    if (from === -1 || to === -1) return list;
    const [moved] = g.splice(from, 1);
    g.splice(to, 0, moved);
    const orderMap = Object.fromEntries(g.map((it, idx) => [it.id, idx]));
    return list.map((it) => (it.groupe === groupe ? { ...it, ordre: orderMap[it.id] } : it));
  }

  useEffect(() => {
    if (!dragId) return;
    function onMove(e) {
      const dragged = items.find((i) => i.id === dragId);
      if (!dragged) return;
      const y = e.clientY ?? (e.touches?.[0]?.clientY);
      if (y == null) return;
      const g = byGroup[dragged.groupe] || [];
      for (const gi of g) {
        const el = rowRefs.current[gi.id];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (y >= r.top && y <= r.bottom && gi.id !== dragId) {
          setItems((its) => reorderWithin(its, dragged.groupe, dragId, gi.id));
          break;
        }
      }
    }
    function onUp() {
      const dragged = items.find((i) => i.id === dragId);
      setDragId(null);
      if (dragged) {
        (byGroup[dragged.groupe] || []).forEach((it, idx) => {
          api("/api/checklist", { method: "PATCH", body: JSON.stringify({ id: it.id, ordre: idx }) });
        });
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [dragId, items, byGroup]);

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 70, maxWidth: 640 }}>
      <Link href="/atelier" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>← Menu</Link>
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
                <div
                  key={it.id}
                  ref={(el) => (rowRefs.current[it.id] = el)}
                  className={"chk-row" + (it.done ? " done" : "") + (dragId === it.id ? " dragging" : "")}
                >
                  <span
                    className="chk-drag"
                    title="Glisser pour réordonner"
                    style={{ touchAction: "none" }}
                    onPointerDown={(e) => { e.preventDefault(); setDragId(it.id); }}
                  >⠿</span>
                  <button className="chk-box" onClick={() => toggle(it)} aria-pressed={it.done}>{it.done ? "✓" : ""}</button>
                  {editingId === it.id ? (
                    <input
                      className="input chk-edit"
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                    />
                  ) : (
                    <span className="chk-text" onClick={() => startEdit(it)}>{it.texte}</span>
                  )}
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
