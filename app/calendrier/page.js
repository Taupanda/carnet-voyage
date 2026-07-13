import Link from "next/link";
import { supabasePublic } from "../../lib/server";
import { STAGES, stageForDate, TRIP_START, TRIP_DAYS, todayLocal } from "../../lib/stages";

export const revalidate = 120;

export default async function Calendrier() {
  const db = supabasePublic();
  const { data } = await db
    .from("entries")
    .select("date, day_number, titre, photos")
    .eq("status", "published");

  const byDate = {};
  for (const e of data || []) byDate[e.date] = e;

  const today = todayLocal();
  const days = [];
  for (let i = 0; i < TRIP_DAYS; i++) {
    const d = new Date(new Date(TRIP_START).getTime() + i * 86400000).toISOString().slice(0, 10);
    days.push({ date: d, n: i + 1, entry: byDate[d], stage: stageForDate(d) });
  }

  const written = Object.keys(byDate).length;

  return (
    <main className="container-wide" style={{ paddingTop: 30, paddingBottom: 70 }}>
      <p className="eyebrow">{written} / {TRIP_DAYS} jours racontés</p>
      <h1 className="display" style={{ fontSize: "clamp(26px, 5vw, 40px)", margin: "8px 0 22px" }}>
        Cent jours
      </h1>

      <div className="cal-grid">
        {days.map((d) => {
          const c = d.stage?.couleur || "var(--line)";
          if (!d.entry) {
            return (
              <div
                key={d.date}
                className={"cal-day" + (d.date === today ? " today" : "")}
                title={`Jour ${d.n} — ${d.stage?.nom || ""}`}
                style={{ borderColor: d.date <= today ? c + "55" : "var(--line)" }}
              >
                <span className="n">{d.n}</span>
              </div>
            );
          }
          const cover = d.entry.photos?.[0];
          return (
            <Link
              key={d.date}
              href={`/etape/${d.stage?.n}#jour-${d.n}`}
              className={"cal-day done" + (d.date === today ? " today" : "")}
              title={`Jour ${d.n} — ${d.entry.titre}`}
              style={{ background: c }}
            >
              {cover && <img src={cover} alt="" loading="lazy" />}
              <span className="n">{d.n}</span>
            </Link>
          );
        })}
      </div>

      <div className="filters" style={{ marginTop: 24 }}>
        {STAGES.map((s) => (
          <Link key={s.n} href={`/etape/${s.n}`} className="filter" style={{ borderColor: s.couleur + "66", color: s.couleur }}>
            {String(s.n).padStart(2, "0")} {s.nom}
          </Link>
        ))}
      </div>
    </main>
  );
}
