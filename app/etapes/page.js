import Link from "next/link";
import { supabasePublic } from "../../lib/server";
import { STAGES, stageForDate, stageDays, todayLocal, fmtDate } from "../../lib/stages";

export const revalidate = 120;

export default async function Etapes() {
  const db = supabasePublic();
  const { data } = await db.from("entries").select("date, photos").eq("status", "published");

  const counts = {};
  for (const e of data || []) {
    const n = stageForDate(e.date)?.n;
    if (!n) continue;
    counts[n] = counts[n] || { posts: 0, photos: 0 };
    counts[n].posts++;
    counts[n].photos += (e.photos || []).length;
  }

  const today = todayLocal();

  return (
    <main className="container" style={{ paddingTop: 30, paddingBottom: 70 }}>
      <p className="eyebrow">12 étapes</p>
      <h1 className="display" style={{ fontSize: "clamp(26px, 5vw, 40px)", margin: "8px 0 22px" }}>
        Le parcours
      </h1>

      {STAGES.map((s) => {
        const cnt = counts[s.n];
        const past = today > s.fin;
        const now = today >= s.debut && today <= s.fin;
        return (
          <Link key={s.n} href={`/etape/${s.n}`} className="stage-card" style={{ "--c": s.couleur, opacity: cnt ? 1 : 0.62 }}>
            <span className="n">{String(s.n).padStart(2, "0")}</span>
            <div>
              <div className="nm">{s.nom}</div>
              <div className="dt">
                {fmtDate(s.debut)} → {fmtDate(s.fin)} · {stageDays(s)} j
                {now && <span style={{ color: s.couleur, fontWeight: 700 }}> · EN COURS</span>}
              </div>
            </div>
            <div className="ct">
              {cnt ? (
                <>
                  {cnt.posts} jour{cnt.posts > 1 ? "s" : ""}
                  <br />
                  {cnt.photos} photo{cnt.photos > 1 ? "s" : ""}
                </>
              ) : past ? "—" : "à venir"}
            </div>
          </Link>
        );
      })}
    </main>
  );
}
