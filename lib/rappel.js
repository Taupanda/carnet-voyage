// Le texte du rappel de 23 h.
//
// Il comptait la journée en cours avec les jours en retard : avec seulement
// hier à raconter, il annonçait « 2 journées attendent ». Aujourd'hui n'est
// pas en retard — elle se termine à peine. On compte donc les jours passés
// à part, et la journée en cours n'est mentionnée qu'en plus.
//
// `manquants` : les dates sans post (aujourd'hui compris s'il n'est pas
// écrit) ; `aujourdhui` : la date du soir où part le rappel.
export function messageRappel(manquants, aujourdhui) {
  if (!manquants.length) return null;
  const enRetard = manquants.filter((d) => d !== aujourdhui).sort();
  const aujourdhuiManque = manquants.includes(aujourdhui);

  if (!enRetard.length) {
    return {
      title: "Alors, cette journée ?",
      body: "Deux minutes pour raconter, et c'est dans les aventures.",
      url: `/journal?date=${aujourdhui}`,
    };
  }
  const une = enRetard.length === 1;
  const fraiche = une ? "Elle est encore fraîche" : "Elles sont encore fraîches";
  return {
    title: une ? "Une journée en retard" : `${enRetard.length} journées en retard`,
    body: aujourdhuiManque
      ? `${fraiche}, et celle d'aujourd'hui t'attend aussi.`
      : `${fraiche} — on ${une ? "la" : "les"} met par écrit ?`,
    // La plus ancienne d'abord : c'est celle qui s'efface le plus vite.
    url: `/journal?date=${enRetard[0]}`,
  };
}
