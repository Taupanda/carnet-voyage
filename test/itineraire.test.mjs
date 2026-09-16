// Les étapes vivent à deux endroits : lib/stages.js pour les bandeaux du blog,
// lib/itinerary.js pour la page Itinéraire. Ils avaient déjà divergé une fois —
// une étape de transition existait dans l'un et pas dans l'autre — sans que rien
// ne le signale. Ces tests rendent la divergence impossible à ignorer.
import test from "node:test";
import assert from "node:assert/strict";
import { STAGES, TRIP_DATES } from "../lib/stages.js";
import { PHASES } from "../lib/itinerary.js";

const jour = (d) => new Date(d + "T00:00:00Z");
const duree = (a, b) => Math.round((jour(b) - jour(a)) / 86400000) + 1;

test("les étapes se suivent sans trou ni chevauchement", () => {
  for (let i = 1; i < STAGES.length; i++) {
    const ecart = Math.round((jour(STAGES[i].debut) - jour(STAGES[i - 1].fin)) / 86400000);
    assert.equal(ecart, 1, `${STAGES[i - 1].nom} → ${STAGES[i].nom} : ${ecart} jour(s) d'écart`);
  }
});

test("chaque étape commence avant de finir", () => {
  for (const s of STAGES) assert.ok(jour(s.debut) <= jour(s.fin), `${s.nom} finit avant de commencer`);
});

test("le total des étapes fait bien la durée du voyage", () => {
  const total = STAGES.reduce((n, s) => n + duree(s.debut, s.fin), 0);
  assert.equal(total, TRIP_DATES, `${total} jours d'étapes pour ${TRIP_DATES} annoncés`);
});

test("les numéros d'étape sont continus et ordonnés", () => {
  assert.deepEqual(STAGES.map((s) => s.n), STAGES.map((_, i) => i + 1));
  assert.deepEqual(PHASES.map((p) => p.num), PHASES.map((_, i) => i + 1));
});

test("les deux sources décrivent le même voyage", () => {
  assert.equal(PHASES.length, STAGES.length,
    `${PHASES.length} phases dans l'itinéraire pour ${STAGES.length} étapes sur le blog`);
  const joursPhases = PHASES.reduce((n, p) => n + p.days, 0);
  assert.equal(joursPhases, TRIP_DATES, `${joursPhases} jours de phases pour ${TRIP_DATES} annoncés`);
  // Chaque phase annonce une durée : elle doit correspondre à l'étape de même rang.
  PHASES.forEach((p, i) => {
    assert.equal(p.days, duree(STAGES[i].debut, STAGES[i].fin),
      `« ${p.title} » annonce ${p.days} jours, l'étape « ${STAGES[i].nom} » en fait ${duree(STAGES[i].debut, STAGES[i].fin)}`);
  });
});

test("Puebla a bien quitté le parcours, Guadalajara y est", () => {
  // On vérifie ce qui structure le voyage — titres et villes — plutôt que la
  // moindre occurrence du mot : une étape fantôme est le vrai risque.
  const titres = [...STAGES.map((s) => s.nom), ...PHASES.map((p) => p.title)].join(" | ");
  const villes = PHASES.flatMap((p) => p.cities.map((c) => c.name));
  assert.ok(!titres.includes("Puebla"), "Puebla est encore le titre d'une étape");
  assert.ok(!villes.includes("Puebla"), "Puebla est encore une ville du parcours");
  assert.ok(titres.includes("Guadalajara"), "Guadalajara n'est étape nulle part");
  assert.ok(villes.includes("Guadalajara"), "Guadalajara n'est ville nulle part");
});
