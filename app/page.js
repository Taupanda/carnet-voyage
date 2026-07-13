import { supabasePublic } from "../lib/server";

export const revalidate = 300; // refresh every 5 minutes

const KIFF = ["😑", "🙂", "😊", "🤩", "🥳"];
const AVENTURE = ["🛋️", "🚶", "🧗", "🏄", "🌋"];
const TRIP_START = new Date("2026-09-08T00:00:00Z");
const TRIP_DAYS = 100;

function PostCard({ e }) {
  const recit = Array.isArray(e.recit) ? e.recit : [];
  return (
    <article className="post-card">
      <div className="post-header">
        <div>
          <div className="post-day">
            Jour {e.day_number} ·{" "}
            {new Date(e.date + "T00:00:00").toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
            })}
          </div>
          <h2 className="post-title">{e.titre}</h2>
        </div>
        <div className="post-moods">
          <div className="mood-item">
            <span className="mood-big">{e.humeur}</span>
            <span className="mood-caption">humeur</span>
          </div>
          <div className="mood-item">
            <span className="mood-small">{KIFF[e.kiff]}</span>
            <span className="mood-caption">kiff</span>
          </div>
          <div className="mood-item">
            <span className="mood-small">{AVENTURE[e.aventure]}</span>
            <span className="mood-caption">aventure</span>
          </div>
        </div>
      </div>

      {e.lieux?.length > 0 && (
        <div className="chips">
          {e.lieux.map((l, i) => (
            <span key={i} className="chip">📍 {l}</span>
          ))}
        </div>
      )}

      {e.photos?.length > 0 && (
        <div className="photos">
          {e.photos.map((url, i) => (
            <img key={i} src={url} alt="" loading="lazy" />
          ))}
        </div>
      )}

      <div className="section">
        {recit.map((item, i) => (
          <div key={i} className="bullet">
            <span className="bullet-dot">•</span>
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
          <div className="section-head">Rencontres</div>
          <p className="body-text">{e.rencontres}</p>
        </div>
      )}

      {e.anecdote && (
        <div className="section box-anecdote">
          <div className="section-head">L'anecdote</div>
          <p className="body-text">{e.anecdote}</p>
        </div>
      )}

      {e.adresse && (
        <div className="section">
          <div className="section-head">Bonne adresse</div>
          <p className="body-text">{e.adresse}</p>
        </div>
      )}

      {e.reflexion && (
        <div className="section box-reflexion">
          <div className="section-head">Ce que je garde</div>
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

  const posts = (entries || []).map((r) =>
    r.reflexion_privee ? { ...r, reflexion: null } : r
  );

  const now = new Date();
  const dayNum = Math.min(
    TRIP_DAYS,
    Math.max(0, Math.floor((now - TRIP_START) / 86400000) + 1)
  );
  const progress = Math.round((dayNum / TRIP_DAYS) * 100);

  return (
    <main className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <header style={{ marginBottom: 28 }}>
        <h1 className="serif" style={{ fontSize: 28, marginBottom: 6 }}>
          Carnet de voyage
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
          Mexique & Amérique centrale · 100 jours en solo
        </p>
        <div style={{ background: "var(--bg3)", borderRadius: 20, height: 10, overflow: "hidden" }}>
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "linear-gradient(90deg, var(--gold), var(--pink))",
              borderRadius: 20,
            }}
          />
        </div>
        <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 6 }}>
          {dayNum > 0 ? `Jour ${dayNum} sur ${TRIP_DAYS}` : "Départ le 8 septembre 2026"}
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {posts.length === 0 && (
          <p style={{ color: "var(--muted)", textAlign: "center", marginTop: 40 }}>
            Les premières pages du carnet arrivent bientôt…
          </p>
        )}
        {posts.map((e) => (
          <PostCard key={e.date} e={e} />
        ))}
      </div>
    </main>
  );
}
