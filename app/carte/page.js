import Link from "next/link";
import { supabaseAdmin } from "../../lib/server";
import { STAGES, stageForDate, stageDays, todayLocal, dayNumberOf, TRIP_DAYS, fmtDate } from "../../lib/stages";
import TripMap from "../TripMap";

export const revalidate = 120;

export default async function Carte() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("entries")
    .select("date, lat, lng, titre, day_number")
    .eq("status", "published")
    .order("date", { ascending: true });
  const posts = data || [];
  const points = posts
    .filter((p) => p.lat && p.lng)
    .map((p) => ({ lat: p.lat, lng: p.lng, titre: p.titre, day_number: p.day_number, date: p.date }));

  const today = todayLocal();
  const current = stageForDate(today);
  const started = today >= STAGES[0].debut;
  const dayNum = started ? Math.min(TRIP_DAYS, Math.max(0, dayNumberOf(today))) : null;
  const joursAvant = Math.max(0, Math.ceil((new Date(STAGES[0].debut) - new Date(today)) / 86400000));

  return (
    <main className="container-wide" style={{ paddingTop: 24, paddingBottom: 70 }}>
      <p className="eyebrow">Où en est le voyage</p>
      <h1 className="display" style={{ fontSize: "clamp(26px, 5vw, 40px)", margin: "8px 0 14px" }}>Carte de suivi</h1>

      <div className="carte-now">
        <div>
          <div className="carte-now-label">{started ? `Jour ${dayNum} / ${TRIP_DAYS}` : joursAvant > 0 ? `J − ${joursAvant} avant le départ` : "Le voyage commence"}</div>
          <div className="carte-now-stage" style={{ color: current?.couleur || "var(--accent)" }}>
            {started && current ? `Étape ${current.n} — ${current.nom}` : `1re étape — ${STAGES[0].nom}`}
          </div>
        </div>
      </div>

      <div style={{ height: "min(60vh, 540px)", minHeight: 340, margin: "16px 0 24px" }}>
        <TripMap points={points} big />
      </div>

      <div className="rp-head" style={{ color: "var(--muted)", marginBottom: 10 }}>Les étapes — clique pour lire</div>
      {STAGES.map((s) => {
        const cnt = posts.filter((p) => stageForDate(p.date)?.n === s.n).length;
        const now = current?.n === s.n;
        return (
          <Link key={s.n} href={`/etape/${s.n}`} className="stage-card" style={{ "--c": s.couleur, opacity: cnt || now ? 1 : 0.6 }}>
            <span className="n">{String(s.n).padStart(2, "0")}</span>
            <div>
              <div className="nm">{s.nom}{now && <span style={{ color: s.couleur, fontWeight: 700, fontSize: 11 }}> · EN COURS</span>}</div>
              <div className="dt">{fmtDate(s.debut)} → {fmtDate(s.fin)} · {stageDays(s)} j</div>
            </div>
            <div className="ct">{cnt > 0 ? `${cnt} jour${cnt > 1 ? "s" : ""}` : "à venir"}</div>
          </Link>
        );
      })}
    </main>
  );
}
