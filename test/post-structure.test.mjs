// Le post ne doit plus porter de paragraphe « rencontres » : les personnes
// croisées se racontent dans les moments, et leurs fiches s'affichent déjà à
// côté du récit. Ce texte était généré, stocké et modifiable — mais affiché
// nulle part, donc pure redite à relire à chaque post.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const format = fs.readFileSync(new URL("../app/api/format/route.js", import.meta.url), "utf8");
const journal = fs.readFileSync(new URL("../app/journal/page.js", import.meta.url), "utf8");
const post = fs.readFileSync(new URL("../app/Post.js", import.meta.url), "utf8");

test("la mise en forme ne demande plus de paragraphe rencontres", () => {
  const schema = format.slice(format.indexOf("Réponds UNIQUEMENT en JSON"));
  assert.ok(!/"rencontres"\s*:/.test(schema),
    "le schéma de sortie réclame encore un champ rencontres");
});

test("la consigne dit où vont les personnes croisées", () => {
  assert.ok(format.includes("LES RENCONTRES N'ONT PAS DE BLOC À ELLES"),
    "rien n'indique au modèle de les raconter dans les moments");
});

test("l'éditeur n'a plus de champ texte pour les rencontres", () => {
  assert.ok(!journal.includes("Rencontres (texte)"), "le champ est encore dans l'éditeur");
  assert.ok(!/rencontres:\s*post\.rencontres/.test(journal), "il est encore enregistré");
});

test("les fiches des personnes liées restent affichées sur le post", () => {
  // C'est ce qui remplace le paragraphe : on retire la redite, pas l'information.
  assert.ok(post.includes("rencontres_liees"), "les fiches ont disparu du post");
});
