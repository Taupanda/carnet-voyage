// Les étapes s'éditent depuis l'app : ce qui vient de la base passe par
// fusionnerEtapes avant d'être affiché partout. Un découpage à trous ne doit
// jamais atteindre le blog, et le départ ne doit jamais bouger.
import test from "node:test";
import assert from "node:assert/strict";
import {
  ETAPES_DEFAUT, DEPART, erreursEtapes, fusionnerEtapes, creerCalendrier, lendemain, plageDates, dayNumberOf,
} from "../lib/stages.js";

const lignes = (modif) => ETAPES_DEFAUT.map(({ n, nom, debut, fin }) => ({ n, nom, debut, fin, ...(modif[n] || {}) }));

test("le Bajío va jusqu'au 22 septembre, la Sierra Tarahumara part du 23", () => {
  const cal = creerCalendrier();
  assert.equal(cal.stageForDate("2026-09-22").nom, "Le Bajío");
  assert.equal(cal.stageForDate("2026-09-23").nom, "Sierra Tarahumara");
});

test("une base vide ou injoignable affiche les étapes par défaut", () => {
  assert.equal(fusionnerEtapes(null), ETAPES_DEFAUT);
  assert.equal(fusionnerEtapes([]), ETAPES_DEFAUT);
});

test("une frontière déplacée en base est appliquée", () => {
  const etapes = fusionnerEtapes(lignes({ 4: { fin: "2026-10-12" }, 5: { debut: "2026-10-13" } }));
  const cal = creerCalendrier(etapes);
  assert.equal(cal.stageForDate("2026-10-12").nom, "Basse Californie");
  assert.equal(cal.stageForDate("2026-10-13").nom, "Guadalajara");
  // la couleur reste celle du code
  assert.equal(etapes[3].couleur, ETAPES_DEFAUT[3].couleur);
});

test("un renommage en base est appliqué", () => {
  assert.equal(fusionnerEtapes(lignes({ 5: { nom: "Jalisco" } }))[4].nom, "Jalisco");
});

test("un découpage incohérent en base n'atteint pas le blog", () => {
  // fin déplacée sans décaler le début suivant : un jour sans étape
  assert.equal(fusionnerEtapes(lignes({ 4: { fin: "2026-10-10" } })), ETAPES_DEFAUT);
});

test("le départ ne peut pas bouger", () => {
  const etapes = ETAPES_DEFAUT.map((s, i) => (i === 0 ? { ...s, debut: "2026-09-09" } : s));
  assert.ok(erreursEtapes(etapes).some((e) => e.includes(DEPART)));
  assert.equal(fusionnerEtapes(lignes({ 1: { debut: "2026-09-09" } })), ETAPES_DEFAUT);
});

test("une étape qui finit avant de commencer est refusée", () => {
  const etapes = ETAPES_DEFAUT.map((s) => ({ ...s }));
  etapes[4].fin = "2026-10-11";          // Guadalajara finit la veille de son début
  etapes[5].debut = lendemain("2026-10-11");
  assert.ok(erreursEtapes(etapes).some((e) => e.includes("finit avant de commencer")));
});

test("un nom vide ou un nombre d'étapes différent est refusé", () => {
  assert.ok(erreursEtapes(ETAPES_DEFAUT.map((s, i) => (i === 2 ? { ...s, nom: "  " } : s))).length > 0);
  assert.ok(erreursEtapes(ETAPES_DEFAUT.slice(1)).length > 0);
});

test("prolonger la dernière étape allonge le voyage, pas les numéros de jour", () => {
  const cal = creerCalendrier(fusionnerEtapes(lignes({ 12: { fin: "2026-12-20" } })));
  assert.equal(cal.TRIP_DATES, creerCalendrier().TRIP_DATES + 3);
  assert.equal(dayNumberOf("2026-09-22"), 14);
});

test("les plages de dates s'écrivent comme sur l'itinéraire", () => {
  assert.equal(plageDates("2026-09-16", "2026-09-22"), "16 – 22 sept");
  assert.equal(plageDates("2026-09-28", "2026-10-11"), "28 sept – 11 oct");
});
