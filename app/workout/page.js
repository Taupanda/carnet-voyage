"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../AuthProvider";
import { supabaseBrowser } from "../../lib/supabaseClient";
import { BackOfficeNav } from "../budget/page";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

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
// 0=lundi..6=dimanche
const weekdayIdx = (d) => (new Date(d + "T00:00:00").getDay() + 6) % 7;

export default function Workout() {
  const { user, loading } = useAuth();
  const isAdmin = !!user?.email && user.email.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();

  const [view, setView] = useState("aujourdhui"); // aujourdhui | programme
  const [plan, setPlan] = useState([]);   // 7 entrées
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    api("/api/workout-plan").then((r) => r.ok && r.json().then(setPlan));
    api("/api/workout-log").then((r) => r.ok && r.json().then(setLogs));
  }, [isAdmin]);

  // ------- gamification -------
  const stats = useMemo(() => {
    // 30 derniers jours : jours prévus (plan non-repos) vs réalisés (fait/partiel)
    const now = new Date();
    let prevus = 0, faits = 0;
    const done = {};
    logs.forEach((l) => { done[l.date] = l.statut; });
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      const ds = d.toISOString().slice(0, 10);
      const p = plan.find((x) => x.jour_semaine === ((d.getDay() + 6) % 7));
      const estPrevu = p && !p.repos && (p.exercices?.length || p.titre);
      if (estPrevu) {
        prevus++;
        if (done[ds] === "fait" || done[ds] === "partiel") faits++;
      }
    }
    const taux = prevus ? Math.round((faits / prevus) * 100) : 0;

    // streak : jours consécutifs (en remontant) où, si prévu, c'était fait/partiel/repos
    let streak = 0;
    for (let i = 0; i < 200; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      const ds = d.toISOString().slice(0, 10);
      const p = plan.find((x) => x.jour_semaine === ((d.getDay() + 6) % 7));
      const estPrevu = p && !p.repos && (p.exercices?.length || p.titre);
      if (!estPrevu) continue; // jour de repos : ne casse pas la série
      if (done[ds] === "fait" || done[ds] === "partiel") streak++;
      else break;
    }
    return { taux, faits, prevus, streak };
  }, [plan, logs]);

  if (loading) return <main className="container" style={{ paddingTop: 40 }}><p className="empty">Chargement…</p></main>;
  if (!isAdmin) return (
    <main className="container" style={{ paddingTop: 60, maxWidth: 420, textAlign: "center" }}>
      <p style={{ color: "var(--ink2)", marginBottom: 16 }}>Espace réservé à l'auteur.</p>
      <Link href="/" className="btn" style={{ display: "inline-block", textDecoration: "none" }}>← Retour au carnet</Link>
    </main>
  );

  return (
    <div>
      <BackOfficeNav active="workout" />
      <main className="container-wide" style={{ paddingTop: 24, paddingBottom: 70 }}>
        <h1 className="display" style={{ fontSize: "clamp(26px, 4vw, 38px)", marginBottom: 20 }}>Workout</h1>

      {/* bandeau gamification */}
      <div className="wk-stats">
        <div className="wk-stat-main">
          <div className="wk-ring" style={{ "--pct": stats.taux }}>
            <span className="wk-ring-n">{stats.taux}<i>%</i></span>
          </div>
          <div>
            <div className="wk-stat-label">Assiduité · 30 jours</div>
            <div className="wk-stat-sub">{stats.faits} séances réalisées sur {stats.prevus} prévues</div>
          </div>
        </div>
        <div className="wk-streak">
          <span className="wk-streak-flame">🔥</span>
          <span className="wk-streak-n">{stats.streak}</span>
          <span className="wk-streak-l">jour{stats.streak > 1 ? "s" : ""} d'affilée</span>
        </div>
      </div>

      {/* grille de constance : 12 dernières semaines */}
      <ConstanceGrid plan={plan} logs={logs} />

      {/* bascule */}
      <div className="filters" style={{ marginTop: 24 }}>
        <button className={"filter" + (view === "aujourdhui" ? " on" : "")} onClick={() => setView("aujourdhui")}>Aujourd'hui</button>
        <button className={"filter" + (view === "programme" ? " on" : "")} onClick={() => setView("programme")}>Mon programme</button>
      </div>

      {view === "aujourdhui"
        ? <Aujourdhui plan={plan} logs={logs} setLogs={setLogs} />
        : <Programme plan={plan} setPlan={setPlan} />}
      </main>
    </div>
  );
}

// ---------------- Aujourd'hui ----------------
function Aujourdhui({ plan, logs, setLogs }) {
  const [date, setDate] = useState(todayStr());
  const wd = weekdayIdx(date);
  const planDay = plan.find((p) => p.jour_semaine === wd);
  const existingLog = logs.find((l) => l.date === date);

  const [statut, setStatut] = useState("");
  const [exos, setExos] = useState([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existingLog) {
      setStatut(existingLog.statut || "");
      setExos((existingLog.exercices || []).map((e) => ({ ...e })));
      setNote(existingLog.note || "");
    } else if (planDay && !planDay.repos) {
      // pré-remplir depuis le plan, avec cases à cocher
      setStatut("");
      setExos((planDay.exercices || []).map((e) => ({ ...e, fait: false })));
      setNote("");
    } else {
      setStatut(planDay?.repos ? "repos" : "");
      setExos([]);
      setNote("");
    }
    setSaved(false);
  }, [date, plan, logs]); // eslint-disable-line

  async function save(st) {
    const s = st || statut;
    const body = { date, statut: s, titre: planDay?.titre || null, exercices: exos, note };
    const res = await api("/api/workout-log", { method: "POST", body: JSON.stringify(body) });
    if (res.ok) {
      const saved = await res.json();
      setLogs((ls) => [saved, ...ls.filter((l) => l.date !== date)]);
      setStatut(s);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  }

  return (
    <div style={{ marginTop: 18 }}>
      <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 200, marginBottom: 16 }} />

      {planDay?.repos ? (
        <div className="wk-card" style={{ textAlign: "center", padding: "34px 20px" }}>
          <div style={{ fontSize: 34 }}>😴</div>
          <p style={{ color: "var(--ink2)", marginTop: 8 }}>Jour de repos prévu. Profites-en.</p>
        </div>
      ) : !planDay || (!planDay.exercices?.length && !planDay.titre) ? (
        <div className="wk-card" style={{ textAlign: "center", padding: "30px 20px" }}>
          <p style={{ color: "var(--muted)" }}>Aucune séance prévue ce jour dans ton programme.</p>
          <p className="mono" style={{ fontSize: 12, marginTop: 6 }}>Onglet « Mon programme » pour en définir une.</p>
        </div>
      ) : (
        <div className="wk-card">
          <div className="wk-card-head">
            <span className="wk-card-title">{planDay.titre || "Séance"}</span>
            <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{JOURS[wd]}</span>
          </div>

          <div className="wk-exos">
            {exos.map((ex, i) => (
              <div key={i} className={"wk-exo" + (ex.fait ? " done" : "")}>
                <button className="wk-check" onClick={() => setExos((xs) => xs.map((x, j) => j === i ? { ...x, fait: !x.fait } : x))}>
                  {ex.fait ? "✓" : ""}
                </button>
                <div style={{ flex: 1 }}>
                  <div className="wk-exo-nom">{ex.nom}</div>
                  <div className="wk-exo-detail">
                    <input className="wk-mini" value={ex.series || ""} onChange={(e) => setExos((xs) => xs.map((x, j) => j === i ? { ...x, series: e.target.value } : x))} /> séries ×
                    <input className="wk-mini" value={ex.reps || ""} onChange={(e) => setExos((xs) => xs.map((x, j) => j === i ? { ...x, reps: e.target.value } : x))} /> reps
                    <input className="wk-mini" value={ex.charge || ""} onChange={(e) => setExos((xs) => xs.map((x, j) => j === i ? { ...x, charge: e.target.value } : x))} /> kg
                  </div>
                </div>
              </div>
            ))}
          </div>

          <textarea className="input" rows={2} placeholder="Note (ressenti, forme du jour…)" value={note} onChange={(e) => setNote(e.target.value)} style={{ marginTop: 12 }} />

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => save("fait")} style={{ flex: 1, minWidth: 120 }}>✓ Séance faite</button>
            <button className="btn-secondary" onClick={() => save("partiel")} style={{ flex: 1, minWidth: 120 }}>Partielle</button>
            <button className="btn-secondary" onClick={() => save("manque")} style={{ minWidth: 90 }}>Manquée</button>
          </div>
          {saved && <p className="info" style={{ marginTop: 10 }}>Enregistré ! {statut === "fait" && "Belle séance 💪"}</p>}
        </div>
      )}
    </div>
  );
}

// ---------------- Programme hebdo ----------------
function Programme({ plan, setPlan }) {
  const [editDay, setEditDay] = useState(null);

  function planFor(wd) { return plan.find((p) => p.jour_semaine === wd) || { jour_semaine: wd, titre: "", repos: false, exercices: [] }; }

  async function saveDay(day) {
    const res = await api("/api/workout-plan", { method: "POST", body: JSON.stringify(day) });
    if (res.ok) {
      const saved = await res.json();
      setPlan((ps) => [...ps.filter((p) => p.jour_semaine !== saved.jour_semaine), saved]);
      setEditDay(null);
    }
  }

  return (
    <div style={{ marginTop: 18 }}>
      {JOURS.map((nom, wd) => {
        const p = planFor(wd);
        const isEdit = editDay === wd;
        if (isEdit) return <DayEditor key={wd} day={{ ...p, exercices: [...(p.exercices || [])] }} nom={nom} onSave={saveDay} onCancel={() => setEditDay(null)} />;
        return (
          <div key={wd} className="wk-plan-row" onClick={() => setEditDay(wd)}>
            <span className="wk-plan-jour">{nom}</span>
            {p.repos ? (
              <span className="wk-plan-repos">Repos</span>
            ) : p.titre || p.exercices?.length ? (
              <span className="wk-plan-titre">{p.titre || "Séance"} <span className="mono" style={{ color: "var(--muted)", fontSize: 11 }}>· {p.exercices?.length || 0} exos</span></span>
            ) : (
              <span className="wk-plan-vide">+ définir</span>
            )}
            <span className="wk-plan-edit">✏️</span>
          </div>
        );
      })}
    </div>
  );
}

function DayEditor({ day, nom, onSave, onCancel }) {
  const [titre, setTitre] = useState(day.titre || "");
  const [repos, setRepos] = useState(day.repos || false);
  const [exos, setExos] = useState(day.exercices || []);

  function addExo() { setExos((xs) => [...xs, { nom: "", series: "", reps: "", charge: "" }]); }
  function upd(i, k, v) { setExos((xs) => xs.map((x, j) => j === i ? { ...x, [k]: v } : x)); }
  function del(i) { setExos((xs) => xs.filter((_, j) => j !== i)); }

  return (
    <div className="wk-card" style={{ marginBottom: 8, borderColor: "var(--accent)" }}>
      <div className="wk-card-head">
        <span className="wk-card-title">{nom}</span>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink2)" }}>
          <input type="checkbox" checked={repos} onChange={(e) => setRepos(e.target.checked)} /> Jour de repos
        </label>
      </div>
      {!repos && (
        <>
          <input className="input" placeholder="Nom de la séance (ex. Push, Jambes, Cardio)" value={titre} onChange={(e) => setTitre(e.target.value)} style={{ marginBottom: 12 }} />
          {exos.map((ex, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
              <input className="input" placeholder="Exercice" value={ex.nom} onChange={(e) => upd(i, "nom", e.target.value)} style={{ flex: 2 }} />
              <input className="input" placeholder="Séries" value={ex.series} onChange={(e) => upd(i, "series", e.target.value)} style={{ flex: 1, minWidth: 0 }} />
              <input className="input" placeholder="Reps" value={ex.reps} onChange={(e) => upd(i, "reps", e.target.value)} style={{ flex: 1, minWidth: 0 }} />
              <input className="input" placeholder="kg" value={ex.charge} onChange={(e) => upd(i, "charge", e.target.value)} style={{ flex: 1, minWidth: 0 }} />
              <button className="cmt-del" onClick={() => del(i)}>✕</button>
            </div>
          ))}
          <button className="btn-secondary" onClick={addExo} style={{ marginTop: 6, padding: "8px 14px", fontSize: 13 }}>+ Ajouter un exercice</button>
        </>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button className="btn-secondary" onClick={onCancel} style={{ flex: 1 }}>Annuler</button>
        <button className="btn" onClick={() => onSave({ jour_semaine: day.jour_semaine, titre, repos, exercices: repos ? [] : exos })} style={{ flex: 1 }}>Enregistrer</button>
      </div>
    </div>
  );
}

// ---------------- Grille de constance ----------------
function ConstanceGrid({ plan, logs }) {
  const done = {};
  logs.forEach((l) => { done[l.date] = l.statut; });
  const now = new Date();
  // 84 jours (12 semaines), du plus ancien au plus récent
  const days = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const ds = d.toISOString().slice(0, 10);
    const wd = (d.getDay() + 6) % 7;
    const p = plan.find((x) => x.jour_semaine === wd);
    const estPrevu = p && !p.repos && (p.exercices?.length || p.titre);
    days.push({ ds, statut: done[ds], estPrevu, repos: p?.repos });
  }
  function color(d) {
    if (d.statut === "fait") return "var(--olive)";
    if (d.statut === "partiel") return "#A9B58C";
    if (d.statut === "repos" || d.repos) return "var(--line2)";
    if (d.statut === "manque") return "#D99";
    if (d.estPrevu) return "var(--accent-soft)"; // prévu, non renseigné
    return "var(--line)";
  }
  return (
    <div className="wk-grid-wrap">
      <div className="wk-grid-head">
        <span className="aside-head" style={{ margin: 0 }}>12 dernières semaines</span>
        <div className="wk-legend">
          <span><i style={{ background: "var(--olive)" }} />Fait</span>
          <span><i style={{ background: "#A9B58C" }} />Partiel</span>
          <span><i style={{ background: "var(--accent-soft)" }} />Prévu</span>
          <span><i style={{ background: "var(--line2)" }} />Repos</span>
        </div>
      </div>
      <div className="wk-grid">
        {days.map((d, i) => (
          <div key={i} className="wk-grid-cell" style={{ background: color(d) }} title={`${d.ds}${d.statut ? " · " + d.statut : d.estPrevu ? " · prévu" : ""}`} />
        ))}
      </div>
    </div>
  );
}
