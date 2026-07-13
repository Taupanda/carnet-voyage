import { supabasePublic } from "../lib/server";
import { STAGES, stageForDate, stageDays, TRIP_DAYS, todayLocal, dayNumberOf, fmtDate } from "../lib/stages";
import TripMap from "./TripMap";
import PushButton from "./PushButton";
import Post from "./Post";

export const revalidate = 120;

export default async function Home() {
  const db = supabasePublic();
  const { data } = await db
    .from("entries")
    .select("*")
    .eq("status", "published")
    .order("date", { ascending: false });

  const posts = (data || []).map((r) => (r.reflexion_privee ? { ...r, reflexion: null } : r));

  const points = [...posts].reverse().filter((p) => p.lat && p.lng)
    .map((p) => ({ lat: p.lat, lng: p.lng, titre: p.titre, day_number: p.day_number, date: p.date }));

  const today = todayLocal();
  const started = today >= STAGES[0].debut;
  const dayNum = started ? Math.min(TRIP_DAYS, dayNumberOf(today)) : null;
  const current = stageForDate(today);
  const active = current || (posts[0] ? stageForDate(posts[0].date) : STAGES[0]);
  const c = active?.couleur || "#F2A93B";

  // regrouper par étape pour insérer les bandeaux
  const groups = [];
  for (const p of posts) {
    const s = stageForDate(p.date);
    const key = s?.n ?? 0;
    if (!groups.length || groups[groups.length - 1].key !== key) {
      groups.push({ key, stage: s, posts: [p] });
    } else {
      groups[groups.length - 1].posts.push(p);
    }
  }

  return (
    <main style={{ "--stage": c, paddingBottom: 70 }}>
      <div className="container-wide" style={{ paddingTop: 30 }}>
        <p className="eyebrow">Mexique · Guatemala · Belize · Salvador</p>
        <h1 className="display" style={{ fontSize: "clamp(30px, 6vw, 52px)", margin: "10px 0 6px" }}>
          Cent jours,<br />un jour à la fois.
        </h1>
        <p style={{ color: "var(--text2)", maxWidth: 460, marginBottom: 24 }}>
          Chaque soir, je raconte la journée. Voilà ce que ça donne.
        </p>

        <TripMap points={points} />

        <div style={{ marginTop: 16, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7, gap: 12 }}>
            <span className="mono" style={{ fontSize: 12.5, color: "var(--text2)" }}>
              {started ? `JOUR ${dayNum} / ${TRIP_DAYS}` : `DÉPART LE ${fmtDate(STAGES[0].debut).toUpperCase()}`}
            </span>
            {active && (
              <span className="mono" style={{ fontSize: 12, color: c, fontWeight: 700, textAlign: "right" }}>
                ÉTAPE {active.n} — {active.nom.toUpperCase()}
              </span>
            )}
          </div>
          <div className="prog">
            {STAGES.map((s) => {
              const past = today > s.fin;
              const now = current?.n === s.n;
              return (
                <i
                  key={s.n}
                  title={`${s.n}. ${s.nom}`}
                  style={{
                    flex: stageDays(s),
                    background: past || now ? s.couleur : "var(--ink3)",
                    opacity: past ? 0.55 : 1,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: 30 }}>
        {posts.length === 0 && (
          <p className="empty">Le carnet est encore vierge.<br />Les premières pages arrivent bientôt.</p>
        )}

        {groups.map((g) => (
          <div key={g.key}>
            {g.stage && (
              <div className="stage-band" style={{ background: g.stage.couleur }}>
                <span className="stage-band-n">{String(g.stage.n).padStart(2, "0")}</span>
                <div>
                  <div className="stage-band-name">{g.stage.nom}</div>
                  <div className="stage-band-dates">
                    {fmtDate(g.stage.debut)} → {fmtDate(g.stage.fin)} · {stageDays(g.stage)} jours
                  </div>
                </div>
              </div>
            )}
            {g.posts.map((e) => <Post key={e.date} e={e} />)}
          </div>
        ))}
      </div>

      <footer className="container" style={{ marginTop: 50, paddingTop: 28, borderTop: "1px solid var(--line)", textAlign: "center" }}>
        <p className="mono" style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14, letterSpacing: "0.06em" }}>
          RECEVOIR UN MOT À CHAQUE NOUVELLE ÉTAPE
        </p>
        <PushButton role="reader" label="Me prévenir" labelDone="Tu seras prévenu ✓" />
      </footer>
    </main>
  );
}
