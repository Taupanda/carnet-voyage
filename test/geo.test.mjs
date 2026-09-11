import test from "node:test";
import assert from "node:assert/strict";
import { distanceKm, arrondiKm, formateKm } from "../lib/geo.js";

const MEXICO = { lat: 19.4326, lng: -99.1332 };
const OAXACA = { lat: 17.0732, lng: -96.7266 };
const PUEBLA = { lat: 19.0414, lng: -98.2063 };

test("distance connue : Mexico → Oaxaca ≈ 360 km à vol d'oiseau", () => {
  const d = distanceKm(MEXICO, OAXACA);
  assert.ok(d > 340 && d < 375, `obtenu ${d}`);
});

test("distance courte : Mexico → Puebla ≈ 100 km", () => {
  const d = distanceKm(MEXICO, PUEBLA);
  assert.ok(d > 90 && d < 115, `obtenu ${d}`);
});

test("un point avec lui-même vaut zéro", () => {
  assert.equal(Math.round(distanceKm(MEXICO, MEXICO)), 0);
});

test("la distance est symétrique", () => {
  assert.equal(
    Math.round(distanceKm(MEXICO, OAXACA)),
    Math.round(distanceKm(OAXACA, MEXICO))
  );
});

test("des coordonnées absentes ou aberrantes ne produisent pas un nombre", () => {
  assert.equal(distanceKm(null, OAXACA), null);
  assert.equal(distanceKm(MEXICO, {}), null);
  assert.equal(distanceKm({ lat: "abc", lng: 0 }, OAXACA), null);
  assert.equal(distanceKm({ lat: 120, lng: 0 }, OAXACA), null, "latitude impossible");
  assert.equal(distanceKm({ lat: 0, lng: 400 }, OAXACA), null, "longitude impossible");
});

test("l'arrondi reste lisible", () => {
  assert.equal(arrondiKm(357.4821), 357);
  assert.equal(arrondiKm(3.4821), 3.5);
  assert.equal(arrondiKm(0), 0);
  assert.equal(arrondiKm(-2), null);
  assert.equal(arrondiKm(NaN), null);
  // toLocaleString sépare les milliers par une espace insécable étroite :
  // on compare sur les caractères qui portent le sens, pas sur l'espace exacte.
  const nu = (s) => (s || "").replace(/\s/g, " ");
  assert.equal(nu(formateKm(1234.6)), "1 235 km");
  assert.equal(nu(formateKm("8.25")), "8,3 km");
  assert.equal(formateKm(null), null);
});

import { MODES, modeInfo, normaliseTrajets, totauxKm } from "../lib/geo.js";

test("les trajets illisibles sont écartés, pas devinés", () => {
  assert.deepEqual(normaliseTrajets(null), []);
  assert.deepEqual(normaliseTrajets("bus"), []);
  assert.deepEqual(normaliseTrajets([{ mode: "bus" }]), [], "sans km, pas de trajet");
  assert.deepEqual(normaliseTrajets([{ mode: "bus", km: 0 }]), [], "zéro n'est pas un trajet");
  assert.deepEqual(normaliseTrajets([{ mode: "bus", km: -5 }]), []);
  assert.deepEqual(normaliseTrajets([{ mode: "fusée", km: 20 }]), [{ mode: "autre", km: 20 }],
    "un mode inconnu retombe sur « autre » au lieu de disparaître");
  assert.deepEqual(normaliseTrajets([{ mode: "train", km: "120" }]), [{ mode: "train", km: 120 }]);
});

test("les totaux additionnent la marche et les trajets", () => {
  const t = totauxKm({ km_marche: 8.5, trajets: [{ mode: "taxi", km: 12 }, { mode: "bus", km: 340 }] });
  assert.equal(t.marche, 8.5);
  assert.equal(t.transport, 352);
  assert.equal(t.total, 360.5);
  assert.equal(t.ancien, false);
});

test("une journée sans trajet compte quand même les pas", () => {
  const t = totauxKm({ km_marche: 14, trajets: [] });
  assert.equal(t.total, 14);
  assert.equal(t.transport, 0);
});

test("les posts d'avant la distinction gardent leur distance", () => {
  const t = totauxKm({ km: 420, km_marche: null, trajets: [] });
  assert.equal(t.total, 420);
  assert.equal(t.ancien, true, "signalé comme un total non détaillé");
});

test("une journée sans aucune donnée ne vaut pas zéro kilomètre affiché", () => {
  const t = totauxKm({});
  assert.equal(t.total, 0);
  assert.equal(t.ancien, false);
  assert.equal(formateKm(null), null, "et rien ne s'affiche");
});

test("chaque mode demandé existe et porte un libellé", () => {
  for (const id of ["bus", "avion", "train", "bateau", "taxi"]) {
    assert.ok(MODES.some((m) => m.id === id), `mode ${id} manquant`);
  }
  assert.equal(modeInfo("avion").label, "Avion");
  assert.equal(modeInfo("inconnu").id, "autre");
});
