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
