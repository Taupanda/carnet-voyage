"use client";
import { useState } from "react";
import TripMap from "./TripMap";
import Post from "./Post";
import FooterNote from "./FooterNote";
import PushButton from "./PushButton";
import { STAGES, stageForDate, stageDays, TRIP_DAYS, todayLocal, fmtDate } from "../lib/stages";

export default function HomeFeed({ posts, points, stats, dayNum, started }) {
  const [filter, setFilter] = useState(null); // n° d'étape, ou null = tout
  const [mapOpen, setMapOpen] = useState(false);
  const today = todayLocal();
  const current = stageForDate(today);

  // tri chronologique fiable (par numéro de jour croissant)
  const sortedPosts = [...posts].sort((a, b) => (a.day_number ?? 0) - (b.day_number ?? 0));

  // étapes qui ont au moins un post publié
  const stagesWithPosts = STAGES.filter((s) => sortedPosts.some((p) => stageForDate(p.date)?.n === s.n));

  const shown = filter ? sortedPosts.filter((p) => stageForDate(p.date)?.n === filter) : sortedPosts;

  // regrouper par étape pour les bandeaux
  const groups = [];
  for (const p of shown) {
    const s = stageForDate(p.date);
    const key = s?.n ?? 0;
    if (!groups.length || groups[groups.length - 1].key !== key) groups.push({ key, stage: s, posts: [p] });
    else groups[groups.length - 1].posts.push(p);
  }

  return (
    <main className="home-layout">
      <div className="home-feed">
        {/* barre de progression + filtre d'étapes en haut */}
        <div className="home-top">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 12 }}>
            <span className="mono" style={{ fontSize: 12.5, color: "var(--ink2)" }}>
              {started ? `JOUR ${dayNum} / ${TRIP_DAYS}` : `DÉPART LE ${fmtDate(STAGES[0].debut).toUpperCase()}`}
            </span>
            {current && <span className="mono" style={{ fontSize: 12, color: current.couleur, fontWeight: 700 }}>ÉTAPE {current.n} — {current.nom.toUpperCase()}</span>}
          </div>
          <div className="prog" style={{ marginBottom: 14 }}>
            {STAGES.map((s) => {
              const past = today > s.fin;
              const now = current?.n === s.n;
              return (
                <i key={s.n} title={`${s.n}. ${s.nom}`}
                  style={{ flex: stageDays(s), background: past || now ? s.couleur : "var(--line)", opacity: past ? 0.55 : 1 }} />
              );
            })}
          </div>
          <div className="stage-nav">
            <button className={"stage-chip" + (filter === null ? " on" : "")} style={{ "--c": "var(--accent)" }} onClick={() => setFilter(null)}>
              Tout le voyage
            </button>
            {stagesWithPosts.map((s) => (
              <button key={s.n} className={"stage-chip" + (filter === s.n ? " on" : "")} style={{ "--c": s.couleur }} onClick={() => setFilter(s.n)}>
                <span className="dot" />{String(s.n).padStart(2, "0")} · {s.nom}
              </button>
            ))}
          </div>
        </div>

        {/* carte + KPI : visibles ici seulement sur mobile (en haut du fil) */}
        <div className="home-map-mobile">
          <TripMap points={points} />
          <div className="kpi-row">
            <Kpi n={stats.jours} label="Jours" />
            <Kpi n={stats.villes} label="Lieux" />
            <Kpi n={stats.photos} label="Photos" />
            <Kpi n={stats.rencontres} label="Rencontres" />
          </div>
        </div>

        {/* fil des posts */}
        {shown.length === 0 ? (
          <p className="empty">{posts.length === 0 ? "Le carnet est encore vierge." : "Aucun post pour cette étape."}</p>
        ) : (
          groups.map((g) => (
            <div key={g.key}>
              {g.stage && !filter && (
                <div className="stage-band" style={{ background: g.stage.couleur }}>
                  <span className="stage-band-n">{String(g.stage.n).padStart(2, "0")}</span>
                  <div>
                    <div className="stage-band-name">{g.stage.nom}</div>
                    <div className="stage-band-dates">{fmtDate(g.stage.debut)} → {fmtDate(g.stage.fin)} · {stageDays(g.stage)} jours</div>
                  </div>
                </div>
              )}
              {g.posts.map((e) => <Post key={e.date} e={e} />)}
            </div>
          ))
        )}

        <footer style={{ marginTop: 40, paddingTop: 28, borderTop: "1px solid var(--line)", textAlign: "center" }}>
          <p className="mono" style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14, letterSpacing: "0.06em" }}>
            RECEVOIR UN MOT À CHAQUE NOUVELLE ÉTAPE
          </p>
          <PushButton role="reader" label="Me prévenir" labelDone="Tu seras prévenu ✓" />
          <div style={{ marginTop: 22, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
            <FooterNote />
          </div>
        </footer>
      </div>

      {/* colonne droite fixe : carte + KPI + calendrier (desktop) */}
      <aside className="home-side">
        <div className="home-side-sticky">
          <div className="side-map-wrap">
            <TripMap points={points} />
            <button className="side-map-expand" onClick={() => setMapOpen(true)} aria-label="Agrandir la carte">⛶</button>
          </div>
          <div className="kpi-col">
            <Kpi n={stats.jours} label="Jours racontés" />
            <Kpi n={stats.villes} label="Lieux visités" />
            <Kpi n={stats.photos} label="Photos" />
            <Kpi n={stats.rencontres} label="Rencontres" />
          </div>
          <MiniCalendar posts={sortedPosts} />
        </div>
      </aside>

      {mapOpen && (
        <div className="lb" onClick={() => setMapOpen(false)}>
          <button className="lb-close" onClick={() => setMapOpen(false)}>✕</button>
          <div style={{ width: "90vw", height: "80vh" }} onClick={(e) => e.stopPropagation()}>
            <TripMap points={points} big />
          </div>
        </div>
      )}
    </main>
  );
}

function Kpi({ n, label }) {
  return (
    <div className="kpi">
      <span className="kpi-n">{n}</span>
      <span className="kpi-label">{label}</span>
    </div>
  );
}

function MiniCalendar({ posts }) {
  // map jour -> post publié
  const byDay = {};
  posts.forEach((p) => { byDay[p.day_number] = p; });

  function goTo(n) {
    const el = document.getElementById(`jour-${n}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="side-cal">
      <div className="aside-head" style={{ marginBottom: 8 }}>Les 100 jours</div>
      <div className="side-cal-grid">
        {Array.from({ length: 101 }, (_, n) => {
          const post = byDay[n];
          const stage = post ? stageForDate(post.date) : null;
          return (
            <button
              key={n}
              className={"side-cal-day" + (post ? " done" : "")}
              style={post ? { background: stage?.couleur || "var(--accent)", color: "#fff" } : {}}
              onClick={() => post && goTo(n)}
              disabled={!post}
              title={post ? `Jour ${n} — ${post.titre}` : `Jour ${n}`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
