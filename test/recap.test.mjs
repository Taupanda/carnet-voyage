// Le résumé illustré : l'IA écrit, le code place les photos. Ces tests gardent
// les deux garanties qui comptent pour un e-mail envoyé aux proches — aucune
// image étrangère au carnet, aucun total de kilomètres qui mélange tout.
import test from "node:test";
import assert from "node:assert/strict";
import {
  photosDuJour, chiffresSemaine, choisirCouverture, miseEnPageDepuisIA, miseEnPageDepuisEditeur, contenuTexte,
  PHOTOS_PAR_SECTION, MAX_SECTIONS,
} from "../lib/recap.js";

const U = (s) => `https://x.supabase.co/storage/v1/object/public/photos/${s}.jpg`;
const semaine = [
  { date: "2026-09-14", titre: "Arrivée", lieux: ["Guanajuato"], photos: [U("a1"), U("a2")], photo_principale: U("a2"), km_marche: 8 },
  { date: "2026-09-15", titre: "Callejones", lieux: ["Guanajuato"], photos: [U("b1"), U("b2"), U("b3"), U("b4")], km_marche: 12,
    trajets: [{ mode: "bus", km: 95 }] },
  { date: "2026-09-16", titre: "San Miguel", lieux: ["San Miguel de Allende"], photos: [], trajets: [{ mode: "bus", km: 97 }, { mode: "taxi", km: 6 }] },
];

test("la photo principale passe en tête", () => {
  assert.deepEqual(photosDuJour(semaine[0]), [U("a2"), U("a1")]);
  assert.deepEqual(photosDuJour({ photos: null }), []);
});

test("les chiffres séparent la marche et le transport principal, sans total", () => {
  const c = chiffresSemaine(semaine);
  assert.deepEqual(c.map((x) => x.l), ["jours racontés", "villes", "photos", "km à pied", "km en bus"]);
  assert.deepEqual(c.map((x) => x.n), ["3", "2", "6", "20", "192"]);
});

test("la couverture vient du jour le plus photographié", () => {
  assert.equal(choisirCouverture(semaine), U("b1"));
  assert.equal(choisirCouverture([{ date: "2026-09-16", photos: [] }]), null);
});

test("les photos des chapitres viennent de leurs jours, sans doublon ni la couverture", () => {
  const mp = miseEnPageDepuisIA({
    titre: "T", chapeau: "Une semaine au Bajío.",
    sections: [
      { titre: "Guanajuato", texte: "Deux jours dans les ruelles.", jours: ["2026-09-15", "2026-09-14"] },
      { titre: "Encore", texte: "Suite.", jours: ["2026-09-15"] },
      { titre: "San Miguel", texte: "Arrivée en bus.", jours: ["2026-09-16"] },
    ],
  }, semaine);
  assert.equal(mp.couverture, U("b1"));
  const [s1, s2, s3] = mp.sections;
  assert.deepEqual(s1.jours, ["2026-09-14", "2026-09-15"]);
  assert.deepEqual(s1.photos, [U("a2"), U("b2"), U("a1")]); // un jour après l'autre, couverture exclue
  assert.deepEqual(s2.photos, [U("b3"), U("b4")]);
  assert.deepEqual(s3.photos, []);                          // jour sans photo
  const toutes = mp.sections.flatMap((s) => s.photos);
  assert.equal(new Set(toutes).size, toutes.length);
  assert.ok(!toutes.includes(mp.couverture));
  assert.ok(mp.sections.every((s) => s.photos.length <= PHOTOS_PAR_SECTION));
});

test("un jour inventé par l'IA est ignoré, un chapitre vide retiré, le nombre borné", () => {
  const mp = miseEnPageDepuisIA({
    sections: [
      { titre: "Vide", texte: "   ", jours: ["2026-09-14"] },
      ...Array.from({ length: 6 }, (_, i) => ({ titre: `C${i}`, texte: "x", jours: ["2026-09-20", "2026-09-14"] })),
    ],
  }, semaine);
  assert.equal(mp.sections.length, MAX_SECTIONS);
  assert.ok(mp.sections.every((s) => s.titre !== "Vide"));
  assert.deepEqual(mp.sections[0].jours, ["2026-09-14"]);
});

test("une réponse à l'ancienne devient un chapitre unique", () => {
  const mp = miseEnPageDepuisIA({ titre: "T", contenu: "Un seul bloc." }, semaine);
  assert.equal(mp.sections.length, 1);
  assert.equal(mp.sections[0].texte, "Un seul bloc.");
  assert.ok(mp.sections[0].photos.length > 0);
});

test("l'éditeur ne peut glisser aucune image étrangère au carnet", () => {
  const mp = miseEnPageDepuisEditeur({
    chapeau: "c",
    couverture: "https://ailleurs.example/pixel.gif",
    sections: [{ titre: "t", texte: "x", jours: ["2026-09-14"], photos: [U("a1"), "javascript:alert(1)", "https://ailleurs.example/a.jpg", U("a1")] }],
  }, semaine);
  assert.equal(mp.couverture, U("b1")); // repli sur la couverture automatique
  assert.deepEqual(mp.sections[0].photos, [U("a1")]);
});

test("la version texte reprend l'accroche et les chapitres", () => {
  const t = contenuTexte({ chapeau: "Accroche.", sections: [{ titre: "Un", texte: "A." }, { titre: "", texte: "B." }] });
  assert.equal(t, "Accroche.\n\nUn\nA.\n\nB.");
});

test("l'e-mail illustré : couverture, chiffres, chapitres, et rien d'autre que du https", async () => {
  const { recapEnHtml } = await import("../lib/courriel.js");
  const html = recapEnHtml({
    semaine_debut: "2026-09-14",
    titre: "Ruelles & <vignobles>",
    mise_en_page: {
      chapeau: "Une semaine au Bajío.",
      couverture: U("b1"),
      sections: [{ titre: "Guanajuato", texte: "Premier.\n\nSecond.", jours: [], photos: [U("a1"), "javascript:alert(1)", U("a2")] }],
    },
  }, { lien: "https://carnet.example/semaines/2026-09-14", chiffres: [{ n: "3", l: "jours racontés" }] });
  assert.ok(html.includes(`src="${U("b1")}"`), "couverture");
  assert.ok(html.includes("Semaine du 14 – 20 sept"));
  assert.ok(html.includes("<strong") && html.includes("jours racontés"));
  assert.ok(html.includes(">Guanajuato</h2>"));
  assert.equal((html.match(/<p style="margin:0 0 14px/g) || []).length, 2, "deux paragraphes");
  assert.ok(html.includes(`src="${U("a1")}"`) && html.includes(`src="${U("a2")}"`));
  assert.ok(!html.includes("javascript:"));
  assert.ok(html.includes("Ruelles &amp; &lt;vignobles&gt;"));
  assert.ok(html.includes("Voir la semaine en photos"));
});

test("un ancien résumé, texte seul, garde son e-mail d'origine", async () => {
  const { recapEnHtml } = await import("../lib/courriel.js");
  const html = recapEnHtml({ titre: "T", contenu: "A\n\nB" }, { lien: "https://x.example" });
  assert.ok(html.includes("Lire sur le carnet"));
  assert.ok(!html.includes("<img"));
});
