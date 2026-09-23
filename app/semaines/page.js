import Link from "next/link";
import { supabaseAdmin } from "../../lib/server";
import { plageDates } from "../../lib/stages";
import { choisirCouverture } from "../../lib/recap";

export const revalidate = 120;

const dimancheDe = (lundi) => new Date(Date.parse(lundi + "T00:00:00Z") + 6 * 86400000).toISOString().slice(0, 10);

export default async function Semaines() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("weekly_recaps")
    .select("*")
    .eq("status", "published")
    .order("semaine_debut", { ascending: false });
  const recaps = data || [];

  // Les résumés d'avant les photos n'ont pas de couverture choisie : on la tire
  // des posts de leur semaine, en une seule requête.
  const sansCouverture = recaps.filter((r) => !r.mise_en_page?.couverture);
  const couvertures = {};
  if (sansCouverture.length) {
    const debuts = sansCouverture.map((r) => r.semaine_debut).sort();
    const { data: posts } = await db
      .from("entries")
      .select("date, photos, photo_principale")
      .eq("status", "published")
      .gte("date", debuts[0])
      .lte("date", dimancheDe(debuts[debuts.length - 1]));
    for (const r of sansCouverture) {
      const fin = dimancheDe(r.semaine_debut);
      couvertures[r.semaine_debut] = choisirCouverture((posts || []).filter((p) => p.date >= r.semaine_debut && p.date <= fin));
    }
  }

  return (
    <main className="container" style={{ paddingTop: 30, paddingBottom: 70, maxWidth: 720 }}>
      <p className="eyebrow">Le voyage, semaine par semaine</p>
      <h1 className="display" style={{ fontSize: "clamp(26px, 5vw, 40px)", margin: "8px 0 24px" }}>Récaps</h1>

      {recaps.length === 0 ? (
        <p className="empty">Pas encore de résumé publié.</p>
      ) : (
        <div className="recap-cartes">
          {recaps.map((r) => {
            const couverture = r.mise_en_page?.couverture || couvertures[r.semaine_debut];
            const accroche = r.mise_en_page?.chapeau || String(r.contenu || "").split(/\n{2,}/)[0];
            return (
              <Link key={r.id} href={`/semaines/${r.semaine_debut}`} className="recap-carte-lien">
                {couverture ? <img src={couverture} alt="" loading="lazy" /> : <span className="recap-carte-vide" />}
                <div className="recap-carte-texte">
                  <span className="post-jour">Semaine du {plageDates(r.semaine_debut, dimancheDe(r.semaine_debut))}</span>
                  <h2>{r.titre || "Cette semaine"}</h2>
                  {accroche && <p>{accroche}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
