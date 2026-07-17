"use client";
import { useState } from "react";
import TripMap from "./TripMap";
import Post from "./Post";
import FooterNote from "./FooterNote";
import PushButton from "./PushButton";
import { STAGES, stageForDate, stageDays, TRIP_DAYS, todayLocal, fmtDate } from "../lib/stages";

export default function HomeFeed({ posts, points, stats, dayNum, started }) {
  const [filter, setFilter] = useState(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const today = todayLocal();
  const current = stageForDate(today);
  const joursAvantDepart = Math.max(0, Math.ceil((new Date(STAGES[0].debut) - new Date(today)) / 86400000));

  const sortedPosts = [...posts].sort((a, b) => (a.day_number ?? 0) - (b.day_number ?? 0));
  const shown = filter ? sortedPosts.filter((p) => stageForDate(p.date)?.n === filter) : sortedPosts;

  const groups = [];
  for (const p of shown) {
    const s = stageForDate(p.date);
    const key = s?.n ?? 0;
    if (!groups.length || groups[groups.length - 1].key !== key) groups.push({ key, stage: s, posts: [p] });
    else groups[groups.length - 1].posts.push(p);
  }

  function pickFilter(n) {
    setFilter(n);
    setPanelOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const Panel = (
    <>
      {/* carte */}
      <div className="rp-map-wrap">
        <TripMap points={points} />
        <button className="rp-map-expand" onClick={() => setMapOpen(true)} aria-label="Agrandir">⛶</button>
      </div>

      {/* progression */}
      <div className="rp-block">
        <div className="rp-prog-head">
          <span>{started ? `JOUR ${dayNum} / ${TRIP_DAYS}` : joursAvantDepart > 0 ? `J − ${joursAvantDepart} AVANT LE DÉPART` : "LE VOYAGE COMMENCE"}</span>
        </div>
        <div className="prog" style={{ marginTop: 8 }}>
          {STAGES.map((s) => {
            const past = today > s.fin;
            const now = current?.n === s.n;
            return <i key={s.n} title={`${s.n}. ${s.nom}`} style={{ flex: stageDays(s), background: past || now ? s.couleur : "rgba(255,255,255,0.14)", opacity: past ? 0.6 : 1 }} />;
          })}
        </div>
        <div className="rp-stage-now">
          {started && current ? `Étape ${current.n} — ${current.nom}` : `1re étape — ${STAGES[0].nom}`}
        </div>
      </div>

      {/* étapes (liste lisible, sert aussi de filtre) */}
      <div className="rp-block">
        <div className="rp-head">Les étapes</div>
        <div className="rp-stages">
          <button className={"rp-stage" + (filter === null ? " on" : "")} onClick={() => pickFilter(null)}>
            <span className="rp-stage-dot" style={{ background: "var(--accent)" }} />
            <span className="rp-stage-nm">Tout le voyage</span>
            <span className="rp-stage-ct">{sortedPosts.length}</span>
          </button>
          {STAGES.map((s) => {
            const cnt = sortedPosts.filter((p) => stageForDate(p.date)?.n === s.n).length;
            const now = current?.n === s.n;
            return (
              <button key={s.n} className={"rp-stage" + (filter === s.n ? " on" : "")} onClick={() => pickFilter(s.n)} style={{ "--c": s.couleur }}>
                <span className="rp-stage-n">{String(s.n).padStart(2, "0")}</span>
                <span className="rp-stage-nm">
                  {s.nom}
                  {now && <span style={{ color: s.couleur, fontWeight: 700, fontSize: 9.5 }}> · EN COURS</span>}
                </span>
                {cnt > 0 && <span className="rp-stage-ct">{cnt}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI */}
      <div className="rp-kpis">
        <div className="rp-kpi"><span className="rp-kpi-n">{stats.jours}</span><span className="rp-kpi-l">Jours</span></div>
        <div className="rp-kpi"><span className="rp-kpi-n">{stats.villes}</span><span className="rp-kpi-l">Lieux</span></div>
        <div className="rp-kpi"><span className="rp-kpi-n">{stats.photos}</span><span className="rp-kpi-l">Photos</span></div>
        <div className="rp-kpi"><span className="rp-kpi-n">{stats.rencontres}</span><span className="rp-kpi-l">Rencontres</span></div>
      </div>
    </>
  );

  return (
    <div className="home3">
      {/* fil central : posts uniquement */}
      <div className="home3-feed">
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

      {/* panneau fixe à droite (desktop) */}
      <aside className="home3-panel">{Panel}</aside>

      {/* bouton mobile : ouvrir la vue d'ensemble */}
      <button className="home3-fab" onClick={() => setPanelOpen(true)} aria-label="Vue d'ensemble">
        🧭 Vue d'ensemble
      </button>

      {/* panneau mobile en overlay */}
      {panelOpen && (
        <div className="home3-overlay" onClick={() => setPanelOpen(false)}>
          <div className="home3-overlay-panel" onClick={(e) => e.stopPropagation()}>
            <button className="home3-overlay-close" onClick={() => setPanelOpen(false)}>✕</button>
            {Panel}
          </div>
        </div>
      )}

      {mapOpen && (
        <div className="lb" onClick={() => setMapOpen(false)}>
          <button className="lb-close" onClick={() => setMapOpen(false)}>✕</button>
          <div style={{ width: "90vw", height: "80vh" }} onClick={(e) => e.stopPropagation()}>
            <TripMap points={points} big />
          </div>
        </div>
      )}
    </div>
  );
}
