// Reconstruction du texte dicté, isolée de React pour être testable.
//
// Trois comportements des moteurs de reconnaissance produisent des répétitions,
// et il faut les trois pour comprendre le code :
//
//  1. INSTANTANÉS CUMULATIFS — le moteur renvoie « alors », puis « alors
//     aujourd'hui », puis « alors aujourd'hui c'était ». Concaténer donne la
//     bouillie ; il faut ne garder que le plus complet.
//  2. REJEU AU REDÉMARRAGE — Chrome coupe après quelques secondes de silence.
//     La session suivante re-reconnaît parfois l'audio déjà transcrit, qui
//     revient alors s'ajouter à ce qu'on avait acquis.
//  3. CHEVAUCHEMENT PARTIEL — deux segments successifs partagent leurs mots du
//     milieu : « on est allés au marché » puis « au marché il y avait ».
//
// Un seul mécanisme les couvre tous : recoller() cherche le plus long
// chevauchement entre la fin de l'acquis et le début du nouveau, et n'ajoute
// que ce qui dépasse. Le cas 1 est un chevauchement total du début, le cas 2 un
// chevauchement total tout court, le cas 3 un chevauchement partiel.

// Mots normalisés, avec leur position dans le texte d'origine : la comparaison
// ignore casse et ponctuation, mais le texte rendu garde les siennes.
function decouper(texte) {
  const mots = [];
  const re = /[\p{L}\p{N}]+/gu;
  let m;
  while ((m = re.exec(texte)) !== null) {
    mots.push({ cle: m[0].toLowerCase(), debut: m.index });
  }
  return mots;
}

export function recoller(acc, seg) {
  const a = (acc || "").trim();
  const b = (seg || "").trim();
  if (!a) return b;
  if (!b) return a;

  const ma = decouper(a);
  const mb = decouper(b);
  if (!ma.length || !mb.length) return a + " " + b;

  // Le plus long suffixe de `a` qui est aussi un préfixe de `b`. On part du
  // plus long : « oui oui » dicté pour de vrai garde ses deux « oui », parce
  // que seul le chevauchement d'un mot est retiré, pas la répétition entière.
  let k = 0;
  for (let n = Math.min(ma.length, mb.length); n >= 1; n--) {
    let egal = true;
    for (let i = 0; i < n; i++) {
      if (ma[ma.length - n + i].cle !== mb[i].cle) { egal = false; break; }
    }
    if (egal) { k = n; break; }
  }

  if (k === 0) return a + " " + b;
  if (k === mb.length) return a;            // `b` est déjà entièrement là
  // Un chevauchement d'UN SEUL mot est ambigu : « il a dit oui » suivi de
  // « oui bien sûr » est une vraie répétition dictée, pas un artefact. On ne le
  // retire que si tout l'acquis est repris — c'est alors un instantané
  // cumulatif, « alors » devenant « alors aujourd'hui ».
  if (k === 1 && ma.length > 1) return a + " " + b;
  const reste = b.slice(mb[k].debut).trim();
  return reste ? a + " " + reste : a;
}

// L'état d'une dictée en cours. `acquis` survit aux redémarrages du moteur,
// `session` est ce que la session courante a reconnu jusqu'ici.
export function creerDictee(texteExistant = "") {
  let acquis = (texteExistant || "").trim();
  let session = "";

  return {
    // `resultats` est la liste COMPLÈTE du moteur, pas un delta : on
    // reconstruit à chaque fois plutôt que d'accumuler, donc rejouer les mêmes
    // événements redonne exactement le même texte.
    surResultat(resultats) {
      let fini = "";
      let provisoire = "";
      for (const r of resultats || []) {
        const t = ((r && r.transcript) || "").trim();
        if (!t) continue;
        // Le provisoire n'est jamais cumulé : les précédents sont des versions
        // tronquées de la même phrase, seul le dernier compte.
        if (r.isFinal) {
          fini = recoller(fini, t);
          // Un provisoire ANTÉRIEUR à ce définitif est une version périmée de
          // la même phrase : le garder la faisait réapparaître en double.
          provisoire = "";
        } else {
          provisoire = t;
        }
      }
      session = fini;
      return recoller(acquis, recoller(fini, provisoire));
    },
    // La session se termine : ce qu'elle a reconnu rejoint l'acquis.
    surFin() {
      acquis = recoller(acquis, session);
      session = "";
      return acquis;
    },
    // Message envoyé : table rase, y compris pour la session en cours.
    purger() {
      acquis = "";
      session = "";
      return "";
    },
    texte() {
      return recoller(acquis, session);
    },
  };
}
