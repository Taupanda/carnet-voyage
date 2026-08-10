import { supabaseAdmin } from "../../lib/server";
import { STAGES, stageForDate } from "../../lib/stages";
import PrintButton from "./PrintButton";

export const revalidate = 300;

export default async function Livre() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("entries")
    .select("date, day_number, titre, lieux, photos, photo_principale, recit, anecdote, adresse, reflexion")
    .eq("status", "published")
    .order("date", { ascending: true });
  const posts = data || [];
  const villes = new Set(posts.flatMap((p) => p.lieux || [])).size;
  const photos = posts.reduce((s, p) => s + (p.photos?.length || 0), 0);

  return (
    <main className="livre">
      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <PrintButton />
      </div>

      <section className="livre-cover">
        <div className="eyebrow">Carnet de voyage</div>
        <h1 className="display">Mexique &amp; Amérique centrale</h1>
        <p style={{ color: "var(--ink2)", marginTop: 12 }}>
          {posts.length} jour{posts.length > 1 ? "s" : ""} · {villes} lieu{villes > 1 ? "x" : ""} · {photos} photo{photos > 1 ? "s" : ""}
        </p>
        <p className="no-print" style={{ color: "var(--muted)", fontSize: 13, marginTop: 16 }}>
          Astuce : « Imprimer » → destination <b>Enregistrer en PDF</b> pour garder le carnet.
        </p>
      </section>

      {posts.length === 0 ? (
        <p className="empty">Le carnet est encore vierge.</p>
      ) : (
        posts.map((e) => {
          const stage = stageForDate(e.date);
          const recit = Array.isArray(e.recit) ? e.recit : [];
          const dateLabel = new Date(e.date + "T00:00:00").toLocaleDateString("fr-FR", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          });
          const cover = e.photo_principale || e.photos?.[0];
          const extra = (e.photos || []).filter((u) => u !== cover).slice(0, 6);
          return (
            <article key={e.date} className="livre-chapter" style={{ "--stage": stage?.couleur || "var(--accent)" }}>
              <div className="livre-jour">Jour {e.day_number}{stage ? ` — ${stage.nom}` : ""}</div>
              <h2 className="display livre-titre">{e.titre}</h2>
              <div className="livre-date">{dateLabel}</div>
              {e.lieux?.length > 0 && <div className="livre-lieux">📍 {e.lieux.join(" · ")}</div>}
              {cover && <img className="livre-photo" src={cover} alt="" />}
              {recit.length > 0 && (
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
              )}
              {e.anecdote && <div className="livre-block"><div className="block-head">L'anecdote</div><p>{e.anecdote}</p></div>}
              {e.adresse && <div className="livre-block"><div className="block-head">Bonne adresse</div><p>{e.adresse}</p></div>}
              {e.reflexion && <div className="livre-block"><div className="block-head">Ce que je garde</div><p>{e.reflexion}</p></div>}
              {extra.length > 0 && (
                <div className="livre-gallery">
                  {extra.map((u, i) => <img key={i} src={u} alt="" />)}
                </div>
              )}
            </article>
          );
        })
      )}
    </main>
  );
}
