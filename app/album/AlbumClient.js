"use client";
import { useState, useMemo } from "react";
import { STAGES, stageForDate } from "../../lib/stages";
import Lightbox from "../Lightbox";

export default function AlbumClient({ shots }) {
  const [filter, setFilter] = useState(null);
  const [open, setOpen] = useState(null);

  const used = useMemo(() => {
    const set = new Set(shots.map((s) => stageForDate(s.date)?.n).filter(Boolean));
    return STAGES.filter((s) => set.has(s.n));
  }, [shots]);

  const list = useMemo(
    () => (filter ? shots.filter((s) => stageForDate(s.date)?.n === filter) : shots),
    [shots, filter]
  );

  const urls = list.map((s) => s.url);
  const cur = open !== null ? list[open] : null;

  return (
    <main className="container-wide" style={{ paddingTop: 30, paddingBottom: 70 }}>
      <p className="eyebrow">{shots.length} photo{shots.length > 1 ? "s" : ""}</p>
      <h1 className="display" style={{ fontSize: "clamp(26px, 5vw, 40px)", margin: "8px 0 22px" }}>
        Album
      </h1>

      {used.length > 0 && (
        <div className="filters">
          <button
            className={"filter" + (filter === null ? " on" : "")}
            style={filter === null ? { background: "var(--text)", borderColor: "var(--text)" } : {}}
            onClick={() => setFilter(null)}
          >
            Tout
          </button>
          {used.map((s) => (
            <button
              key={s.n}
              className={"filter" + (filter === s.n ? " on" : "")}
              style={filter === s.n ? { background: s.couleur, borderColor: s.couleur } : { borderColor: s.couleur + "66", color: s.couleur }}
              onClick={() => setFilter(s.n)}
            >
              {s.nom}
            </button>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <p className="empty">Aucune photo pour l'instant.</p>
      ) : (
        <div className="album-grid">
          {list.map((s, i) => {
            const c = stageForDate(s.date)?.couleur || "var(--stage)";
            return (
              <div key={i} className="album-cell" style={{ "--c": c }} onClick={() => setOpen(i)}>
                <img src={s.url} alt="" loading="lazy" />
                <span className="album-tag">J{s.day} · {s.lieu}</span>
              </div>
            );
          })}
        </div>
      )}

      {open !== null && (
        <Lightbox
          photos={urls}
          index={open}
          onMove={setOpen}
          onClose={() => setOpen(null)}
          caption={cur ? `Jour ${cur.day} — ${cur.titre}` : ""}
        />
      )}
    </main>
  );
}
