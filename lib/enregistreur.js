"use client";
import { creerGardeEcran } from "./veille.js";

// Enregistrer d'abord, transcrire ensuite.
//
// La dictée en direct (SpeechRecognition) écrivait au fil de la voix : elle
// coupait au premier silence, s'arrêtait avec l'écran, et devinait chaque mot
// sans entendre la fin de la phrase. Ici on capte le son tel quel, l'écran
// gardé allumé, puis un service de transcription l'écoute en entier.
//
// Le son est mis de côté dans le téléphone (IndexedDB) au fur et à mesure :
// un onglet tué, une transcription en échec ou un réseau absent ne font pas
// perdre ce qui a été dit. Il n'est effacé qu'une fois le texte arrivé.

const FORMATS = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm", "audio/aac"];
const TRANCHE_MS = 3000;          // un morceau mis de côté toutes les 3 s
export const DUREE_MAX_S = 15 * 60; // au-delà, la transcription dépasserait le temps alloué
const ENVOI_DIRECT_MAX = 3.5 * 1024 * 1024; // sous la limite de corps de Vercel (4,5 Mo)

export function enregistrementPossible() {
  return typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export function formatEnregistrement() {
  if (typeof MediaRecorder === "undefined") return "";
  return FORMATS.find((f) => MediaRecorder.isTypeSupported?.(f)) || "";
}

/* ---------- La copie de secours, dans le téléphone ---------- */

const BASE = "carnet-audio";
const MAGASIN = "morceaux";

function ouvrirBase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("pas d'IndexedDB"));
    const req = indexedDB.open(BASE, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(MAGASIN);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function operation(mode, faire) {
  const db = await ouvrirBase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(MAGASIN, mode);
      const r = faire(tx.objectStore(MAGASIN));
      tx.oncomplete = () => resolve(r?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

// Clés : « <id>:meta » pour la fiche, « <id>:c000001 » pour chaque morceau —
// l'ordre alphabétique des clés est celui de l'enregistrement.
const cleMorceau = (id, i) => `${id}:c${String(i).padStart(6, "0")}`;
const plage = (id) => IDBKeyRange.bound(`${id}:`, `${id}:￿`);

async function garderMorceau(id, i, morceau) {
  try { await operation("readwrite", (s) => s.put(morceau, cleMorceau(id, i))); } catch {}
}
async function garderFiche(id, fiche) {
  try { await operation("readwrite", (s) => s.put(fiche, `${id}:meta`)); } catch {}
}

export async function oublierEnregistrement(id) {
  if (!id) return;
  try { await operation("readwrite", (s) => s.delete(plage(id))); } catch {}
}

// Le dernier enregistrement dont le texte n'est jamais arrivé, s'il y en a un.
export async function enregistrementEnAttente() {
  try {
    const cles = (await operation("readonly", (s) => s.getAllKeys())) || [];
    const fiches = cles.filter((k) => String(k).endsWith(":meta"));
    if (!fiches.length) return null;
    const id = fiches.map((k) => String(k).slice(0, -5)).sort().pop();
    const fiche = await operation("readonly", (s) => s.get(`${id}:meta`));
    const tout = (await operation("readonly", (s) => s.getAll(plage(id)))) || [];
    const morceaux = tout.filter((v) => v instanceof Blob);
    if (!morceaux.length) { await oublierEnregistrement(id); return null; }
    return { id, blob: new Blob(morceaux, { type: fiche?.type || morceaux[0].type }), secondes: fiche?.secondes || 0 };
  } catch {
    return null;
  }
}

/* ---------- L'enregistreur ---------- */

// surTick(secondes) à chaque seconde ; surFin({ id, blob, secondes, motif })
// quand l'enregistrement s'arrête, que ce soit à la demande, à la durée
// maximale, ou parce que le micro a été coupé (appel, autre application).
export function creerEnregistreur({ surTick, surFin, surEchecVeille } = {}) {
  let flux = null, rec = null, minuteur = null, debut = 0, id = null, i = 0;
  let morceaux = [], motif = "arret", annule = false, ecritures = [];
  const garde = creerGardeEcran({ surEchec: surEchecVeille });

  const secondes = () => Math.round((Date.now() - debut) / 1000);

  function nettoyer() {
    clearInterval(minuteur);
    minuteur = null;
    garde.eteindre();
    flux?.getTracks().forEach((t) => t.stop());
    flux = null;
  }

  return {
    async demarrer() {
      flux = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const type = formatEnregistrement();
      // 32 kb/s suffisent largement pour la voix, et gardent un quart d'heure
      // sous quelques mégaoctets.
      rec = new MediaRecorder(flux, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32000 });
      id = String(Date.now());
      i = 0; morceaux = []; motif = "arret"; annule = false; ecritures = [];
      debut = Date.now();
      garderFiche(id, { type: rec.mimeType || type, debut, secondes: 0 });

      rec.ondataavailable = (ev) => {
        if (!ev.data?.size || annule) return;
        morceaux.push(ev.data);
        ecritures.push(garderMorceau(id, i++, ev.data));
      };
      rec.onstop = async () => {
        const duree = secondes();
        nettoyer();
        if (annule) { await Promise.all(ecritures); await oublierEnregistrement(id); return; }
        await Promise.all(ecritures);
        await garderFiche(id, { type: rec.mimeType || type, debut, secondes: duree });
        const blob = new Blob(morceaux, { type: rec.mimeType || type || morceaux[0]?.type });
        surFin?.({ id, blob, secondes: duree, motif });
      };
      // Micro repris par le système (appel, autre appli) : on garde ce qui a
      // été dit plutôt que de le perdre.
      flux.getAudioTracks().forEach((t) => {
        t.onended = () => { if (rec?.state === "recording") { motif = "coupure"; rec.stop(); } };
      });

      rec.start(TRANCHE_MS);
      await garde.allumer();
      minuteur = setInterval(() => {
        const s = secondes();
        surTick?.(s);
        if (s >= DUREE_MAX_S && rec?.state === "recording") { motif = "duree"; rec.stop(); }
      }, 1000);
    },
    arreter() {
      if (rec?.state === "recording") rec.stop();
      else nettoyer();
    },
    annuler() {
      annule = true;
      if (rec?.state === "recording") rec.stop();
      else { nettoyer(); oublierEnregistrement(id); }
    },
  };
}

/* ---------- L'envoi au serveur ---------- */

// `api` : appelApi (lib/jeton.js), qui porte le jeton d'administration.
export async function transcrire(blob, api) {
  const type = blob.type || "audio/webm";
  const ext = type.includes("mp4") || type.includes("aac") ? "mp4" : type.includes("ogg") ? "ogg" : "webm";
  let res;
  if (blob.size <= ENVOI_DIRECT_MAX) {
    const form = new FormData();
    form.append("file", blob, `enregistrement.${ext}`);
    res = await api("/api/transcrire", { method: "POST", body: form, timeout: 75000 });
  } else {
    // Trop lourd pour passer par Vercel : dépôt direct dans le stockage.
    const r1 = await api("/api/transcrire", { method: "POST", body: JSON.stringify({ depot: { type, taille: blob.size } }) });
    if (!r1.ok) throw new Error(await motif(r1));
    const { chemin, url } = await r1.json();
    const r2 = await fetch(url, { method: "PUT", body: blob, headers: { "content-type": type, "x-upsert": "false" } });
    if (!r2.ok) throw new Error(`dépôt du son refusé (${r2.status})`);
    res = await api("/api/transcrire", { method: "POST", body: JSON.stringify({ chemin }), timeout: 75000 });
  }
  if (!res.ok) throw new Error(await motif(res));
  const { texte } = await res.json();
  return texte || "";
}

async function motif(res) {
  if (res.status === 401) return "session expirée, reconnecte-toi";
  if (res.status === 504) return "le serveur a mis trop de temps";
  const d = await res.json().catch(() => null);
  return d?.error || `erreur ${res.status}`;
}

export const dureeLisible = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// Ajoute le texte transcrit à ce qui est déjà écrit, sans l'écraser.
export function ajouterTexte(avant, texte) {
  const a = String(avant || "").trimEnd();
  const t = String(texte || "").trim();
  if (!t) return avant || "";
  return a ? `${a} ${t}` : t;
}
