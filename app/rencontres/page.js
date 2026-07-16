"use client";
import { useState, useEffect } from "react";

export default function Rencontres() {
  const [rencs, setRencs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    fetch("/api/rencontres")
      .then((r) => r.json())
      .then((d) => { setRencs(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const pays = [...new Set(rencs.map((r) => r.pays).filter(Boolean))];

  return (
    <main className="container-wide" style={{ paddingTop: 30, paddingBottom: 70 }}>
      <p className="eyebrow">{rencs.length} rencontre{rencs.length > 1 ? "s" : ""}{pays.length ? ` · ${pays.length} pays` : ""}</p>
      <h1 className="display" style={{ fontSize: "clamp(28px, 5vw, 44px)", margin: "8px 0 6px" }}>
        Les gens du voyage
      </h1>
      <p style={{ color: "var(--ink2)", marginBottom: 28, maxWidth: 480 }}>
        Un voyage en solo n'est jamais vraiment solitaire. Voici celles et ceux qui ont croisé ma route.
      </p>

      {loading ? (
        <p className="empty">Chargement…</p>
      ) : rencs.length === 0 ? (
        <p className="empty">Aucune rencontre pour l'instant. Le voyage commence à peine.</p>
      ) : (
        <div className="renc-grid">
          {rencs.map((r) => (
            <div key={r.id} className="renc-card">
              <div className="renc-photo" onClick={() => r.photo_url && setZoom(r.photo_url)}>
                {r.photo_url ? (
                  <img src={r.photo_url} alt={r.prenom} />
                ) : (
                  <span className="renc-initial">{r.prenom?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="renc-body">
                <div className="renc-name">{r.prenom} {r.nom || ""}</div>
                {r.pays && <div className="renc-pays">📍 {r.pays}</div>}
                {r.lieu_rencontre && (
                  <div className="renc-meta"><span className="renc-meta-k">Rencontré·e à</span> {r.lieu_rencontre}</div>
                )}
                {r.activites && (
                  <div className="renc-meta"><span className="renc-meta-k">Ensemble</span> {r.activites}</div>
                )}
                {r.anecdote && <p className="renc-anecdote">« {r.anecdote} »</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {zoom && (
        <div className="lb" onClick={() => setZoom(null)}>
          <button className="lb-close" onClick={() => setZoom(null)}>✕</button>
          <img src={zoom} alt="" />
        </div>
      )}
    </main>
  );
}
