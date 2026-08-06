import { supabaseAdmin } from "../../lib/server";

export const revalidate = 120;

const fmtWeek = (d) => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default async function Semaines() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("weekly_recaps")
    .select("*")
    .eq("status", "published")
    .order("semaine_debut", { ascending: false });
  const recaps = data || [];

  return (
    <main className="container" style={{ paddingTop: 30, paddingBottom: 70, maxWidth: 680 }}>
      <p className="eyebrow">Le voyage, semaine par semaine</p>
      <h1 className="display" style={{ fontSize: "clamp(26px, 5vw, 40px)", margin: "8px 0 24px" }}>Récaps</h1>

      {recaps.length === 0 ? (
        <p className="empty">Pas encore de résumé publié.</p>
      ) : (
        recaps.map((r) => (
          <article key={r.id} className="post" style={{ padding: 24, marginBottom: 20 }}>
            <div className="post-jour">Semaine du {fmtWeek(r.semaine_debut)}</div>
            <h2 className="post-title" style={{ fontSize: 24 }}>{r.titre || "Cette semaine"}</h2>
            <div style={{ marginTop: 10, color: "var(--ink2)", fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {r.contenu}
            </div>
          </article>
        ))
      )}
    </main>
  );
}
