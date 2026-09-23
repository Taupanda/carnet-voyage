// La page Itinéraire recopiait les dates des étapes (« 16 – 21 sept », 6 jours)
// et les deux listes avaient déjà divergé une fois sans que rien ne le signale.
// Elle les lit désormais dans les étapes, appariées par rang : ces tests gardent
// cet appariement possible et empêchent la copie de revenir.
import test from "node:test";
import assert from "node:assert/strict";
import { ETAPES_DEFAUT, erreursEtapes } from "../lib/stages.js";
import { PHASES } from "../lib/itinerary.js";

test("les étapes par défaut forment un voyage continu", () => {
  assert.deepEqual(erreursEtapes(ETAPES_DEFAUT), []);
});

test("une phase d'itinéraire par étape, dans le même ordre", () => {
  assert.equal(PHASES.length, ETAPES_DEFAUT.length,
    `${PHASES.length} phases dans l'itinéraire pour ${ETAPES_DEFAUT.length} étapes`);
  assert.deepEqual(PHASES.map((p) => p.num), ETAPES_DEFAUT.map((s) => s.n));
});

test("l'itinéraire ne recopie plus les dates des étapes", () => {
  for (const p of PHASES) {
    assert.ok(!("dates" in p) && !("days" in p), `« ${p.title} » porte encore ses propres dates`);
  }
});

test("Puebla a bien quitté le parcours, Guadalajara y est", () => {
  // On vérifie ce qui structure le voyage — titres et villes — plutôt que la
  // moindre occurrence du mot : une étape fantôme est le vrai risque.
  const titres = [...ETAPES_DEFAUT.map((s) => s.nom), ...PHASES.map((p) => p.title)].join(" | ");
  const villes = PHASES.flatMap((p) => p.cities.map((c) => c.name));
  assert.ok(!titres.includes("Puebla"), "Puebla est encore le titre d'une étape");
  assert.ok(!villes.includes("Puebla"), "Puebla est encore une ville du parcours");
  assert.ok(titres.includes("Guadalajara"), "Guadalajara n'est étape nulle part");
  assert.ok(villes.includes("Guadalajara"), "Guadalajara n'est ville nulle part");
});
