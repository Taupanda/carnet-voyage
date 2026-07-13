import PhotoGrid from "./PhotoGrid";
import { stageForDate } from "../lib/stages";

const KIFF = ["😑", "🙂", "😊", "🤩", "🥳"];
const AVENTURE = ["🛋️", "🚶", "🧗", "🏄", "🌋"];

export default function Post({ e }) {
  const stage = stageForDate(e.date);
  const c = stage?.couleur || "#F2A93B";
  const recit = Array.isArray(e.recit) ? e.recit : [];
  const dateLabel = new Date(e.date + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <article className="post" style={{ "--stage": c }} id={`jour-${e.day_number}`}>
      <PhotoGrid photos={e.photos || []} caption={`Jour ${e.day_number}`} />

      <div className="post-body">
        <div className="post-top">
          <div>
            <div className="eyebrow">{dateLabel}</div>
            <h2 className="post-title">{e.titre}</h2>
          </div>
          <div className="stamp">
            <span className="stamp-n">{e.day_number}</span>
            <span className="stamp-l">jour</span>
          </div>
        </div>

        {e.lieux?.length > 0 && (
          <div className="chips">
            {e.lieux.map((l, i) => <span key={i} className="chip">{l}</span>)}
          </div>
        )}

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

        {e.rencontres && (
          <div className="block">
            <div className="block-head">Rencontres</div>
            <p>{e.rencontres}</p>
          </div>
        )}

        {e.anecdote && (
          <div className="block framed">
            <div className="block-head">L'anecdote</div>
            <p>{e.anecdote}</p>
          </div>
        )}

        {e.adresse && (
          <div className="block">
            <div className="block-head">Bonne adresse</div>
            <p>{e.adresse}</p>
          </div>
        )}

        {e.reflexion && (
          <div className="block framed quote">
            <div className="block-head">Ce que je garde</div>
            <p>{e.reflexion}</p>
          </div>
        )}

        <div className="block" style={{ display: "flex", justifyContent: "flex-end" }}>
          <div className="moods">
            <div className="mood"><span className="mood-e">{e.humeur}</span><span className="mood-l">humeur</span></div>
            <div className="mood"><span className="mood-e">{KIFF[e.kiff]}</span><span className="mood-l">kiff</span></div>
            <div className="mood"><span className="mood-e">{AVENTURE[e.aventure]}</span><span className="mood-l">aventure</span></div>
          </div>
        </div>
      </div>
    </article>
  );
}
