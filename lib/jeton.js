"use client";
import { supabaseBrowser } from "./supabaseClient.js";

// Le jeton d'accès, gardé en mémoire au lieu d'être redemandé à chaque requête.
//
// Chaque appel d'API faisait son propre `auth.getSession()` — vingt-cinq
// endroits dans l'app — sur un client Supabase unique et partagé. La librairie
// prend un verrou interne pendant cet appel ; qu'un seul reste bloqué et plus
// aucune requête ne démarre, y compris celles qui n'ont rien demandé. Côté
// écran cela ne ressemble pas à une erreur mais à un chargement sans fin : le
// `finally` qui coupe le sablier est derrière l'`await` qui ne rend pas la main.
//
// AuthProvider tient déjà la session, et `onAuthStateChange` la lui redonne à
// chaque changement sans coûter d'appel. Il la dépose ici, les requêtes la
// lisent. Plus de verrou dans le chemin critique.

let jeton = null;

export function memoriserJeton(t) {
  jeton = typeof t === "string" && t ? t : null;
}

export function jetonMemorise() {
  return jeton;
}

// Repli pour le tout premier rendu, avant qu'AuthProvider ait déposé le jeton :
// on redemande la session, mais jamais indéfiniment. Sans réponse, on part sans
// jeton — la requête reçoit un 401 franc, qui se voit et se corrige, plutôt
// qu'un sablier éternel.
const DELAI_REPLI_MS = 4000;

export async function jetonCourant() {
  if (jeton) return jeton;
  try {
    const session = await Promise.race([
      supabaseBrowser().auth.getSession(),
      new Promise((r) => setTimeout(() => r(null), DELAI_REPLI_MS)),
    ]);
    const t = session?.data?.session?.access_token || null;
    if (t) memoriserJeton(t);
    return t;
  } catch {
    return null;
  }
}

// Enveloppe commune des appels authentifiés. Le délai maximal garantit qu'un
// appel finit toujours, en réponse ou en erreur, mais jamais en attente.
const DELAI_REQUETE_MS = 45000;

export async function appelApi(path, opts = {}) {
  const token = await jetonCourant();
  const horloge = new AbortController();
  const minuteur = setTimeout(() => horloge.abort(), opts.timeout || DELAI_REQUETE_MS);
  try {
    return await fetch(path, {
      ...opts,
      signal: horloge.signal,
      headers: {
        ...(opts.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.body && !(opts.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      },
    });
  } finally {
    clearTimeout(minuteur);
  }
}
