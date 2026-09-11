"use client";

// Garde l'écran allumé pendant la dictée.
//
// Sans cela, l'extinction automatique d'Android tombe au bout de trente
// secondes — et comme on parle sans toucher l'écran, elle tombe pile au milieu
// d'une phrase. Écran éteint, la reconnaissance vocale s'arrête.
//
// Deux pièges de l'API Wake Lock, et ce sont eux qui la rendent inutile quand
// on l'utilise naïvement :
//
//  1. Le verrou est RELÂCHÉ AUTOMATIQUEMENT dès que la page passe en
//     arrière-plan — une notification déroulée suffit. Il ne se rétablit pas
//     tout seul au retour : il faut le redemander à chaque `visibilitychange`.
//  2. `request()` échoue silencieusement si on avale l'exception : batterie
//     faible, économiseur d'énergie, navigateur non compatible. On remonte donc
//     la raison, pour pouvoir la dire à l'écran plutôt que de laisser croire
//     que ça marche.

export function veilleSupportee() {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

// Un garde à la fois, qu'on allume et qu'on éteint. Tant qu'il est allumé, il
// se rétablit de lui-même à chaque retour au premier plan.
export function creerGardeEcran({ surEchec } = {}) {
  let sentinelle = null;
  let voulu = false;
  let ecoute = null;

  async function prendre() {
    if (!voulu || sentinelle || !veilleSupportee()) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    try {
      sentinelle = await navigator.wakeLock.request("screen");
      // Le navigateur peut le reprendre sans nous prévenir autrement que par là.
      sentinelle.addEventListener?.("release", () => { sentinelle = null; });
    } catch (e) {
      sentinelle = null;
      surEchec?.(e?.message || "verrou d'écran refusé");
    }
  }

  function lacher() {
    try { sentinelle?.release?.(); } catch {}
    sentinelle = null;
  }

  return {
    async allumer() {
      if (voulu) return;
      voulu = true;
      if (typeof document !== "undefined") {
        ecoute = () => {
          if (document.visibilityState !== "visible") return;
          // On ne se fie pas à l'événement « release » pour savoir que le
          // navigateur nous a repris le verrou : il n'est pas garanti, et le
          // croire sur parole laisse un verrou fantôme qui n'allume plus rien.
          // Au retour au premier plan, on jette le nôtre et on en redemande un.
          lacher();
          prendre();
        };
        document.addEventListener("visibilitychange", ecoute);
      }
      await prendre();
      if (!sentinelle && !veilleSupportee()) {
        surEchec?.("ce navigateur ne sait pas garder l'écran allumé");
      }
    },
    eteindre() {
      voulu = false;
      if (ecoute && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", ecoute);
        ecoute = null;
      }
      lacher();
    },
    actif() {
      return voulu && !!sentinelle;
    },
  };
}
