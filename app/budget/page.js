"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../AuthProvider";
import { supabaseBrowser } from "../../lib/supabaseClient";

const CATS = [
  { id: "hebergement", label: "Hébergement", ic: "🛏️", color: "#BC5B2E" },
  { id: "transport", label: "Transport", ic: "🚌", color: "#5C6B4C" },
  { id: "repas", label: "Repas", ic: "🍽️", color: "#C99A3B" },
  { id: "sorties", label: "Sorties", ic: "🍸", color: "#8B5A8C" },
  { id: "activites", label: "Activités", ic: "🎯", color: "#3F8CA5" },
  { id: "autres", label: "Autres", ic: "📦", color: "#948B7E" },
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

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Budget() {
  const { user, loading } = useAuth();
  const isAdmin = !!user?.email && user.email.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();

  const [depenses, setDepenses] = useState([]);
  const [budgets, setBudgets] = useState({ hebdo: "", mensuel: "", global: "" });
  const [date, setDate] = useState(todayStr());
  const [categorie, setCategorie] = useState("repas");
  const [montant, setMontant] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [showTargets, setShowTargets] = useState(false); // paliers = action rare, repliée

  useEffect(() => {
    if (!isAdmin) return;
    api("/api/depenses").then((r) => r.ok && r.json().then(setDepenses));
    api("/api/budgets").then((r) => r.ok && r.json().then((b) => setBudgets({
      hebdo: b.hebdo || "", mensuel: b.mensuel || "", global: b.global || "",
    })));
  }, [isAdmin]);

  const total = useMemo(() => depenses.reduce((s, d) => s + Number(d.montant), 0), [depenses]);
  const parCat = useMemo(() => {
    const m = {};
    CATS.forEach((c) => (m[c.id] = 0));
    depenses.forEach((d) => (m[d.categorie] = (m[d.categorie] || 0) + Number(d.montant)));
    return m;
  }, [depenses]);

  // total 7 derniers jours / 30 derniers jours
  const now = new Date();
  const sumSince = (days) => {
    const cut = new Date(now.getTime() - days * 86400000);
    return depenses.filter((d) => new Date(d.date) >= cut).reduce((s, d) => s + Number(d.montant), 0);
  };
  const semaine = sumSince(7);
  const mois = sumSince(30);

  async function addDepense() {
    if (!montant || Number(montant) <= 0) { setErr("Montant invalide."); return; }
    setBusy(true);
    setErr(null);
    const res = await api("/api/depenses", { method: "POST", body: JSON.stringify({ date, categorie, montant: Number(montant), note }) });
    setBusy(false);
    if (res.ok) {
      const saved = await res.json();
      setDepenses((ds) => [saved, ...ds]);
      setMontant(""); setNote("");
    } else setErr("Échec : " + (await res.json()).error);
  }

  async function delDepense(id) {
    await api("/api/depenses", { method: "DELETE", body: JSON.stringify({ id }) });
    setDepenses((ds) => ds.filter((d) => d.id !== id));
  }

  async function saveBudgets() {
    setBusy(true);
    const res = await api("/api/budgets", { method: "POST", body: JSON.stringify({
      hebdo: Number(budgets.hebdo) || null,
      mensuel: Number(budgets.mensuel) || null,
      global: Number(budgets.global) || null,
    }) });
    setBusy(false);
    if (res.ok) setErr(null);
  }

  if (loading) return <main className="container" style={{ paddingTop: 40 }}><p className="empty">Chargement…</p></main>;
  if (!isAdmin) return (
    <main className="container" style={{ paddingTop: 60, maxWidth: 420, textAlign: "center" }}>
      <p style={{ color: "var(--ink2)", marginBottom: 16 }}>Espace réservé à l'auteur.</p>
      <Link href="/" className="btn" style={{ display: "inline-block", textDecoration: "none" }}>← Retour au carnet</Link>
    </main>
  );

  const Gauge = ({ label, spent, target }) => {
    const pct = target ? Math.min(100, (spent / target) * 100) : 0;
    const over = target && spent > target;
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
          <span>{label}</span>
          <span className="mono" style={{ color: over ? "#C2453A" : "var(--ink2)" }}>
            {Math.round(spent)} € {target ? `/ ${target} €` : ""}
          </span>
        </div>
        {target > 0 && (
          <div style={{ height: 8, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
            <div style={{ width: pct + "%", height: "100%", background: over ? "#C2453A" : "var(--accent)", transition: "width .3s" }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <BackOfficeNav active="budget" />
      <main className="container" style={{ paddingTop: 24, paddingBottom: 70, maxWidth: 640 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <h1 className="display" style={{ fontSize: "clamp(24px, 4vw, 34px)" }}>Budget</h1>
          <button className="btn-secondary" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setShowTargets((s) => !s)}>
            ⚙️ Paliers
          </button>
        </div>

        {/* progression condensée */}
        <div className="budget-card" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div className="budget-total-label">Total dépensé</div>
              <div className="budget-total">{Math.round(total)} €</div>
            </div>
            <div className="mono" style={{ fontSize: 12, color: "var(--muted)", textAlign: "right", lineHeight: 1.7 }}>
              7 j : {Math.round(semaine)} €<br />30 j : {Math.round(mois)} €
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <Gauge label="Cette semaine (7 j)" spent={semaine} target={Number(budgets.hebdo)} />
            <Gauge label="Ce mois (30 j)" spent={mois} target={Number(budgets.mensuel)} />
            <Gauge label="Global" spent={total} target={Number(budgets.global)} />
          </div>
        </div>

        {/* paliers repliables (action rare) */}
        {showTargets && (
          <div className="budget-card" style={{ marginBottom: 14 }}>
            <div className="aside-head">Mes paliers cibles (€)</div>
            <div className="budget-add-row">
              <div style={{ flex: "1 1 120px" }}>
                <label className="lbl">Par semaine</label>
                <input className="input" type="number" value={budgets.hebdo} onChange={(e) => setBudgets({ ...budgets, hebdo: e.target.value })} />
              </div>
              <div style={{ flex: "1 1 120px" }}>
                <label className="lbl">Par mois</label>
                <input className="input" type="number" value={budgets.mensuel} onChange={(e) => setBudgets({ ...budgets, mensuel: e.target.value })} />
              </div>
              <div style={{ flex: "1 1 120px" }}>
                <label className="lbl">Global (voyage)</label>
                <input className="input" type="number" value={budgets.global} onChange={(e) => setBudgets({ ...budgets, global: e.target.value })} />
              </div>
            </div>
            <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => { saveBudgets(); setShowTargets(false); }} disabled={busy}>
              Enregistrer les paliers
            </button>
          </div>
        )}

        {/* AJOUT DÉPENSE — action principale, mise en avant */}
        <div className="budget-card budget-add" style={{ marginBottom: 14 }}>
          <div className="aside-head" style={{ color: "var(--accent)" }}>➕ Ajouter une dépense</div>
          <div className="budget-add-row">
            <div style={{ flex: "1.4 1 140px" }}>
              <label className="lbl">Montant (€)</label>
              <input className="input" style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 22 }} type="number" inputMode="decimal" placeholder="0" value={montant} onChange={(e) => setMontant(e.target.value)} />
            </div>
            <div style={{ flex: "1 1 130px" }}>
              <label className="lbl">Catégorie</label>
              <select className="input" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                {CATS.map((c) => <option key={c.id} value={c.id}>{c.ic} {c.label}</option>)}
              </select>
            </div>
            <div style={{ flex: "1 1 130px" }}>
              <label className="lbl">Date</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <input className="input" placeholder="Note (facultatif)" value={note} onChange={(e) => setNote(e.target.value)} style={{ marginTop: 8 }} />
          {err && <p className="error" style={{ marginTop: 8 }}>{err}</p>}
          <button className="btn" style={{ width: "100%", marginTop: 10 }} onClick={addDepense} disabled={busy}>{busy ? "…" : "Ajouter la dépense"}</button>
        </div>

        {/* répartition par catégorie */}
        <div className="budget-card" style={{ marginBottom: 14 }}>
          <div className="aside-head">Par catégorie</div>
          {CATS.map((c) => {
            const v = parCat[c.id] || 0;
            const pct = total ? (v / total) * 100 : 0;
            return (
              <div key={c.id} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>{c.ic} {c.label}</span>
                  <span className="mono" style={{ color: "var(--ink2)" }}>{Math.round(v)} €</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                  <div style={{ width: pct + "%", height: "100%", background: c.color }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* historique */}
        <div>
          <div className="aside-head" style={{ marginBottom: 10 }}>Historique ({depenses.length})</div>
          {depenses.map((d) => {
            const cat = CATS.find((c) => c.id === d.categorie);
            return (
              <div key={d.id} className="depense-row">
                <span style={{ fontSize: 18 }}>{cat?.ic}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{cat?.label} {d.note && <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {d.note}</span>}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</div>
                </div>
                <span className="mono" style={{ fontWeight: 700 }}>{Math.round(d.montant)} €</span>
                <button className="cmt-del" onClick={() => delDepense(d.id)}>✕</button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export function BackOfficeNav({ active }) {
  const items = [
    { id: "journal", label: "Journal", href: "/journal", ic: "📖" },
    { id: "budget", label: "Budget", href: "/budget", ic: "💰" },
    { id: "workout", label: "Workout", href: "/workout", ic: "💪" },
    { id: "rencontres", label: "Rencontres", href: "/journal?panel=rencontres", ic: "🤝" },
    { id: "commentaires", label: "Commentaires", href: "/journal?panel=comments", ic: "💬" },
  ];
  return (
    <div className="bo-nav">
      <Link href="/" className="bo-back">← Site</Link>
      {items.map((it) => (
        <Link key={it.id} href={it.href} className={"bo-link" + (active === it.id ? " on" : "")}>
          <span>{it.ic}</span> {it.label}
        </Link>
      ))}
    </div>
  );
}
