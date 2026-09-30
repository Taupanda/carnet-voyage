// Le livre imprimé : les planches photo gardent le format de chaque photo et
// tiennent dans la page, la photo principale ne l'écrase plus.
import test from "node:test";
import assert from "node:assert/strict";
import { dispositionPlanche, moyennesNotes, chiffresLivre, meteosFrequentes } from "../lib/livre.js";
import { meteoInfo } from "../lib/weather.js";

const PAGE = { largeur: 178, hauteur: 245, ecart: 2.5 };
const P = 4 / 3, V = 3 / 4; // paysage, portrait

function verifie(ratios, d) {
  const indices = d.rangs.flatMap((g) => g.photos.map((p) => p.index));
  assert.deepEqual(indices, ratios.map((_, i) => i), "toutes les photos, dans l'ordre");
  assert.ok(d.hauteur <= PAGE.hauteur + 1e-6, `planche de ${d.hauteur} mm pour ${PAGE.hauteur}`);
  for (const g of d.rangs) {
    const larg = g.photos.reduce((s, p) => s + p.largeur, 0) + PAGE.ecart * (g.photos.length - 1);
    assert.ok(larg <= PAGE.largeur + 1e-6, `rangée de ${larg} mm pour ${PAGE.largeur}`);
    for (const p of g.photos) {
      // le format de la photo est respecté à l'identique
      assert.ok(Math.abs(p.largeur / g.hauteur - ratios[p.index]) < 1e-9);
    }
  }
}

test("portraits et paysages mêlés : tout tient, rien n'est déformé", () => {
  const ratios = [P, V, P, P, V, P, V, V, P];
  verifie(ratios, dispositionPlanche(ratios, PAGE));
});

test("la planche est bien remplie", () => {
  const ratios = [P, P, V, P, P, V, P];
  const d = dispositionPlanche(ratios, PAGE);
  const aire = d.rangs.reduce((s, g) => s + g.photos.reduce((t, p) => t + p.largeur * g.hauteur, 0), 0);
  assert.ok(aire / (PAGE.largeur * PAGE.hauteur) > 0.75, `seulement ${Math.round((aire / (PAGE.largeur * PAGE.hauteur)) * 100)} % de la planche`);
});

test("la photo principale ne prend plus plus de la moitié de la page", () => {
  for (const principale of [P, V, 16 / 9]) {
    const d = dispositionPlanche([principale, P, V, P, P], PAGE);
    assert.ok(d.rangs[0].hauteur <= PAGE.hauteur / 2 + 1e-6, `rangée de tête à ${d.rangs[0].hauteur} mm`);
  }
});

test("douze photos restent lisibles", () => {
  const ratios = [P, V, P, P, V, P, P, V, P, P, V, P];
  const d = dispositionPlanche(ratios, PAGE);
  verifie(ratios, d);
  assert.ok(d.rangs.every((g) => g.photos.every((p) => p.largeur >= 22)), "une vignette trop étroite");
  assert.ok(d.rangs.every((g) => g.hauteur >= 32), `une rangée trop basse : ${d.rangs.map((g) => Math.round(g.hauteur)).join(", ")} mm`);
});

test("une photo seule, même très haute, tient dans la page", () => {
  const d = dispositionPlanche([9 / 16], PAGE);
  verifie([9 / 16], d);
});

test("un format inconnu est traité comme un paysage", () => {
  const d = dispositionPlanche([NaN, P], PAGE);
  assert.equal(d.rangs.flatMap((g) => g.photos).length, 2);
});

test("les moyennes ignorent les jours non notés", () => {
  const m = moyennesNotes([{ note_humeur: 4, note_energie: 2 }, { note_humeur: 5 }, { note_humeur: null }]);
  assert.equal(m.note_humeur, 4.5);
  assert.equal(m.note_energie, 2);
  assert.equal(m.note_sociale, null);
});

test("les chiffres du voyage : étapes vues, marche et modes séparés", () => {
  const etapes = [{ n: 1, debut: "2026-09-08", fin: "2026-09-15" }, { n: 2, debut: "2026-09-16", fin: "2026-09-22" }];
  const posts = [
    { date: "2026-09-08", lieux: ["Mexico"], photos: ["a", "b"], km_marche: 10 },
    { date: "2026-09-16", lieux: ["Guanajuato", "Mexico"], photos: ["c"], km_marche: 5, trajets: [{ mode: "bus", km: 380 }] },
  ];
  const t = chiffresLivre(posts, { etapes, rencontres: 3, joursVoyage: 101 });
  const par = Object.fromEntries(t.map((x) => [x.l, x.n]));
  assert.equal(par["jours racontés sur 101"], "2");
  assert.equal(par["étapes sur 2"], "2");
  assert.equal(par["villes et lieux"], "2");
  assert.equal(par["photos"], "3");
  assert.equal(par["rencontres"], "3");
  assert.equal(par["km à pied"], "15");
  assert.equal(par["km en bus"], "380");
  assert.ok(!t.some((x) => /total/.test(x.l)));
});

test("la météo la plus fréquente en tête", () => {
  const m = meteosFrequentes([{ meteo: { code: 0 } }, { meteo: { code: 61 } }, { meteo: { code: 0 } }, {}], meteoInfo);
  assert.deepEqual(m.map((x) => x.jours), [2, 1]);
  assert.ok(m[0].libelle.includes("Ensoleillé"));
});
