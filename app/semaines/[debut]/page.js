import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "../../../lib/server";
import { calendrierServeur } from "../../../lib/etapesServeur";
import { plageDates, afficheJour } from "../../../lib/stages";
import { chiffresSemaine, choisirCouverture, photosDuJour, paragraphes } from "../../../lib/recap";
import TripMap from "../../TripMap";
import { PhotosChapitre, ToutesLesPhotos } from "../Photos";

export const revalidate = 120;

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;
const dimancheDe = (lundi) => new Date(Date.parse(lundi + "T00:00:00Z") + 6 * 86400000).toISOString().slice(0, 10);
const jourCourt = (d) => new Date(d + "T00:00:00Z").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" });

async function lireRecap(lundi) {
  if (!DATE_ISO.test(lundi)) return null;
  const { data } = await supabaseAdmin()
    .from("weekly_recaps")
    .select("*")
    .eq("semaine_debut", lundi)
    .eq("status", "published")
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }) {
  const recap = await lireRecap(params.debut);
  if (!recap) return {};
  const image = recap.mise_en_page?.couverture;
  return {
    title: `${recap.titre || "La semaine"} — Les aventures de Maxou`,
    description: recap.mise_en_page?.chapeau || String(recap.contenu || "").slice(0, 160),
    openGraph: image ? { images: [image] } : undefined,
  };
}

export default async function Semaine({ params }) {
  const lundi = params.debut;
  const recap = await lireRecap(lundi);
  if (!recap) notFound();
  const dimanche = dimancheDe(lundi);
  const db = supabaseAdmin();

  const [{ data }, { data: publies }, { stageForDate }] = await Promise.all([
    db.from("entries").select("*").eq("status", "published").gte("date", lundi).lte("date", dimanche).order("date", { ascending: true }),
    db.from("weekly_recaps").select("semaine_debut, titre").eq("status", "published").order("semaine_debut", { ascending: true }),
    calendrierServeur(),
  ]);
  // La réflexion peut être privée : elle ne sert pas ici, elle ne sort pas.
  const posts = (data || []).map(({ reflexion, reflexion_privee, ...e }) => e);

  const mp = recap.mise_en_page;
  const couverture = mp?.couverture || choisirCouverture(posts);
  // Un résumé d'avant les chapitres : son texte, illustré par la photo
  // principale de chaque jour.
  const sections = mp?.sections?.length
    ? mp.sections
    : [{
        titre: "",
        texte: recap.contenu || "",
        jours: posts.map((p) => p.date),
        photos: posts.map((p) => photosDuJour(p)[0]).filter((u) => u && u !== couverture).slice(0, 6),
      }];

  const etapes = [...new Map(posts.map((p) => stageForDate(p.date)).filter(Boolean).map((s) => [s.n, s])).values()];
  const couleur = etapes[0]?.couleur || "var(--accent)";
  const parDate = new Map(posts.map((p) => [p.date, p]));
  const lienJour = (p) => {
    const s = stageForDate(p.date);
    return s ? `/etape/${s.n}#jour-${p.day_number}` : `/#jour-${p.day_number}`;
  };
  const points = posts.filter((p) => p.lat && p.lng)
    .map((p) => ({ lat: p.lat, lng: p.lng, titre: p.titre, day_number: p.day_number, date: p.date }));
  const toutes = [...new Set([couverture, ...posts.flatMap(photosDuJour)].filter(Boolean))];

  const rang = (publies || []).findIndex((r) => r.semaine_debut === lundi);
  const precedente = rang > 0 ? publies[rang - 1] : null;
  const suivante = rang >= 0 && rang < (publies || []).length - 1 ? publies[rang + 1] : null;
  const legende = `Semaine du ${plageDates(lundi, dimanche)}`;

  return (
    <main className="container recap-page" style={{ "--stage": couleur, paddingTop: 20, paddingBottom: 70, maxWidth: 720 }}>
      <Link href="/semaines" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>← toutes les semaines</Link>

      <header className={"recap-cover" + (couverture ? "" : " sans-photo")}>
        {couverture && <img src={couverture} alt="" />}
        <div className="recap-cover-texte">
          <div className="recap-cover-etapes">
            {etapes.map((s) => (
              <span key={s.n} style={{ background: s.couleur }}>{s.nom}</span>
            ))}
          </div>
          <p className="recap-cover-dates">{legende}</p>
          <h1>{recap.titre || "La semaine"}</h1>
        </div>
      </header>

      <div className="recap-chiffres">
        {chiffresSemaine(posts).map((c) => (
          <div key={c.l}><strong>{c.n}</strong><span>{c.l}</span></div>
        ))}
      </div>

      {mp?.chapeau && <p className="recap-chapeau">{mp.chapeau}</p>}

      {points.length > 0 && (
        <div className="recap-carte">
          <TripMap points={points} />
        </div>
      )}

      {sections.map((sec, i) => (
        <section key={i} className="recap-section">
          {sec.titre && <h2>{sec.titre}</h2>}
          {paragraphes(sec.texte).map((p, j) => <p key={j}>{p}</p>)}
          <PhotosChapitre photos={sec.photos} caption={sec.titre || legende} />
          {sec.jours?.length > 0 && mp?.sections?.length > 0 && (
            <div className="recap-jours-liens">
              {sec.jours.map((d) => parDate.get(d)).filter(Boolean).map((p) => (
                <Link key={p.date} href={lienJour(p)}>Jour {afficheJour(p.day_number)} →</Link>
              ))}
            </div>
          )}
        </section>
      ))}

      <ToutesLesPhotos photos={toutes} caption={legende} />

      {posts.length > 0 && (
        <>
          <div className="aside-head" style={{ margin: "30px 0 10px" }}>Les jours de la semaine</div>
          <div className="recap-ruban">
            {posts.map((p) => {
              const vignette = photosDuJour(p)[0];
              const s = stageForDate(p.date);
              return (
                <Link key={p.date} href={lienJour(p)} className="recap-jour" style={{ "--c": s?.couleur || couleur }}>
                  {vignette ? <img src={vignette} alt="" loading="lazy" /> : <span className="recap-jour-vide" />}
                  <span className="recap-jour-n">Jour {afficheJour(p.day_number)} · {jourCourt(p.date)}</span>
                  <span className="recap-jour-titre">{p.titre}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <nav className="recap-nav">
        {precedente ? (
          <Link href={`/semaines/${precedente.semaine_debut}`}>← {precedente.titre || `Semaine du ${plageDates(precedente.semaine_debut, dimancheDe(precedente.semaine_debut))}`}</Link>
        ) : <span />}
        {suivante ? (
          <Link href={`/semaines/${suivante.semaine_debut}`} style={{ textAlign: "right" }}>{suivante.titre || `Semaine du ${plageDates(suivante.semaine_debut, dimancheDe(suivante.semaine_debut))}`} →</Link>
        ) : <span />}
      </nav>
    </main>
  );
}
