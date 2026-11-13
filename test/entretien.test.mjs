// L'entretien ne renvoie que ce qui change : rien de déjà noté ne se perd.
import test from "node:test";
import assert from "node:assert/strict";
import { fusionnerExtraits } from "../lib/entretien.js";
import { MAX_MOMENTS } from "../lib/stages.js";

test("les champs absents de la réponse restent tels quels", () => {
  const avant = { lieu: "Oaxaca", activites: "marché", rencontres: null, anecdote: null };
  assert.deepEqual(fusionnerExtraits(avant, { activites: "marché, Monte Albán" }),
    { lieu: "Oaxaca", activites: "marché, Monte Albán", rencontres: null, anecdote: null });
});

test("un null ou une chaîne vide n'efface pas ce qui était noté", () => {
  const avant = { lieu: "Oaxaca", anecdote: "le chien" };
  assert.deepEqual(fusionnerExtraits(avant, { lieu: null, anecdote: "  ", reflexion: "rien" }),
    { lieu: "Oaxaca", anecdote: "le chien", reflexion: "rien" });
});

test("réponse sans extracted : l'état ne bouge pas", () => {
  assert.deepEqual(fusionnerExtraits({ lieu: "X" }, undefined), { lieu: "X" });
  assert.deepEqual(fusionnerExtraits(null, { lieu: "Y" }), { lieu: "Y" });
});

test("une journée riche peut compter plus de cinq moments", () => {
  assert.ok(MAX_MOMENTS > 5);
});
