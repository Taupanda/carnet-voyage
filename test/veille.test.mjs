// Le verrou d'écran est relâché par le navigateur dès que la page passe en
// arrière-plan, et ne revient pas tout seul. C'est ce qui le rendait inutile :
// une notification déroulée pendant la dictée, et l'écran s'éteignait ensuite.
import test from "node:test";
import assert from "node:assert/strict";

function fauxEnvironnement({ echoue = false } = {}) {
  const ecouteurs = [];
  let pris = 0;
  const doc = {
    visibilityState: "visible",
    addEventListener: (t, f) => t === "visibilitychange" && ecouteurs.push(f),
    removeEventListener: (t, f) => {
      const i = ecouteurs.indexOf(f);
      if (i !== -1) ecouteurs.splice(i, 1);
    },
  };
  const nav = {
    wakeLock: {
      request: async () => {
        if (echoue) throw new Error("batterie faible");
        pris++;
        return { release: () => {}, addEventListener: () => {} };
      },
    },
  };
  Object.defineProperty(globalThis, "document", { value: doc, configurable: true, writable: true });
  Object.defineProperty(globalThis, "navigator", { value: nav, configurable: true, writable: true });
  return {
    doc,
    nbPrises: () => pris,
    nbEcouteurs: () => ecouteurs.length,
    basculer(etat) {
      doc.visibilityState = etat;
      for (const f of [...ecouteurs]) f();
    },
  };
}

test("le verrou est repris au retour au premier plan", async () => {
  const env = fauxEnvironnement();
  const { creerGardeEcran } = await import("../lib/veille.js");
  const g = creerGardeEcran({});
  await g.allumer();
  assert.equal(env.nbPrises(), 1, "pris une première fois");

  env.basculer("hidden");          // le navigateur le relâche de son côté
  env.basculer("visible");
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(env.nbPrises() >= 2, "redemandé au retour — sans ça l'écran s'éteint");
  g.eteindre();
});

test("éteindre retire l'écouteur de visibilité", async () => {
  const env = fauxEnvironnement();
  const { creerGardeEcran } = await import("../lib/veille.js");
  const g = creerGardeEcran({});
  await g.allumer();
  assert.equal(env.nbEcouteurs(), 1);
  g.eteindre();
  assert.equal(env.nbEcouteurs(), 0, "sinon l'écran resterait allumé après la dictée");
});

test("caché au moment d'allumer : on ne prend rien, mais on reprend au retour", async () => {
  const env = fauxEnvironnement();
  const { creerGardeEcran } = await import("../lib/veille.js");
  const g = creerGardeEcran({});
  env.doc.visibilityState = "hidden";
  await g.allumer();
  assert.equal(env.nbPrises(), 0);
  env.basculer("visible");
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(env.nbPrises(), 1);
  g.eteindre();
});

test("un refus est rapporté au lieu d'être avalé", async () => {
  fauxEnvironnement({ echoue: true });
  const { creerGardeEcran } = await import("../lib/veille.js");
  const raisons = [];
  const g = creerGardeEcran({ surEchec: (r) => raisons.push(r) });
  await g.allumer();
  assert.deepEqual(raisons, ["batterie faible"]);
  assert.equal(g.actif(), false);
  g.eteindre();
});
