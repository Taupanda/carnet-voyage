// Un chargement sans fin vient toujours du même endroit : un `await` qui ne rend
// pas la main. Ici, c'était `auth.getSession()`, appelé avant chaque requête sur
// un client Supabase partagé. Ces tests couvrent le cache qui le retire du
// chemin critique — le reste (le repli, le délai maximal) dépend du navigateur
// et de la librairie, et se vérifie à l'usage, pas ici.
import test from "node:test";
import assert from "node:assert/strict";
import { memoriserJeton, jetonMemorise, jetonCourant } from "../lib/jeton.js";

test("le jeton déposé par AuthProvider est relu tel quel", () => {
  memoriserJeton("abc");
  assert.equal(jetonMemorise(), "abc");
});

test("une déconnexion efface le jeton", () => {
  memoriserJeton("abc");
  memoriserJeton(null);
  assert.equal(jetonMemorise(), null);
});

test("une chaîne vide n'est pas un jeton", () => {
  memoriserJeton("");
  assert.equal(jetonMemorise(), null);
});

test("un jeton en cache est rendu sans toucher au client Supabase", async () => {
  // Le cas qui gelait l'app : si jetonCourant() interrogeait la librairie alors
  // qu'elle est bloquée, l'appel ne reviendrait jamais. Avec un jeton en cache,
  // il doit revenir immédiatement — donc bien avant ce garde-fou.
  memoriserJeton("en-cache");
  const t = await Promise.race([
    jetonCourant(),
    new Promise((r) => setTimeout(() => r("TROP-LONG"), 200)),
  ]);
  assert.equal(t, "en-cache");
  memoriserJeton(null);
});
