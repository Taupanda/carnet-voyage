import test from "node:test";
import assert from "node:assert/strict";
import { echappe, lotsDe, destinatairesRecap, recapEnHtml } from "../lib/courriel.js";

const emails = { a: "ana@example.com", b: "diego@example.com", c: "pas-un-email", d: "ANA@Example.com " };

test("seuls les abonnés non bloqués et joignables reçoivent le récap", () => {
  const d = destinatairesRecap(
    [
      { id: "a", recap_email: true, prenom: "Ana" },
      { id: "b", recap_email: false, prenom: "Diego" },      // pas abonné
      { id: "c", recap_email: true, prenom: "Sans adresse" },// adresse invalide
      { id: "x", recap_email: true, prenom: "Inconnu" },     // aucune adresse connue
    ],
    emails
  );
  assert.deepEqual(d.map((x) => x.email), ["ana@example.com"]);
});

test("un compte bloqué ne reçoit plus rien", () => {
  const d = destinatairesRecap([{ id: "a", recap_email: true, bloque: true }], emails);
  assert.deepEqual(d, []);
});

test("deux comptes partageant une adresse ne font qu'un envoi", () => {
  const d = destinatairesRecap(
    [{ id: "a", recap_email: true }, { id: "d", recap_email: true }],
    emails
  );
  assert.equal(d.length, 1, "l'adresse est normalisée avant dédoublonnage");
});

test("les lots respectent la limite de l'API", () => {
  const cent50 = Array.from({ length: 150 }, (_, i) => i);
  const lots = lotsDe(cent50);
  assert.deepEqual(lots.map((l) => l.length), [100, 50]);
  assert.deepEqual(lotsDe([]), []);
});

test("le HTML échappe ce qui vient des visiteurs", () => {
  assert.equal(echappe('<script>alert("x")</script>'),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  const html = recapEnHtml({ titre: "<b>Semaine 2</b>", contenu: "Bonjour\n\nÀ bientôt" });
  assert.ok(html.includes("&lt;b&gt;Semaine 2&lt;/b&gt;"), "le titre est échappé");
  assert.ok(!html.includes("<b>Semaine 2</b>"));
});

test("les paragraphes du récap sont séparés, les lignes conservées", () => {
  const html = recapEnHtml({ titre: "T", contenu: "Premier para\nsuite\n\nSecond para" });
  assert.equal((html.match(/<p style="margin:0 0 16px/g) || []).length, 2);
  assert.ok(html.includes("Premier para<br>suite"));
});

test("sans lien, pas de bouton ni de mention de désabonnement", () => {
  const html = recapEnHtml({ titre: "T", contenu: "x" });
  assert.ok(!html.includes("Lire sur le carnet"));
  assert.ok(!html.includes("Se désabonner"));
  const avec = recapEnHtml({ titre: "T", contenu: "x" }, { lien: "https://ex.fr/s", lienDesabo: "https://ex.fr/p" });
  assert.ok(avec.includes("Lire sur le carnet") && avec.includes("Se désabonner"));
});
