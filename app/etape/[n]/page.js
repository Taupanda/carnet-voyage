import Link from "next/link";
import { notFound } from "next/navigation";
import { supabasePublic } from "../../../lib/server";
import { STAGES, stageDays, fmtDate } from "../../../lib/stages";
import Post from "../../Post";

export const revalidate = 120;

export async function generateStaticParams() {
  return STAGES.map((s) => ({ n: String(s.n) }));
}

export default async function Etape({ params }) {
  const stage = STAGES.find((s) => String(s.n) === params.n);
  if (!stage) notFound();

  const db = supabasePublic();
  const { data } = await db
    .from("entries")
    .select("*")
    .eq("status", "published")
    .gte("date", stage.debut)
    .lte("date", stage.fin)
    .order("date", { ascending: true });

  const posts = (data || []).map((r) => (r.reflexion_privee ? { ...r, reflexion: null } : r));

  return (
    <main className="container" style={{ "--stage": stage.couleur, paddingTop: 26, paddingBottom: 70 }}>
      <Link href="/etapes" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
        ← toutes les étapes
      </Link>

      <div className="stage-band" style={{ background: stage.couleur, marginTop: 16 }}>
        <span className="stage-band-n">{String(stage.n).padStart(2, "0")}</span>
        <div>
          <div className="stage-band-name">{stage.nom}</div>
          <div className="stage-band-dates">
            {fmtDate(stage.debut)} → {fmtDate(stage.fin)} · {stageDays(stage)} jours
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        {posts.length === 0 ? (
          <p className="empty">Cette étape n'a pas encore été écrite.</p>
        ) : (
          posts.map((e) => <Post key={e.date} e={e} />)
        )}
      </div>
    </main>
  );
}
