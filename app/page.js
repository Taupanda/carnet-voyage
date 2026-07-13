import { supabasePublic } from "../lib/server";
import { STAGES, stageForDate } from "../lib/stages";
import TripMap from "./TripMap";
import PushButton from "./PushButton";

export const revalidate = 300;

const KIFF = ["😑", "🙂", "😊", "🤩", "🥳"];
const AVENTURE = ["🛋️", "🚶", "🧗", "🏄", "🌋"];
const TRIP_START = new Date("2026-09-08T00:00:00Z");
const TRIP_DAYS = 100;

function PostCard({ e }) {
  const recit = Array.isArray(e.recit) ? e.recit : [];
  const stage = stageForDate(e.date);
  const color = stage?.couleur || "var(--gold)";

  return (
    <article className="post-card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="post-header">
        <div>
          <div className="post-day" style={{ color }}>
            Jour {e.day_number} ·{" "}
            {new Date(e.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
            {stage && ` · ${stage.nom}`}
          </div>
          <h2 className="post-title">{e.titre}</h2>
        </div>
        <div className="post-moods">
          <div className="mood-item"><span className="mood-big">{e.humeur}</span><span className="mood-caption">humeur</span></div>
          <div className="mood-item"><span className="mood-small">{KIFF[e.kiff]}</span><span className="mood-caption">kiff</span></div>
          <div className="mood-item"><span className="mood-small">{AVENTURE[e.aventure]}</span><span className="mood-caption">aventure</span></div>
        </div>
      </div>

      {e.lieux?.length > 0 && (
        <div className="chips">
          {e.lieux.map((l, i) => (
            <span key={i} className="chip" style={{ background: `${color}22`, border: `1px solid ${color}55` }}>📍 {l}</span>
          ))}
        </div>
      )}

      {e.photos?.length > 0 && (
        <div className="photos">
          {e.photos.map((url, i) => <img key={i} src={url} alt="" loading="lazy" />)}
        </div>
      )}

      <div className="section">
        {recit.map((item, i) => (
          <div key={i} className="bullet">
            <span className="bullet-dot" style={{ color }}>•</span>
            <span className="body-text">
              {item.activite && <b>{item.activite}</b>}
              {item.activite && item.detail ? " — " : ""}
              {item.detail}
            </span>
          </div>
        ))}
      </div>

      {e.rencontres && (
        <div className="section">
          <div className="section-head" style={{ color }}>Rencontres</div>
          <p className="body-text">{e.rencontres}</p>
        </div>
      )}

      {e.anecdote && (
        <div className="section box-anecdote" style={{ borderLeftColor: color }}>
          <div className="section-head" style={{ color }}>L'anecdote</div>
          <p className="body-text">{e.anecdote}</p>
        </div>
      )}

      {e.adresse && (
        <div className="section">
          <div className="section-head" style={{ color }}>Bonne adresse</div>
          <p className="body-text">{e.adresse}</p>
        </div>
      )}

      {e.reflexion && (
        <div className="section box-reflexion" style={{ borderLeftColor: color }}>
          <div className="section-head" style={{ color }}>Ce que je garde</div>
          <p className="body-text">{e.reflexion}</p>
        </div>
      )}
    </article>
  );
}

export default async function Home() {
  const db = supabasePublic();
  const { data: entries } = await db
    .from("entries")
    .select("*")
    .eq("status", "published")
    .order("date", { ascending: false });

  const posts = (entries || []).map((r) => (r.reflexion_privee ? { ...r, reflexion: null } : r));

  // points for the map, chronological order, only those with coords
  const points = [...posts]
    .reverse()
    .filter((p) => p.lat && p.lng)
    .map((p) => ({ lat: p.lat, lng: p.lng, titre: p.titre, day_number: p.day_number, date: p.date }));

  const now = new Date();
  const dayNum = Math.min(TRIP_DAYS, Math.max(0, Math.floor((now - TRIP_START) / 86400000) + 1));
  const progress = Math.round((dayNum / TRIP_DAYS) * 100);
  const todayStr = now.toISOString().slice(0, 10);
  const currentStage = stageForDate(todayStr);
  const lastPost = posts[0];
  const activeStage = currentStage || (lastPost ? stageForDate(lastPost.date) : null);

  return (
    <main className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 className="serif" style={{ fontSize: 28, marginBottom: 6 }}>Carnet de voyage</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 18 }}>
          Mexique & Amérique centrale · 100 jours en solo
        </p>

        <TripMap points={points} />

        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {dayNum > 0 ? `Jour ${dayNum} sur ${TRIP_DAYS}` : "Départ le 8 septembre 2026"}
            </span>
            {activeStage && (
              <span style={{ fontSize: 12.5, color: activeStage.couleur, fontWeight: 600 }}>
                Étape {activeStage.n} · {activeStage.nom}
              </span>
            )}
          </div>

          {/* progress bar segmented by stage */}
          <div style={{ display: "flex", gap: 2, height: 8, borderRadius: 20, overflow: "hidden" }}>
            {STAGES.map((s) => {
              const isPast = todayStr > s.fin;
              const isCurrent = currentStage?.n === s.n;
              const days = (new Date(s.fin) - new Date(s.debut)) / 86400000 + 1;
              return (
                <div
                  key={s.n}
                  title={`Étape ${s.n} — ${s.nom}`}
                  style={{
                    flex: days,
                    background: isPast || isCurrent ? s.couleur : "var(--bg3)",
                    opacity: isCurrent ? 1 : isPast ? 0.8 : 1,
                    boxShadow: isCurrent ? `0 0 0 1px ${s.couleur}` : "none",
                  }}
                />
              );
            })}
          </div>
        </div>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {posts.length === 0 && (
          <p style={{ color: "var(--muted)", textAlign: "center", marginTop: 40 }}>
            Les premières pages du carnet arrivent bientôt…
          </p>
        )}
        {posts.map((e) => <PostCard key={e.date} e={e} />)}
      </div>

      <footer style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--line)", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
          Être prévenu à chaque nouvelle étape du voyage
        </p>
        <PushButton role="reader" label="M'avertir des grandes étapes" labelDone="Tu seras prévenu ✓" />
      </footer>
    </main>
  );
}
