import { supabaseAdmin } from "../../lib/server";
import { afficheJour, decoupeAnecdotes, stageDays, plageDates } from "../../lib/stages";
import { calendrierServeur } from "../../lib/etapesServeur";
import { photosDuJour } from "../../lib/recap";
import { chiffresLivre, moyennesNotes, meteosFrequentes, PHOTOS_PAR_PLANCHE } from "../../lib/livre";
import { meteoInfo } from "../../lib/weather";
import { totauxKm, arrondiKm, modeInfo } from "../../lib/geo";
import PrintButton from "./PrintButton";
import Ajusteur from "./Ajusteur";
import Planche from "./Planche";

export const revalidate = 300;

const BRAND = "Les aventures de Maxou";
// Zone utile d'une page photo : A4 moins les marges, l'en-tête et le pied.
const PLANCHE = { largeur: 178, hauteur: 243 };

const NOTES = [
  { key: "note_humeur", label: "Humeur", ic: "😊" },
  { key: "note_energie", label: "Énergie", ic: "⚡" },
  { key: "note_sociale", label: "Sociale", ic: "🤝" },
  { key: "note_aventure", label: "Aventure", ic: "🌋" },
];

const dateLongue = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function Points({ v, max = 5 }) {
  return (
    <span className="livre-points">
      {Array.from({ length: max }, (_, i) => <i key={i} className={i < Math.round(v) ? "on" : ""} />)}
    </span>
  );
}

function Feuille({ cote, stage, className = "", tete, pied, children, hidden }) {
  return (
    <section
      className={`feuille feuille-${cote} ${className}`}
      style={stage ? { "--stage": stage.couleur, "--n": stage.n } : undefined}
      hidden={hidden}
    >
      {stage && <span className="feuille-filet" />}
      {stage && <span className="onglet">{stage.n}</span>}
      {tete && <header className="feuille-tete">{tete}</header>}
      {children}
      {pied && <footer className="feuille-pied">{pied}</footer>}
    </section>
  );
}

// Le bandeau du jour : ressentis, météo et distances, d'un coup d'œil.
function Bandeau({ e }) {
  const meteo = e.meteo?.code != null ? meteoInfo(e.meteo.code) : null;
  const km = totauxKm(e);
  const notes = NOTES.filter((n) => e[n.key] != null);
  if (!meteo && !notes.length && !km.total) return null;
  return (
    <div className="bandeau-jour">
      {meteo && (
        <span className="bandeau-item">
          {meteo.emoji} {meteo.label}
          {e.meteo.tmax != null && <span className="bandeau-faible">{e.meteo.tmax}° / {e.meteo.tmin}°</span>}
        </span>
      )}
      {notes.map((n) => (
        <span key={n.key} className="bandeau-item" title={n.label}>{n.ic} <Points v={e[n.key]} /></span>
      ))}
      {km.ancien && <span className="bandeau-item">📏 {arrondiKm(km.total)} km</span>}
      {km.marche > 0 && <span className="bandeau-item">🚶 {arrondiKm(km.marche)} km</span>}
      {km.trajets.map((t, i) => (
        <span key={i} className="bandeau-item">{modeInfo(t.mode).ic} {arrondiKm(t.km)} km</span>
      ))}
    </div>
  );
}

export default async function Livre() {
  const { STAGES, stageForDate, TRIP_START, TRIP_END, TRIP_DATES } = await calendrierServeur();
  const db = supabaseAdmin();
  const [{ data }, { count: rencontres }] = await Promise.all([
    db.from("entries").select("*").eq("status", "published").order("date", { ascending: true }),
    db.from("rencontres").select("*", { count: "exact", head: true }),
  ]);
  // La page est publique : une réflexion marquée privée n'y figure pas, comme
  // sur le blog.
  const posts = (data || []).map((r) => (r.reflexion_privee ? { ...r, reflexion: null } : r));

  const tuiles = chiffresLivre(posts, { etapes: STAGES, rencontres: rencontres || 0, joursVoyage: TRIP_DATES });
  const moyennes = moyennesNotes(posts);
  const meteos = meteosFrequentes(posts, meteoInfo).slice(0, 4);
  const racontes = (s) => posts.filter((p) => p.date >= s.debut && p.date <= s.fin).length;

  return (
    <main className="book">
      <div className="no-print book-toolbar">
        <p>
          Aperçu page par page, au format A4. Pour le PDF : « Imprimer » → <b>Enregistrer en PDF</b>, marges <b>aucune</b>,
          et cocher <b>Graphiques d'arrière-plan</b>.
        </p>
        <PrintButton />
      </div>

      <Ajusteur>
        {/* Couverture : page de droite */}
        <Feuille cote="droite" className="feuille-couverture">
          <div className="couverture">
            <div className="couverture-sur">Journal de voyage</div>
            <h1>{BRAND}</h1>
            <div className="couverture-sous">Mexique &amp; Amérique centrale</div>
            <div className="couverture-dates">{plageDates(TRIP_START, TRIP_END)} 2026</div>
          </div>
          <div className="couverture-etapes">
            {STAGES.map((s) => <i key={s.n} style={{ background: s.couleur, flex: stageDays(s) }} />)}
          </div>
        </Feuille>

        {/* Double page d'ouverture : les étapes, puis les chiffres */}
        <Feuille cote="gauche" tete={<><span>{BRAND}</span><span>Le voyage</span></>}>
          <div className="ouverture">
            <h2>Le voyage en un coup d'œil</h2>
            <p className="ouverture-sous">{dateLongue(TRIP_START)} → {dateLongue(TRIP_END)} · {TRIP_DATES} jours</p>
            <div className="frise">
              {STAGES.map((s) => (
                <i key={s.n} style={{ background: s.couleur, flex: stageDays(s) }}>{s.n}</i>
              ))}
            </div>
            <ol className="legende-etapes">
              {STAGES.map((s) => (
                <li key={s.n} style={{ "--stage": s.couleur }}>
                  <span className="legende-n">{s.n}</span>
                  <span className="legende-nom">{s.nom}</span>
                  <span className="legende-dates">{plageDates(s.debut, s.fin)} · {stageDays(s)} j</span>
                  <span className="legende-racontes">{racontes(s) ? `${racontes(s)} raconté${racontes(s) > 1 ? "s" : ""}` : ""}</span>
                </li>
              ))}
            </ol>
            <p className="ouverture-note">Chaque page porte la couleur de son étape, et un onglet à son numéro sur la tranche.</p>
          </div>
        </Feuille>

        <Feuille cote="droite" tete={<><span>{BRAND}</span><span>En chiffres</span></>}>
          <div className="ouverture">
            <h2>En chiffres</h2>
            <div className="kpis">
              {tuiles.map((t) => (
                <div key={t.l} className="kpi"><strong>{t.n}</strong><span>{t.ic ? `${t.ic} ` : ""}{t.l}</span></div>
              ))}
            </div>
            {NOTES.some((n) => moyennes[n.key] != null) && (
              <>
                <h3>Le ressenti moyen</h3>
                <div className="moyennes">
                  {NOTES.filter((n) => moyennes[n.key] != null).map((n) => (
                    <div key={n.key} className="moyenne">
                      <span>{n.ic} {n.label}</span>
                      <Points v={moyennes[n.key]} />
                      <b>{String(moyennes[n.key]).replace(".", ",")}</b>
                    </div>
                  ))}
                </div>
              </>
            )}
            {meteos.length > 0 && (
              <>
                <h3>Le temps qu'il a fait</h3>
                <div className="meteos">
                  {meteos.map((m) => <span key={m.libelle}>{m.libelle} <b>{m.jours} j</b></span>)}
                </div>
              </>
            )}
          </div>
        </Feuille>

        {posts.map((e) => {
          const stage = stageForDate(e.date);
          const jour = afficheJour(e.day_number);
          const toutes = photosDuJour(e);
          const photos = toutes.slice(0, PHOTOS_PAR_PLANCHE);
          const recit = Array.isArray(e.recit) ? e.recit : [];
          const etape = stage ? <span className="etape">Étape {stage.n} · {stage.nom}</span> : <span />;
          const titre = <>Jour {jour}{stage ? ` · ${stage.nom}` : ""}</>;

          return (
            <div key={e.date} className="livre-jour">
              {/* Page de gauche : la planche photo, ou la carte du jour sans photo */}
              <Feuille
                cote="gauche"
                stage={stage}
                tete={<><span>{BRAND}</span>{etape}</>}
                pied={<><span>Jour {jour}</span><span>{toutes.length > photos.length ? `${photos.length} photos sur ${toutes.length}` : (e.lieux || []).join(" · ")}</span></>}
              >
                <div className="feuille-contenu">
                  {photos.length ? (
                    <Planche photos={photos} {...PLANCHE} />
                  ) : (
                    <div className="carte-jour">
                      <div className="carte-jour-n">Jour {jour}</div>
                      <div className="carte-jour-titre">{e.titre}</div>
                      {e.lieux?.length > 0 && <div className="carte-jour-lieux">📍 {e.lieux.join(" · ")}</div>}
                    </div>
                  )}
                </div>
              </Feuille>

              {/* Page de droite : le bandeau du jour et le récit */}
              <Feuille cote="droite" stage={stage} className="feuille-texte" tete={<><span>{BRAND}</span>{etape}</>} pied={<><span>{dateLongue(e.date)}</span><span>Jour {jour}</span></>}>
                <Bandeau e={e} />
                <div className="texte-corps">
                  <div className="jour-entete">
                    <div className="jour-num">{titre}</div>
                    <h2>{e.titre}</h2>
                    <div className="jour-date">{dateLongue(e.date)}</div>
                    {e.lieux?.length > 0 && <div className="jour-lieux">📍 {e.lieux.join(" · ")}</div>}
                  </div>
                  {e.ouverture && <p className="chapo">{e.ouverture}</p>}
                  {recit.map((it, i) => (
                    <div key={i} className="moment">
                      {it.activite && <h3>{it.activite}</h3>}
                      {it.detail && <p>{it.detail}</p>}
                    </div>
                  ))}
                  {decoupeAnecdotes(e.anecdote).map((a, i, liste) => (
                    <div key={`a${i}`} className="encadre">
                      <div className="encadre-titre">{liste.length > 1 ? `Anecdote ${i + 1}` : "L'anecdote"}</div>
                      <p>{a}</p>
                    </div>
                  ))}
                  {e.adresse && <div className="encadre"><div className="encadre-titre">Bonne adresse</div><p>{e.adresse}</p></div>}
                  {e.reflexion && <div className="encadre citation"><div className="encadre-titre">Ce que je garde</div><p>{e.reflexion}</p></div>}
                </div>
              </Feuille>

              {/* Seulement si le récit déborde : sa suite, puis une page de notes
                  pour que la journée suivante reparte sur une double page. */}
              <Feuille cote="gauche" stage={stage} className="feuille-suite" hidden tete={<><span>{BRAND}</span>{etape}</>} pied={<><span>{dateLongue(e.date)}</span><span>Jour {jour} · suite</span></>}>
                <div className="texte-corps" />
              </Feuille>
              <Feuille cote="droite" stage={stage} className="feuille-notes" hidden tete={<><span>{BRAND}</span>{etape}</>} pied={<><span>Notes</span><span>Jour {jour}</span></>}>
                <div className="notes-lignes"><span>Notes</span></div>
              </Feuille>
            </div>
          );
        })}

        {posts.length === 0 && (
          <Feuille cote="gauche"><p className="empty">Les aventures n'ont pas encore commencé.</p></Feuille>
        )}
      </Ajusteur>
    </main>
  );
}
