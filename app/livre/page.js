import { supabaseAdmin } from "../../lib/server";
import { STAGES, stageForDate } from "../../lib/stages";
import PrintButton from "./PrintButton";

export const revalidate = 300;

const BRAND = "Les aventures de Maxou";

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
    <main className="book">
      <div className="no-print book-toolbar">
        <PrintButton />
      </div>

      {/* Couverture */}
      <section className="book-page book-cover">
        <div className="eyebrow">Journal de voyage</div>
        <h1 className="display book-cover-title">{BRAND}</h1>
        <div className="book-cover-sub">Mexique &amp; Amérique centrale</div>
        <div className="book-cover-meta">{posts.length} jours · {villes} lieux · {photos} photos</div>
        <p className="no-print" style={{ color: "var(--muted)", fontSize: 13, marginTop: 22 }}>
          Astuce : « Imprimer » → destination <b>Enregistrer en PDF</b>. En affichage double-page, la photo se retrouve à gauche et le récit à droite.
        </p>
      </section>

      {posts.length === 0 ? (
        <p className="empty">Les aventures n'ont pas encore commencé.</p>
      ) : (
        posts.map((e) => {
          const stage = stageForDate(e.date);
          const c = stage?.couleur || "#BC5B2E";
          const recit = Array.isArray(e.recit) ? e.recit : [];
          const dateLabel = new Date(e.date + "T00:00:00").toLocaleDateString("fr-FR", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          });
          const cover = e.photo_principale || e.photos?.[0];
          const gallery = (e.photos || []).filter((u) => u !== cover).slice(0, 4);
          return (
            <div key={e.date} className="book-day" style={{ "--stage": c }}>
              {/* Page photo (gauche) */}
              {cover && (
                <section className="book-page book-photo-page">
                  <header className="book-run"><span>{BRAND}</span><span>{stage ? `Étape ${stage.n} · ${stage.nom}` : ""}</span></header>
                  <div className="book-photo-wrap">
                    <img src={cover} alt="" className="book-photo-main" />
                    {gallery.length > 0 && (
                      <div className="book-photo-strip">
                        {gallery.map((u, i) => <img key={i} src={u} alt="" />)}
                      </div>
                    )}
                  </div>
                  <footer className="book-run"><span>Jour {e.day_number}</span><span>{(e.lieux || []).join(" · ")}</span></footer>
                </section>
              )}

              {/* Page texte (droite) */}
              <section className="book-page book-text-page">
                <header className="book-run"><span>{BRAND}</span><span>Jour {e.day_number}</span></header>
                <div className="book-text-body">
                  <div className="book-day-num">Jour {e.day_number}{stage ? ` — ${stage.nom}` : ""}</div>
                  <h2 className="display book-day-title">{e.titre}</h2>
                  <div className="book-day-date">{dateLabel}</div>
                  {e.lieux?.length > 0 && <div className="book-day-lieux">📍 {e.lieux.join(" · ")}</div>}
                  {recit.length > 0 && (
                    <ul className="bullets book-recit">
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
                  {e.anecdote && <div className="book-block"><div className="block-head">L'anecdote</div><p>{e.anecdote}</p></div>}
                  {e.adresse && <div className="book-block"><div className="block-head">Bonne adresse</div><p>{e.adresse}</p></div>}
                  {e.reflexion && <div className="book-block quote"><div className="block-head">Ce que je garde</div><p>{e.reflexion}</p></div>}
                </div>
                <footer className="book-run"><span>{dateLabel}</span><span>{BRAND}</span></footer>
              </section>
            </div>
          );
        })
      )}
    </main>
  );
}
