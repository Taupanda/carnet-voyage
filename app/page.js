import { supabasePublic } from "../lib/server";
import { STAGES, stageForDate, stageDays, TRIP_DAYS, todayLocal, dayNumberOf, fmtDate } from "../lib/stages";
import TripMap from "./TripMap";
import PushButton from "./PushButton";
import Post from "./Post";
import Dashboard from "./Dashboard";
import FooterNote from "./FooterNote";

export const revalidate = 120;

export default async function Home() {
  const db = supabasePublic();
  const { data } = await db
    .from("entries")
    .select("*")
    .eq("status", "published")
    .order("date", { ascending: false });

  const posts = (data || []).map((r) => (r.reflexion_privee ? { ...r, reflexion: null } : r));

  // rencontres liées aux posts (sans le champ privé "reseaux")
  const dates = posts.map((p) => p.date);
  if (dates.length) {
    const { data: links } = await db.from("entry_rencontres").select("entry_date, rencontre_id").in("entry_date", dates);
    const rIds = [...new Set((links || []).map((l) => l.rencontre_id))];
    if (rIds.length) {
      const { data: rencs } = await db.from("rencontres").select("id, prenom, nom, photo_url, pays").in("id", rIds);
      const byId = Object.fromEntries((rencs || []).map((r) => [r.id, r]));
      const byDate = {};
      (links || []).forEach((l) => {
        (byDate[l.entry_date] = byDate[l.entry_date] || []).push(byId[l.rencontre_id]);
      });
      posts.forEach((p) => { p.rencontres_liees = (byDate[p.date] || []).filter(Boolean); });
    }
  }

  const points = [...posts].reverse().filter((p) => p.lat && p.lng)
    .map((p) => ({ lat: p.lat, lng: p.lng, titre: p.titre, day_number: p.day_number, date: p.date }));

  const today = todayLocal();
  const started = today >= STAGES[0].debut;
  const dayNum = started ? Math.min(TRIP_DAYS, dayNumberOf(today)) : null;
  const current = stageForDate(today);
  const active = current || (posts[0] ? stageForDate(posts[0].date) : STAGES[0]);
  const c = active?.couleur || "#F2A93B";

  // stats pour le dashboard
  const { count: rencCount } = await db.from("rencontres").select("*", { count: "exact", head: true });
  const stats = {
    jours: posts.length,
    villes: new Set(posts.flatMap((p) => p.lieux || [])).size,
    photos: posts.reduce((s, p) => s + (p.photos?.length || 0), 0),
    rencontres: rencCount || 0,
  };

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
        <Dashboard stats={stats} dayNum={dayNum} started={started} />

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

      {groups.length > 1 && (
        <div className="container-wide">
          <div className="stage-nav">
            {groups.map((g) =>
              g.stage ? (
                <a key={g.key} href={`#etape-${g.stage.n}`} className="stage-chip" style={{ "--c": g.stage.couleur }}>
                  <span className="dot" />
                  {String(g.stage.n).padStart(2, "0")} · {g.stage.nom}
                </a>
              ) : null
            )}
          </div>
        </div>
      )}

      <div className="container" style={{ marginTop: 20 }}>
        {posts.length === 0 && (
          <p className="empty">Le carnet est encore vierge.<br />Les premières pages arrivent bientôt.</p>
        )}

        {groups.map((g) => (
          <div key={g.key}>
            {g.stage && (
              <div className="stage-band" id={`etape-${g.stage.n}`} style={{ background: g.stage.couleur, scrollMarginTop: 16 }}>
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
        <div style={{ marginTop: 22, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
          <FooterNote />
        </div>
      </footer>
    </main>
  );
}
