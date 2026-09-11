"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import PushButton from "../PushButton";
import { useAuth } from "../AuthProvider";
import { supabaseBrowser } from "../../lib/supabaseClient";
import { fetchMeteo } from "../../lib/weather";
import { compressImage } from "../../lib/compressImage";
import { creerDictee } from "../../lib/dictee";
import { dayNumberOf, todayLocal, afficheJour, decoupeAnecdotes, colleAnecdotes } from "../../lib/stages";
import RencontresManager from "./RencontresManager";
import PhotoPicker, { AstucePartage } from "./PhotoPicker";
import { appelApi } from "../../lib/jeton";

const KIFF = ["😑", "🙂", "😊", "🤩", "🥳"];
const AVENTURE = ["🛋️", "🚶", "🧗", "🏄", "🌋"];
const EMOJIS = ["😄", "🥰", "😌", "🤩", "😴", "😭", "🤯", "😤", "🥵", "🤒", "🌞", "🌧️", "💃", "🧘", "🍹", "🏖️"];
// Numérotation des jours : source partagée (lib/stages, respecte le MODE TEST).

const emptyExtracted = () => ({ lieu: null, activites: null, rencontres: null, anecdote: null, adresse: null, reflexion: null, photos: null });
// Le jour courant suit le fuseau du voyage, pas celui du navigateur ni UTC.
const todayStr = () => todayLocal();
const dayNumber = (d) => dayNumberOf(d);

// Le jeton vient du cache d'AuthProvider : plus de getSession() par requête,
// et un délai maximal, pour qu'un appel finisse toujours — réponse ou erreur.
// Pourquoi un appel a échoué, en une phrase lisible à l'écran.
async function motifEchec(res) {
  if (res.status === 401) return "session expirée, reconnecte-toi";
  if (res.status === 504 || res.status === 408) return "le serveur a mis trop de temps";
  const detail = await res.json().catch(() => null);
  return detail?.error || `erreur ${res.status}`;
}

function motifLisible(e) {
  if (e?.name === "AbortError") return "délai dépassé (45 s)";
  return e?.message || "cause inconnue";
}

const api = appelApi;

export default function Journal() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = !!user?.email && user.email.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();
  const [phase, setPhase] = useState("date");
  const [date, setDate] = useState(todayStr());
  const [entries, setEntries] = useState([]);
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [extracted, setExtracted] = useState(emptyExtracted());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState([]); // array of URLs
  const [noteHumeur, setNoteHumeur] = useState(3);
  const [noteEnergie, setNoteEnergie] = useState(3);
  const [noteSociale, setNoteSociale] = useState(3);
  const [noteAventure, setNoteAventure] = useState(3);
  const [hebergement, setHebergement] = useState("");
  const [photoPrincipale, setPhotoPrincipale] = useState(null);
  const [reflexionPrivee, setReflexionPrivee] = useState(false);
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);
  const [recording, setRecording] = useState(false);
  const [saisieMode, setSaisieMode] = useState("ia"); // "ia" | "manuel"
  const [inbox, setInbox] = useState([]);
  const [showInbox, setShowInbox] = useState(false);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [showRencontres, setShowRencontres] = useState(false);
  const [allRencontres, setAllRencontres] = useState([]);
  const [linkedRencontres, setLinkedRencontres] = useState([]);
  const [quickRenc, setQuickRenc] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [notesJour, setNotesJour] = useState([]); // le calepin de la journée choisie
  const [envoiPhotos, setEnvoiPhotos] = useState(0); // photos en cours d'envoi
  const recognitionRef = useRef(null);
  const dicteeRef = useRef(null);     // l'état de la dictée (lib/dictee.js)
  const dernierDicteRef = useRef(null); // dernière valeur écrite PAR la dictée
  const recActiveRef = useRef(false); // une session tourne-t-elle déjà ?
  const purgeRef = useRef(false);     // la session en cours part à la poubelle
  // Photos arrivées par la galerie : elles n'appartiennent encore à aucune
  // journée. Elles vivent dans une ref, pas dans `photos`, parce qu'openDate()
  // réinitialise `photos` et les effacerait au moment même où l'on choisit le
  // jour auquel les rattacher.
  const partageRef = useRef([]);
  const [partageRecu, setPartageRecu] = useState(0);
  const wakeLockRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const listRes = await api("/api/entries");
      if (listRes.ok) setEntries(await listRes.json());
      setEntriesLoaded(true);
      const inboxRes = await api("/api/inbox");
      if (inboxRes.ok) setInbox(await inboxRes.json());
      const cmtRes = await api("/api/comments");
      if (cmtRes.ok) setComments(await cmtRes.json());
    })();
  }, [isAdmin]);

  // ouverture automatique d'un panneau via ?panel=
  useEffect(() => {
    if (!isAdmin) return;
    const p = new URLSearchParams(window.location.search).get("panel");
    if (p === "rencontres") setShowRencontres(true);
    else if (p === "comments") setShowComments(true);
  }, [isAdmin]);

  // Deep-link ?date= : ouvre directement ce post pour édition (bouton « Éditer » du blog)
  useEffect(() => {
    if (!isAdmin || !entriesLoaded) return;
    const d = new URLSearchParams(window.location.search).get("date");
    if (d) openDate(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, entriesLoaded]);

  // En quittant le journal, on coupe le micro : une session laissée en vie
  // continuerait d'écrire dans un champ que plus personne ne regarde.
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.abort(); } catch {}
      releaseWakeLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Photos partagées depuis la galerie (share_target) ----
  // Le bouton de l'app dépend du sélecteur qu'Android veut bien ouvrir. Partir
  // de la galerie contourne la question : on y choisit ses photos avec le
  // multi-sélection du téléphone, « Partager », et elles arrivent ici. Le
  // service worker les a mises de côté ; c'est cette page qui les téléverse,
  // parce qu'elle seule porte la session de l'auteur.
  // Après le deep-link ?date= : openDate() remet `photos` à la valeur du jour
  // ouvert, et écraserait les photos importées si on les téléversait avant.
  useEffect(() => {
    if (!isAdmin || !entriesLoaded) return;
    const combien = Number(new URLSearchParams(window.location.search).get("partage"));
    if (!Number.isFinite(combien) || combien <= 0) return;
    let annule = false;
    (async () => {
      try {
        const cache = await caches.open("carnet-partage");
        const cles = await cache.keys();
        const fichiers = [];
        for (const cle of cles) {
          const res = await cache.match(cle);
          if (!res) continue;
          const blob = await res.blob();
          const nom = decodeURIComponent(res.headers.get("x-nom") || "") || "photo.jpg";
          fichiers.push(new File([blob], nom, { type: blob.type || "image/jpeg" }));
          await cache.delete(cle);
        }
        if (!annule && fichiers.length) await envoyerPhotos(fichiers, { partage: true });
        else if (!annule) setError("Les photos partagées n'ont pas pu être récupérées — réessaie depuis la galerie.");
      } catch (e) {
        if (!annule) setError("Les photos partagées n'ont pas pu être récupérées — réessaie depuis la galerie.");
      }
      // sans ça, un rechargement de la page réimporterait le même partage
      window.history.replaceState({}, "", "/journal");
    })();
    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, entriesLoaded]);

  function startInterview() {
    setSaisieMode("ia");
    setMessages([{ role: "assistant", content: "Alors, cette journée ? Raconte-moi comme tu veux, dans l'ordre que tu veux — je remets tout en forme après." }]);
    setExtracted(emptyExtracted());
    setPhotos([]);
    setNoteHumeur(3);
    setNoteEnergie(3);
    setNoteSociale(3);
    setNoteAventure(3);
    setHebergement("");
    setPhotoPrincipale(null);
    setReflexionPrivee(false);
    setLinkedRencontres([]);
    setPost(null);
    setError(null);
    setPhase("chat");
  }

  function startManual() {
    setSaisieMode("manuel");
    setPost({ titre: "", lieux: [], coords: null, ouverture: "", recit: [{ activite: "", detail: "" }], rencontres: "", anecdote: "", adresse: "", reflexion: "" });
    setError(null);
    setPhase("moods");
  }

  async function loadLinkedRencontres(d) {
    try {
      const [allRes, linkRes] = await Promise.all([
        api("/api/rencontres"),
        api(`/api/entry-rencontres?date=${d}`),
      ]);
      if (allRes.ok) setAllRencontres(await allRes.json());
      if (linkRes.ok) {
        const linked = await linkRes.json();
        setLinkedRencontres(linked.map((r) => r.id));
      }
    } catch {}
  }

  async function createQuickRenc() {
    if (!quickRenc?.prenom.trim()) return;
    setLoading(true);
    try {
      const res = await api("/api/rencontres", { method: "POST", body: JSON.stringify(quickRenc) });
      if (res.ok) {
        const saved = await res.json();
        setAllRencontres((rs) => [saved, ...rs]);
        setLinkedRencontres((ids) => [...ids, saved.id]);
        setQuickRenc(null);
      }
    } catch {}
    setLoading(false);
  }

  // Une journée ouverte repart de ce qu'elle contient en base — sauf pour les
  // photos de la galerie, qui n'attendaient justement qu'un jour où atterrir.
  function avecPartage(base) {
    const enAttente = partageRef.current.filter((u) => !base.includes(u));
    return enAttente.length ? [...base, ...enAttente] : base;
  }

  function openDate(d) {
    setDate(d);
    setError(null);
    const existing = entries.find((e) => e.date === d);
    if (existing) {
      setExtracted(existing.raw_extracted || emptyExtracted());
      setNoteHumeur(existing.note_humeur ?? 3);
      setNoteEnergie(existing.note_energie ?? 3);
      setNoteSociale(existing.note_sociale ?? 3);
      setNoteAventure(existing.note_aventure ?? 3);
      setHebergement(existing.hebergement || "");
      setPhotoPrincipale(existing.photo_principale || null);
      setReflexionPrivee(!!existing.reflexion_privee);
      setPhotos(avecPartage(existing.photos || []));
      loadLinkedRencontres(d);
      loadNotes(d);
      setPost({
        titre: existing.titre,
        lieux: existing.lieux,
        coords: existing.lat ? { lat: existing.lat, lng: existing.lng } : null,
        ouverture: existing.ouverture,
        recit: existing.recit,
        rencontres: existing.rencontres,
        anecdote: existing.anecdote,
        adresse: existing.adresse,
        reflexion: existing.reflexion,
      });
      setPhase("summary");
    } else {
      // nouvelle journée : on réinitialise et on demande le mode de saisie
      loadNotes(d);
      setExtracted(emptyExtracted());
      setMessages([]);
      setPhotos(avecPartage([]));
      setNoteHumeur(3); setNoteEnergie(3); setNoteSociale(3); setNoteAventure(3);
      setHebergement(""); setPhotoPrincipale(null); setReflexionPrivee(false);
      setLinkedRencontres([]); setPost(null);
      setPhase("choose");
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    // Le champ se vidait à l'écran, mais pas le moteur de dictée : sa liste de
    // résultats contenait encore toute la phrase envoyée, et le premier mot
    // suivant la faisait réapparaître en entier. On repart d'une page blanche.
    repartirDeZero();
    setError(null);
    const newMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await api("/api/interview", { method: "POST", body: JSON.stringify({ history: newMessages, extracted, photoCount: photos.length, notes: notesJour.map((n) => n.texte) }) });
      if (!res.ok) throw new Error(await motifEchec(res));
      const parsed = await res.json();
      setExtracted((prev) => ({ ...prev, ...parsed.extracted }));
      setMessages((m) => [...m, { role: "assistant", content: parsed.reply }]);
      if (parsed.done) {
        api("/api/rencontres").then((r) => r.ok && r.json().then(setAllRencontres)).catch(() => {});
        setTimeout(() => setPhase("moods"), 600);
      }
    } catch (e) {
      // Le message exact, pas un « souci de connexion » générique : sans lui,
      // une panne côté serveur ressemblait à un simple problème de réseau et
      // il n'y avait rien à rapporter pour la diagnostiquer.
      setError(`L'assistant n'a pas répondu — ${motifLisible(e)}. Ton message est gardé, réessaie.`);
      setMessages((m) => m.slice(0, -1));
      setInput(userMsg);
    } finally {
      setLoading(false);
    }
  }

  function handlePhotos(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    envoyerPhotos(files);
  }

  async function envoyerPhotos(files, { partage = false } = {}) {
    if (!files.length) return;
    setEnvoiPhotos((n) => n + files.length);
    for (const f of files) {
      const c = await compressImage(f);
      const fd = new FormData();
      fd.append("file", c, c.name || f.name);
      fd.append("date", date);
      try {
        const res = await api("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("upload");
        const { url } = await res.json();
        if (partage) {
          partageRef.current = [...partageRef.current, url];
          setPartageRecu((n) => n + 1);
        }
        setPhotos((p) => (p.includes(url) ? p : [...p, url]));
      } catch (err) {
        setError("Échec de l'envoi d'une photo — réessaie.");
      } finally {
        setEnvoiPhotos((n) => Math.max(0, n - 1));
      }
    }
  }

  function retirerPhoto(url) {
    setPhotos((p) => p.filter((x) => x !== url));
    setPhotoPrincipale((pp) => (pp === url ? null : pp));
  }

  // ---- Dictée vocale ----
  //
  // Un appui = une prise de parole, puis le micro s'arrête. Il se relançait
  // tout seul à chaque silence, et la session repartie écrasait le champ au
  // résultat suivant : impossible d'écrire au clavier — ni de se servir du
  // micro du clavier — sans se faire effacer. Une session qui ne survit pas au
  // silence ne peut plus voler la main, et elle supprime du même coup le rejeu
  // au redémarrage, principale source des répétitions.
  async function requestWakeLock() {
    try { if ("wakeLock" in navigator) wakeLockRef.current = await navigator.wakeLock.request("screen"); } catch {}
  }
  function releaseWakeLock() {
    try { wakeLockRef.current?.release?.(); } catch {}
    wakeLockRef.current = null;
  }
  // Contre les répétitions, un seul principe : ne jamais CUMULER un delta, mais
  // RECONSTRUIRE le texte de la session à chaque événement. Si le navigateur
  // rejoue des résultats déjà vus — ce qu'il fait au redémarrage — on retombe
  // sur le même texte, donc rien ne peut se dupliquer.
  function buildRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      const resultats = [];
      for (let i = 0; i < ev.results.length; i++) {
        resultats.push({ transcript: ev.results[i][0]?.transcript || "", isFinal: ev.results[i].isFinal });
      }
      const reconstruit = dicteeRef.current?.surResultat(resultats);
      if (typeof reconstruit === "string") {
        dernierDicteRef.current = reconstruit;
        setInput(reconstruit);
      }
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Micro refusé — autorise le micro pour ce site dans les réglages du navigateur.");
      }
    };
    rec.onend = () => {
      recActiveRef.current = false;
      if (purgeRef.current) {
        // message envoyé : la session mourante n'a rien à reverser.
        purgeRef.current = false;
        dicteeRef.current?.purger();
      } else {
        dicteeRef.current?.surFin();
      }
      setRecording(false);
      releaseWakeLock();
    };
    return rec;
  }

  // Le champ appartient à celui qui écrit. Quand la valeur ne vient pas de la
  // dictée, c'est une saisie humaine — clavier, ou micro du clavier : la dictée
  // repart de CE texte au lieu de le remplacer par le sien au coup suivant.
  function saisieManuelle(valeur) {
    setInput(valeur);
    if (valeur === dernierDicteRef.current) return;
    dernierDicteRef.current = null;
    dicteeRef.current = creerDictee(valeur);
  }

  // Table rase entre deux tours de conversation. `abort()` plutôt que `stop()` :
  // stop() laisse encore filer un dernier onresult, qui reremplirait le champ
  // avec la phrase qu'on vient justement d'envoyer.
  function repartirDeZero() {
    dicteeRef.current?.purger();
    dernierDicteRef.current = null;
    if (recActiveRef.current) {
      purgeRef.current = true;
      try { recognitionRef.current?.abort(); } catch {}
    }
  }

  // Démarre une session, jamais deux en parallèle : deux moteurs actifs
  // transcrivent chaque mot en double.
  function demarrerDictee(reessai = true) {
    if (recActiveRef.current) return;
    const rec = buildRecognition();
    recognitionRef.current = rec;
    try {
      rec.start();
      recActiveRef.current = true;
    } catch {
      if (reessai) setTimeout(() => demarrerDictee(false), 300);
    }
  }
  async function toggleRecording() {
    if (recording) {
      try { recognitionRef.current?.stop(); } catch {}
      setRecording(false);
      releaseWakeLock();
      return;
    }
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      setError("La dictée n'est pas dispo sur ce navigateur (souvent le cas sur iPhone). Astuce : utilise le micro du clavier, il écrit directement dans le champ.");
      return;
    }
    setError(null);
    // On repart toujours du contenu réel du champ, pas d'un état mémorisé.
    dicteeRef.current = creerDictee(input || "");
    dernierDicteRef.current = null;
    await requestWakeLock();
    demarrerDictee();
    setRecording(true);
  }

  async function generatePost() {
    setLoading(true);
    setError(null);
    try {
      // L'entretien lui-même part avec : les champs extraits ne sont qu'un
      // index, et tout ce qu'il a raconté sans que l'assistant le recopie mot
      // pour mot y était perdu — d'où des posts qui ne tenaient plus que sur
      // le calepin.
      const res = await api("/api/format", { method: "POST", body: JSON.stringify({ extracted, date, notes: notesJour.map((n) => n.texte), history: messages }) });
      if (!res.ok) throw new Error("api");
      setPost(await res.json());
      setPhase("summary");
    } catch (e) {
      setError("Impossible de générer le post, réessaie.");
    } finally {
      setLoading(false);
    }
  }

  async function saveEntry(status) {
    setLoading(true);
    setError(null);
    const entry = {
      date,
      day_number: dayNumber(date),
      titre: post.titre,
      lieux: post.lieux,
      lat: post.coords?.lat ?? null,
      lng: post.coords?.lng ?? null,
      ouverture: post.ouverture,
      recit: post.recit,
      rencontres: post.rencontres,
      anecdote: post.anecdote,
      adresse: post.adresse,
      reflexion: post.reflexion,
      reflexion_privee: reflexionPrivee,
      note_humeur: noteHumeur,
      note_energie: noteEnergie,
      note_sociale: noteSociale,
      note_aventure: noteAventure,
      hebergement: hebergement.trim() || null,
      photo_principale: photoPrincipale || photos[0] || null,
      photos,
      raw_extracted: extracted,
      status,
    };
    // météo automatique à partir des coordonnées du lieu
    if (post.coords?.lat) {
      try {
        const m = await fetchMeteo(post.coords.lat, post.coords.lng, date);
        if (m) entry.meteo = m;
      } catch {}
    }
    try {
      const res = await api("/api/entries", { method: "POST", body: JSON.stringify(entry) });
      if (!res.ok) throw new Error((await res.json()).error);
      const saved = await res.json();
      // enregistrer les liaisons rencontres
      try {
        await api("/api/entry-rencontres", {
          method: "POST",
          body: JSON.stringify({ entry_date: date, rencontre_ids: linkedRencontres }),
        });
      } catch {}
      setEntries((es) => [saved, ...es.filter((x) => x.date !== date)].sort((a, b) => (a.date < b.date ? 1 : -1)));
      marquerNotesUtilisees(date);
      // rattachées pour de bon : elles ne doivent pas suivre vers un autre jour
      partageRef.current = [];
      setPartageRecu(0);
      setPhase("saved");
    } catch (e) {
      setError("Échec de l'enregistrement : " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadNotes(d) {
    try {
      const res = await api(`/api/notes?date=${d}`);
      setNotesJour(res.ok ? await res.json() : []);
    } catch { setNotesJour([]); }
  }

  // Les notes ayant servi à écrire le post sont barrées dans le calepin : ce qui
  // reste debout est ce qui n'a pas été raconté.
  async function marquerNotesUtilisees(d) {
    try {
      await api("/api/notes", { method: "PATCH", body: JSON.stringify({ date: d, utilisee: true }) });
    } catch {}
  }

  async function deleteEntry() {
    if (!confirm("Supprimer définitivement cette journée ?")) return;
    try {
      const res = await api("/api/entries", { method: "DELETE", body: JSON.stringify({ date }) });
      // fetch ne rejette pas sur un 401/500 : sans ce test, la journée disparaissait
      // de l'écran alors qu'elle était toujours en base.
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error || `erreur ${res.status}`);
      }
      setEntries((es) => es.filter((x) => x.date !== date));
      setPhase("date");
    } catch (e) {
      setError("Échec de la suppression : " + e.message);
    }
  }

  const dNum = dayNumber(date);

  async function exportData() {
    setExporting(true);
    setError(null);
    try {
      const res = await api("/api/export");
      if (!res.ok) throw new Error("export refusé");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aventures-maxou-export-${todayStr()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Export impossible : " + e.message);
    } finally {
      setExporting(false);
    }
  }

  async function deleteComment(id) {
    if (!confirm("Supprimer ce commentaire ?")) return;
    const res = await api("/api/comments", { method: "DELETE", body: JSON.stringify({ id }) });
    if (res.ok) setComments((cs) => cs.filter((c) => c.id !== id));
  }

  if (authLoading) {
    return (
      <main className="container" style={{ paddingTop: 60 }}>
        <p className="empty">Vérification…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="container" style={{ paddingTop: 60, maxWidth: 420, textAlign: "center" }}>
        <h1 className="serif" style={{ fontSize: 22, marginBottom: 12 }}>Mode éditeur</h1>
        <p style={{ color: "var(--text2)", marginBottom: 18 }}>Connecte-toi avec ton compte pour continuer.</p>
        <Link href="/connexion" className="btn" style={{ display: "inline-block", textDecoration: "none" }}>Se connecter</Link>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container" style={{ paddingTop: 60, maxWidth: 420, textAlign: "center" }}>
        <h1 className="serif" style={{ fontSize: 22, marginBottom: 12 }}>Mode éditeur</h1>
        <p style={{ color: "var(--text2)", marginBottom: 18 }}>
          Cet espace est réservé à l'auteur.
        </p>
        <Link href="/" className="btn-secondary" style={{ display: "inline-block", textDecoration: "none" }}>← Retour aux aventures</Link>
      </main>
    );
  }

  return (
    <main className={"jr-shell" + (phase === "summary" ? " jr-large" : "")}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "var(--bg2)" }}>
        <Link href="/atelier" className="mono" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>← Menu</Link>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div className="serif" style={{ fontSize: 14 }}>Jour {dNum >= 0 ? dNum : "—"}</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", textTransform: "capitalize" }}>
            {new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
          </div>
        </div>
        {phase !== "date" && (
          <button className="btn-secondary" style={{ padding: "8px 12px", fontSize: 13 }} onClick={() => setPhase("date")}>🗓️ Calendrier</button>
        )}
      </header>

      {phase === "date" && !showInbox && !showComments && !showRencontres && (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {(envoiPhotos > 0 || partageRecu > 0) && (
            <p className="partage-banniere">
              {envoiPhotos > 0
                ? `Réception de ${envoiPhotos} photo${envoiPhotos > 1 ? "s" : ""} depuis la galerie…`
                : `${partageRecu} photo${partageRecu > 1 ? "s" : ""} reçue${partageRecu > 1 ? "s" : ""} de la galerie — choisis la journée à laquelle les rattacher.`}
            </p>
          )}
          <h2 className="serif" style={{ fontSize: 19 }}>Quelle journée veux-tu raconter ?</h2>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>Un point doré = une note existe déjà (tape pour la modifier).</p>
          <MiniCalendar date={date} onSelect={openDate} entryDates={entries.map((e) => e.date)} entries={entries} />
          {error && <p className="error">{error}</p>}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/notes" className="btn-secondary" style={{ padding: "8px 12px", fontSize: 13, textDecoration: "none" }}>📝 Calepin</Link>
            <button className="btn-secondary" style={{ padding: "8px 12px", fontSize: 13 }} onClick={() => setShowRencontres(true)}>🤝 Rencontres</button>
            <button className="btn-secondary" style={{ padding: "8px 12px", fontSize: 13 }} onClick={() => setShowComments(true)}>💬 Commentaires{comments.length > 0 ? ` (${comments.length})` : ""}</button>
            <button className="btn-secondary" style={{ padding: "8px 12px", fontSize: 13 }} onClick={exportData} disabled={exporting}>{exporting ? "…" : "⬇️ Export"}</button>
          </div>

          <div style={{ marginTop: 4, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>
              Rappel chaque soir à 20h, et le lendemain soir si la journée est encore vide.
            </p>
            <PushButton role="admin" label="Activer mes rappels" labelDone="Rappels activés ✓" />
          </div>
        </div>
      )}

      {phase === "chat" && notesJour.length > 0 && (
        <details className="notes-rappel">
          <summary>📝 {notesJour.length} note{notesJour.length > 1 ? "s" : ""} de la journée</summary>
          <ul>{notesJour.map((n) => <li key={n.id}>{n.texte}</li>)}</ul>
        </details>
      )}

      {phase === "choose" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "26px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <button className="btn-secondary" style={{ alignSelf: "flex-start", padding: "6px 12px", fontSize: 13 }} onClick={() => setPhase("date")}>← Calendrier</button>
          <h2 className="serif" style={{ fontSize: 20 }}>Comment veux-tu saisir cette journée ?</h2>
          <p style={{ fontSize: 13.5, color: "var(--muted)" }}>Dans les deux cas tu gardes la main sur le texte final. L'assistant t'aide juste à remplir.</p>
          <button className="mode-card" onClick={startManual}>
            <span className="mode-card-ic">✍️</span>
            <span><span className="mode-card-title">Saisie manuelle</span><span className="mode-card-sub">Je remplis les champs moi-même</span></span>
          </button>
          <button className="mode-card" onClick={startInterview}>
            <span className="mode-card-ic">✨</span>
            <span><span className="mode-card-title">Avec l'assistant IA</span><span className="mode-card-sub">Je raconte, l'IA pré-remplit le journal</span></span>
          </button>
        </div>
      )}

      {showRencontres && <RencontresManager onClose={() => setShowRencontres(false)} />}

      {showComments && (
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
            <h2 className="serif" style={{ fontSize: 19 }}>Commentaires</h2>
            <button className="btn-secondary" style={{ marginLeft: "auto", padding: "8px 14px" }} onClick={() => setShowComments(false)}>
              Fermer
            </button>
          </div>
          {comments.length === 0 && <p className="empty">Aucun commentaire pour l'instant.</p>}
          {comments.map((c) => (
            <div key={c.id} className="pm">
              <div className="pm-head">
                {c.profiles?.avatar_url ? (
                  <img src={c.profiles.avatar_url} alt="" className="avatar" />
                ) : (
                  <span className="avatar avatar-fallback">{(c.profiles?.prenom || "?")[0]?.toUpperCase()}</span>
                )}
                <b>{c.profiles?.prenom || "Quelqu'un"} {c.profiles?.nom || ""}</b>
                <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>
                  jour du {new Date(c.entry_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              </div>
              <p style={{ color: "var(--text2)", fontSize: 14.5, marginTop: 6 }}>{c.contenu}</p>
              <button
                className="btn-danger"
                style={{ marginTop: 8, padding: "6px 12px", fontSize: 12 }}
                onClick={() => deleteComment(c.id)}
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}

      {showInbox && (
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
            <h2 className="serif" style={{ fontSize: 19 }}>Mots reçus</h2>
            <button className="btn-secondary" style={{ marginLeft: "auto", padding: "8px 14px" }} onClick={() => setShowInbox(false)}>
              Fermer
            </button>
          </div>
          {inbox.length === 0 && <p className="empty">Aucun mot pour l'instant.</p>}
          {inbox.map((m) => (
            <div key={m.id} className="pm" style={{ opacity: m.lu ? 0.6 : 1 }}>
              <div className="pm-head">
                {m.profiles?.avatar_url ? (
                  <img src={m.profiles.avatar_url} alt="" className="avatar" />
                ) : (
                  <span className="avatar avatar-fallback">{(m.profiles?.prenom || "?")[0]?.toUpperCase()}</span>
                )}
                <b>{m.profiles?.prenom} {m.profiles?.nom}</b>
                <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>
                  {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              </div>
              <p style={{ color: "var(--text2)", fontSize: 14.5, marginTop: 6 }}>{m.contenu}</p>
              {!m.lu && (
                <button
                  className="btn-secondary"
                  style={{ marginTop: 8, padding: "6px 12px", fontSize: 12 }}
                  onClick={async () => {
                    await api("/api/inbox", { method: "POST", body: JSON.stringify({ id: m.id }) });
                    setInbox((ms) => ms.map((x) => (x.id === m.id ? { ...x, lu: true } : x)));
                  }}
                >
                  Marquer comme lu
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {phase === "chat" && (
        <>
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div
                  style={{
                    background: m.role === "user" ? "var(--pink)" : "var(--bg3)",
                    color: m.role === "user" ? "#fff" : "var(--text)",
                    padding: "10px 14px",
                    borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    maxWidth: "82%",
                    fontSize: 14.5,
                    lineHeight: 1.5,
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div style={{ color: "var(--muted)", fontSize: 13 }}><span className="spin">⏳</span></div>}
            {photos.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {photos.map((url, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }} />
                    <button
                      onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "var(--pink)", color: "#fff", border: "none", cursor: "pointer", fontSize: 11 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {error && <p className="error" style={{ margin: "0 12px 8px" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: "1px solid var(--line)", background: "var(--bg2)" }}>
            <PhotoPicker onFiles={handlePhotos} busy={envoiPhotos > 0} compact />
            <button
              className="btn-secondary"
              style={{ padding: 10, width: 42, ...(recording ? { background: "var(--pink)", borderColor: "var(--pink)" } : {}) }}
              onClick={toggleRecording}
              aria-label="Dicter"
            >
              🎙️
            </button>
            <input
              className="input"
              style={{ flex: 1 }}
              value={input}
              onChange={(e) => saisieManuelle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={recording ? "Je t'écoute…" : "Raconte… (ou 🎙️, ou le micro de ton clavier)"}
            />
            <button className="btn" style={{ padding: "10px 16px" }} onClick={handleSend} disabled={loading}>➤</button>
          </div>
        </>
      )}

      {phase === "moods" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
          <h2 className="serif" style={{ fontSize: 19 }}>Comment était cette journée ?</h2>
          <NoteScale label="😊 Humeur" value={noteHumeur} onChange={setNoteHumeur} />
          <NoteScale label="⚡ Énergie" value={noteEnergie} onChange={setNoteEnergie} />
          <NoteScale label="🤝 Sociale" value={noteSociale} onChange={setNoteSociale} />
          <NoteScale label="🌋 Aventure" value={noteAventure} onChange={setNoteAventure} />

          <div>
            <label className="lbl">🛏️ Où as-tu dormi ?</label>
            <input className="input" value={hebergement} onChange={(e) => setHebergement(e.target.value)} placeholder="Nom de l'hôtel, hostel, Airbnb…" />
          </div>

          <div>
            <label className="lbl">🤝 Rencontres du jour</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {allRencontres.map((r) => {
                const on = linkedRencontres.includes(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() =>
                      setLinkedRencontres((ids) =>
                        on ? ids.filter((x) => x !== r.id) : [...ids, r.id]
                      )
                    }
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                      border: "1.5px solid " + (on ? "var(--accent)" : "var(--line2)"),
                      background: on ? "var(--accent)" : "var(--card)",
                      color: on ? "#fff" : "var(--ink2)", fontSize: 13,
                    }}
                  >
                    {r.photo_url && <img src={r.photo_url} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />}
                    {r.prenom} {r.nom || ""}
                  </button>
                );
              })}
            </div>
            {quickRenc ? (
              <div style={{ marginTop: 10, padding: 12, border: "1.5px solid var(--accent)", borderRadius: 12, background: "var(--card)" }}>
                <input className="input" placeholder="Prénom *" value={quickRenc.prenom} onChange={(e) => setQuickRenc({ ...quickRenc, prenom: e.target.value })} style={{ marginBottom: 8 }} autoFocus />
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input className="input" placeholder="Pays" value={quickRenc.pays} onChange={(e) => setQuickRenc({ ...quickRenc, pays: e.target.value })} />
                  <input className="input" placeholder="Lieu" value={quickRenc.lieu_rencontre} onChange={(e) => setQuickRenc({ ...quickRenc, lieu_rencontre: e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setQuickRenc(null)}>Annuler</button>
                  <button className="btn" style={{ flex: 1 }} onClick={createQuickRenc} disabled={loading || !quickRenc.prenom.trim()}>Créer & lier</button>
                </div>
              </div>
            ) : (
              <button
                className="btn-secondary"
                style={{ marginTop: 8, padding: "8px 14px", fontSize: 13 }}
                onClick={() => setQuickRenc({ prenom: "", pays: "", lieu_rencontre: "" })}
              >
                + Nouvelle personne
              </button>
            )}
          </div>

          <div>
            <label className="lbl">Photos de la journée</label>
            <PhotoPicker onFiles={handlePhotos} busy={envoiPhotos > 0} />
            <AstucePartage />
            {envoiPhotos > 0 && <p className="photo-envoi">Envoi de {envoiPhotos} photo{envoiPhotos > 1 ? "s" : ""}…</p>}
          </div>

          {photos.length > 0 && (
            <div>
              <label className="lbl">Photo principale (en tête du post)</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: 6 }}>
                {photos.map((url, i) => (
                  <button key={i} onClick={() => setPhotoPrincipale(url)} style={{ position: "relative", padding: 0, border: "none", cursor: "pointer", borderRadius: 8, overflow: "hidden", outline: (photoPrincipale || photos[0]) === url ? "3px solid var(--accent)" : "none" }}>
                    <img src={url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                    {(photoPrincipale || photos[0]) === url && (
                      <span style={{ position: "absolute", top: 3, right: 3, background: "var(--accent)", color: "#fff", fontSize: 9, padding: "1px 5px", borderRadius: 4, fontFamily: "var(--police)" }}>★</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="error">{error}</p>}
          <button className="btn" style={{ marginTop: "auto" }} onClick={saisieMode === "manuel" ? () => { setError(null); setPhase("summary"); } : generatePost} disabled={loading}>
            {loading ? "Mise en forme…" : saisieMode === "manuel" ? "Rédiger le post →" : "Voir mon post"}
          </button>
        </div>
      )}

      {phase === "summary" && post && (
        <div className="jr-scroll">
          <p style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            {saisieMode === "manuel" ? "Remplis ta journée" : "Aperçu — clique un texte pour le modifier"}
          </p>
          {notesJour.length > 0 && (
            <details className="notes-rappel" open={saisieMode === "manuel"}>
              <summary>📝 {notesJour.length} note{notesJour.length > 1 ? "s" : ""} de la journée — rien d'oublié ?</summary>
              <ul>{notesJour.map((n) => <li key={n.id}>{n.texte}</li>)}</ul>
            </details>
          )}
          <EditablePost post={post} setPost={setPost} photos={photos} notes={{ h: noteHumeur, e: noteEnergie, s: noteSociale, a: noteAventure }} dayNum={dNum} photoPrincipale={photoPrincipale} setPhotoPrincipale={setPhotoPrincipale} onAjouterPhotos={handlePhotos} onRetirerPhoto={retirerPhoto} envoiPhotos={envoiPhotos} reflexionPrivee={reflexionPrivee} setReflexionPrivee={setReflexionPrivee} />
          {error && <p className="error">{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => saveEntry("draft")} disabled={loading}>Brouillon</button>
            <button className="btn" style={{ flex: 1 }} onClick={() => saveEntry("published")} disabled={loading}>Publier</button>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {saisieMode === "ia" ? (
              <button className="btn-secondary" style={{ flex: 1 }} onClick={startInterview}>Refaire l'interview</button>
            ) : (
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setPhase("moods")}>← Ressentis & photos</button>
            )}
            {entries.some((e) => e.date === date) && (
              <button className="btn-danger" onClick={deleteEntry}>Supprimer</button>
            )}
          </div>
        </div>
      )}

      {phase === "saved" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <p className="serif" style={{ fontSize: 19 }}>Journée enregistrée</p>
          <button className="btn" onClick={() => setPhase("date")}>Retour au calendrier</button>
        </div>
      )}
    </main>
  );
}

// Toutes les sections sont éditables, que le post vienne de l'IA ou d'une saisie
// manuelle. Auparavant un champ laissé vide par l'IA n'était même pas affiché :
// impossible d'ajouter après coup une anecdote qu'elle n'avait pas relevée.
function EditablePost({ post, setPost, photos, notes, dayNum, photoPrincipale, setPhotoPrincipale, onAjouterPhotos, onRetirerPhoto, envoiPhotos = 0, reflexionPrivee, setReflexionPrivee }) {
  const recit = Array.isArray(post.recit) ? post.recit : [];
  const upd = (field, value) => setPost((p) => ({ ...p, [field]: value }));
  const updRecit = (i, k, v) => upd("recit", recit.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const addRecit = () => upd("recit", [...recit, { activite: "", detail: "" }]);
  const delRecit = (i) => upd("recit", recit.filter((_, j) => j !== i));
  // L'ordre des moments est celui du récit : il doit pouvoir être remis d'aplomb
  // quand l'IA n'a pas suivi le fil de la journée.
  // Les anecdotes vivent dans une seule chaîne, une par ligne : l'éditeur les
  // manipule comme une liste et les recolle au moment d'enregistrer.
  const anecdotes = decoupeAnecdotes(post.anecdote);
  const majAnecdotes = (liste) => upd("anecdote", colleAnecdotes(liste));
  const updAnecdote = (i, v) => majAnecdotes(anecdotes.map((a, j) => (j === i ? v : a)));
  const addAnecdote = () => upd("anecdote", (post.anecdote || "").replace(/\s+$/, "") + (post.anecdote?.trim() ? "\n" : "") + " ");
  const delAnecdote = (i) => majAnecdotes(anecdotes.filter((_, j) => j !== i));

  const moveRecit = (i, delta) => {
    const j = i + delta;
    if (j < 0 || j >= recit.length) return;
    const copie = [...recit];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    upd("recit", copie);
  };

  const ta = (field, value, extra = {}) => (
    <textarea
      className="input"
      style={{ fontSize: 14, lineHeight: 1.5, resize: "vertical", ...extra }}
      rows={Math.max(2, Math.ceil((value || "").length / 45))}
      value={value || ""}
      onChange={(e) => upd(field, e.target.value)}
    />
  );

  return (
    <div className="post-card">
      <div className="post-header">
        <div style={{ flex: 1 }}>
          <div className="post-day">Jour {dayNum >= 0 ? afficheJour(dayNum) : "—"}</div>
          <input className="input serif" style={{ fontSize: 17, marginTop: 4 }} value={post.titre || ""} onChange={(e) => upd("titre", e.target.value)} placeholder="Titre de la journée" />
        </div>
        <div className="post-moods">
          <div className="mood-item"><span className="mood-small">😊{notes.h}</span><span className="mood-caption">humeur</span></div>
          <div className="mood-item"><span className="mood-small">⚡{notes.e}</span><span className="mood-caption">énergie</span></div>
          <div className="mood-item"><span className="mood-small">🤝{notes.s}</span><span className="mood-caption">sociale</span></div>
          <div className="mood-item"><span className="mood-small">🌋{notes.a}</span><span className="mood-caption">aventure</span></div>
        </div>
      </div>

      <div className="post-col-fiche">
      <div className="section">
        <div className="section-head">Lieux</div>
        <input className="input" placeholder="Villes / lieux, séparés par des virgules" value={(post.lieux || []).join(", ")} onChange={(e) => upd("lieux", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
      </div>
      {post.coords?.lat && (
        <div className="map-banner">📍 {post.lieux?.[0]} · {post.coords.lat.toFixed(2)}, {post.coords.lng.toFixed(2)} <span style={{ marginLeft: "auto", fontSize: 10.5, fontStyle: "italic", color: "var(--muted)" }}>carte interactive à venir</span></div>
      )}

      {setPhotoPrincipale && (
        <div className="section">
          <div className="section-head">
            Photos {photos.length > 0 && "— clique celle qui ouvre le post"}
          </div>
          {onAjouterPhotos && <PhotoPicker onFiles={onAjouterPhotos} busy={envoiPhotos > 0} />}
          {onAjouterPhotos && <AstucePartage />}
          {envoiPhotos > 0 && <p className="photo-envoi">Envoi de {envoiPhotos} photo{envoiPhotos > 1 ? "s" : ""}…</p>}
          {photos.length === 0 ? (
            <p className="photo-vide">Aucune photo pour l'instant.</p>
          ) : (
            <div className="photo-pick">
              {photos.map((url, i) => {
                const active = (photoPrincipale || photos[0]) === url;
                return (
                  <div key={i} className={"photo-pick-item" + (active ? " on" : "")}>
                    <button type="button" className="photo-pick-choix" onClick={() => setPhotoPrincipale(url)} aria-pressed={active} aria-label={`Mettre la photo ${i + 1} en tête`}>
                      <img src={url} alt={`Photo ${i + 1}`} />
                    </button>
                    {active && <span className="photo-pick-flag">✓</span>}
                    {onRetirerPhoto && (
                      <button type="button" className="photo-pick-retirer" onClick={() => onRetirerPhoto(url)} aria-label={`Retirer la photo ${i + 1}`}>✕</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="section"><div className="section-head">Rencontres (texte)</div>{ta("rencontres", post.rencontres)}</div>
      <div className="section"><div className="section-head">Bonne adresse</div>{ta("adresse", post.adresse)}</div>
      </div>

      <div className="post-col-recit">
      <div className="section">
        <div className="section-head">Ouverture — le fil de la journée</div>
        {ta("ouverture", post.ouverture)}
      </div>

      <div className="section">
        <div className="section-head">Les moments {recit.length > 0 && `(${recit.length}/5)`}</div>
        {recit.map((item, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span className="moment-rang">{i + 1}</span>
              <input className="input" style={{ fontWeight: 700, flex: 1 }} value={item.activite || ""} onChange={(e) => updRecit(i, "activite", e.target.value)} placeholder="Titre du moment" />
              {recit.length > 1 && (
                <span className="moment-ordre">
                  <button onClick={() => moveRecit(i, -1)} disabled={i === 0} aria-label={`Monter le moment ${i + 1}`} title="Monter">↑</button>
                  <button onClick={() => moveRecit(i, 1)} disabled={i === recit.length - 1} aria-label={`Descendre le moment ${i + 1}`} title="Descendre">↓</button>
                </span>
              )}
              {recit.length > 1 && <button className="cmt-del" onClick={() => delRecit(i)} aria-label={`Retirer le moment ${i + 1}`}>✕</button>}
            </div>
            <textarea className="input" style={{ fontSize: 13.5 }} rows={2} value={item.detail || ""} onChange={(e) => updRecit(i, "detail", e.target.value)} placeholder="Détail (facultatif)" />
          </div>
        ))}
        {recit.length < 5 && <button className="btn-secondary" style={{ padding: "8px 14px", fontSize: 13 }} onClick={addRecit}>+ Ajouter un moment</button>}
      </div>


      <div className="section box-anecdote">
        <div className="section-head">
          {anecdotes.length > 1 ? `Les anecdotes (${anecdotes.length})` : "L'anecdote"}
        </div>
        {anecdotes.length === 0 ? (
          <textarea
            className="input"
            style={{ fontSize: 14, lineHeight: 1.5, resize: "vertical" }}
            rows={2}
            value=""
            placeholder="Une histoire à retenir de la journée…"
            onChange={(e) => upd("anecdote", e.target.value)}
          />
        ) : (
          anecdotes.map((a, i) => (
            <div key={i} className="anecdote-champ">
              <textarea
                className="input"
                style={{ fontSize: 14, lineHeight: 1.5, resize: "vertical" }}
                rows={Math.max(2, Math.ceil(a.length / 45))}
                value={a}
                onChange={(e) => updAnecdote(i, e.target.value)}
              />
              {anecdotes.length > 1 && (
                <button className="cmt-del" onClick={() => delAnecdote(i)} aria-label={`Retirer l'anecdote ${i + 1}`}>✕</button>
              )}
            </div>
          ))
        )}
        <button className="btn-secondary" style={{ padding: "7px 13px", fontSize: 12.5, alignSelf: "flex-start" }} onClick={addAnecdote}>
          + Une autre anecdote
        </button>
      </div>
      <div className="section box-reflexion"><div className="section-head">Ce que je garde</div>{ta("reflexion", post.reflexion)}</div>

      {setReflexionPrivee && (
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          <input type="checkbox" checked={!!reflexionPrivee} onChange={(e) => setReflexionPrivee(e.target.checked)} style={{ width: 18, height: 18 }} />
          Garder ma réflexion privée (invisible sur le blog)
        </label>
      )}
      </div>
    </div>
  );
}

function NoteScale({ label, value, onChange }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
        <span className="mono" style={{ fontSize: 13, color: "var(--accent)" }}>{value}/5</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 10, cursor: "pointer",
              border: "1.5px solid " + (n <= value ? "var(--accent)" : "var(--line2)"),
              background: n <= value ? "var(--accent)" : "var(--card)",
              color: n <= value ? "#fff" : "var(--muted)",
              fontFamily: "var(--police)", fontSize: 15, fontWeight: 700,
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function Scale({ label, options, value, onChange, low, high }) {
  return (
    <div>
      <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 10 }}>{label}</p>
      <div style={{ display: "flex", gap: 8 }}>
        {options.map((em, i) => (
          <button key={i} onClick={() => onChange(i)} className="btn-secondary" style={{ flex: 1, fontSize: 22, padding: "10px 0", ...(value === i ? { borderColor: "var(--gold)", background: "var(--line)" } : {}) }}>
            {em}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
        <span>{low}</span><span>{high}</span>
      </div>
    </div>
  );
}

function MiniCalendar({ date, onSelect, entryDates, entries }) {
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date(date + "T00:00:00");
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayStr();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const dstr = (d) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 14, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button className="btn-secondary" style={{ padding: "6px 14px" }} onClick={() => setMonthDate(new Date(year, month - 1, 1))}>‹</button>
        <div className="serif" style={{ fontSize: 15, textTransform: "capitalize" }}>
          {monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </div>
        <button className="btn-secondary" style={{ padding: "6px 14px" }} onClick={() => setMonthDate(new Date(year, month + 1, 1))}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={"h" + i} style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", padding: "4px 0" }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={"e" + i} />;
          const ds = dstr(d);
          const entry = entries.find((e) => e.date === ds);
          const isToday = ds === today;
          return (
            <button
              key={ds}
              onClick={() => onSelect(ds)}
              style={{
                position: "relative",
                aspectRatio: "1",
                border: isToday ? "1px solid var(--line2)" : "none",
                borderRadius: 8,
                background: "transparent",
                color: "var(--text)",
                fontSize: 13.5,
                cursor: "pointer",
              }}
            >
              {d}
              {entry && (
                <span style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", width: 5, height: 5, borderRadius: "50%", background: entry.status === "published" ? "var(--gold)" : "var(--muted)" }} />
              )}
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>● doré = publié · ● gris = brouillon</p>
    </div>
  );
}
