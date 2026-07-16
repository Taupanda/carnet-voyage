import PhotoGridV2 from "./PhotoGridV2";
import PostSocial from "./PostSocial";
import { stageForDate } from "../lib/stages";
import { meteoInfo } from "../lib/weather";

const NOTES = [
  { key: "note_humeur", label: "Humeur", ic: "😊" },
  { key: "note_energie", label: "Énergie", ic: "⚡" },
  { key: "note_sociale", label: "Sociale", ic: "🤝" },
  { key: "note_aventure", label: "Aventure", ic: "🌋" },
];

function Dots({ v }) {
  return (
    <span className="note-dots">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={"note-dot" + (i <= v ? " on" : "")} />
      ))}
    </span>
  );
}

export default function Post({ e }) {
  const stage = stageForDate(e.date);
  const c = stage?.couleur || "#BC5B2E";
  const recit = Array.isArray(e.recit) ? e.recit : [];
  const dateLabel = new Date(e.date + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });
  const hasNotes = NOTES.some((n) => e[n.key] != null);
  const meteo = e.meteo ? meteoInfo(e.meteo.code) : null;
  const mapUrl =
    e.lat && process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      ? `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s+${c.replace("#", "")}(${e.lng},${e.lat})/${e.lng},${e.lat},9/280x150@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&attribution=false&logo=false`
      : null;

  return (
    <article className="post" style={{ "--stage": c }} id={`jour-${e.day_number}`}>
      <div className="post-inner">
        <div className="post-main">
          <div className="post-jour">Jour {e.day_number}{stage ? ` — ${stage.nom}` : ""}</div>
          <h2 className="post-title">{e.titre}</h2>
          <div className="post-date">{dateLabel}</div>

          <PhotoGridV2 photos={e.photos || []} principale={e.photo_principale} caption={`Jour ${e.day_number}`} />

          {e.lieux?.length > 0 && (
            <div className="chips">
              {e.lieux.map((l, i) => <span key={i} className="chip">{l}</span>)}
            </div>
          )}

          <ul className="bullets">
            {recit.map((it, i) => (
              <li key={i}>
                <div>
                  {it.activite && <b>{it.activite}</b>}
                  {it.activite && it.detail ? " — " : ""}
                  <span>{it.detail}</span>
                </div>
              </li>
            ))}
          </ul>

          {e.anecdote && (
            <div className="block framed">
              <div className="block-head">L'anecdote</div>
              <p>{e.anecdote}</p>
            </div>
          )}
          {e.adresse && (
            <div className="block">
              <div className="block-head">Bonne adresse</div>
              <p>{e.adresse}</p>
            </div>
          )}
          {e.reflexion && (
            <div className="block framed quote">
              <div className="block-head">Ce que je garde</div>
              <p>{e.reflexion}</p>
            </div>
          )}

          <PostSocial entryDate={e.date} />
        </div>

        <aside className="post-aside">
          {hasNotes && (
            <div>
              <div className="aside-head">Le ressenti</div>
              <div className="notes">
                {NOTES.map((n) =>
                  e[n.key] != null ? (
                    <div key={n.key} className="note-row">
                      <span className="note-label"><span>{n.ic}</span>{n.label}</span>
                      <Dots v={e[n.key]} />
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          {e.rencontres_liees?.length > 0 && (
            <div>
              <div className="aside-head">Croisé·es ce jour-là</div>
              <div className="aside-rencs">
                {e.rencontres_liees.map((r) => (
                  <a key={r.id} href="/rencontres" className="aside-renc">
                    {r.photo_url ? (
                      <img src={r.photo_url} alt="" />
                    ) : (
                      <span className="aside-renc-fallback">{r.prenom?.[0]?.toUpperCase()}</span>
                    )}
                    <span className="aside-renc-name">{r.prenom}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {mapUrl && (
            <div>
              <div className="aside-head">Lieu</div>
              <img className="aside-map" src={mapUrl} alt={`Carte : ${e.lieux?.[0] || ""}`} loading="lazy" />
              <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>{e.lieux?.[0]}</p>
            </div>
          )}
          {e.meteo && (
            <div>
              <div className="aside-head">Météo du jour</div>
              <div className="meteo">
                <span className="meteo-emoji">{meteo.emoji}</span>
                <div>
                  <div className="meteo-temp">{e.meteo.tmax}°C</div>
                  <div className="meteo-label">{meteo.label} · min {e.meteo.tmin}°C</div>
                </div>
              </div>
            </div>
          )}
          {e.hebergement && (
            <div>
              <div className="aside-head">Hébergement</div>
              <div className="heberg"><span>🛏️</span><span>{e.hebergement}</span></div>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
