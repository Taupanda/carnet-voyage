"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AdminGate from "../AdminGate";
import { supabaseBrowser } from "../../lib/supabaseClient";
import { todayLocal } from "../../lib/stages";
import { meteoInfo, fetchMeteoJour } from "../../lib/weather";
import { derniersOutils } from "../../lib/outils";
import { creerDictee } from "../../lib/dictee";
import { creerGardeEcran } from "../../lib/veille";
import { appelApi } from "../../lib/jeton";

const CATS = [
  { id: "repas", label: "Repas", ic: "🍽️" },
  { id: "transport", label: "Transport", ic: "🚌" },
  { id: "hebergement", label: "Hébergement", ic: "🛏️" },
  { id: "activites", label: "Activités", ic: "🎯" },
  { id: "sorties", label: "Sorties", ic: "🍸" },
  { id: "autres", label: "Autres", ic: "📦" },
];

const FALLBACK_RATE = 19.5; // 1 € ≈ X MXN, repli hors-ligne

// Le jeton vient du cache d'AuthProvider : plus de getSession() par requête,
// et un délai maximal, pour qu'un appel finisse toujours — réponse ou erreur.
const api = appelApi;

async function motifEchec(res) {
  if (res.status === 401) return "session admin non reconnue, reconnecte-toi";
  const detail = await res.json().catch(() => null);
  return detail?.error || `erreur ${res.status}`;
}

const eur = (n) =>
  Number(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Accueil() {
  return (
    <AdminGate>
      <AccueilBody />
    </AdminGate>
  );
}

function AccueilBody() {
  const jour = todayLocal();
  const [etat, setEtat] = useState(null);
  const [err, setErr] = useState(null);

  async function charger() {
    const res = await api(`/api/accueil?date=${jour}`);
    if (!res.ok) { setErr("Chargement impossible : " + (await motifEchec(res))); return; }
    setEtat(await res.json());
  }
  useEffect(() => { charger(); }, []);


  const notes = etat?.notes || [];

  return (
    <main className="container ac-page" style={{ maxWidth: 620 }}>
      {err && <p className="error" style={{ marginBottom: 12 }}>{err}</p>}

      <Meteo lieu={etat?.lieu} />

      <div className="ac-capture">
        <NoteRapide jour={jour} notes={notes} onFait={charger} />
        <DepenseRapide jour={jour} onFait={charger} />
        <Convertisseur />
      </div>

      <BandeOutils />

    </main>
  );
}

/* ---------- Note : à la voix ou au clavier, les deux au même rang ---------- */
function NoteRapide({ jour, notes, onFait }) {
  const [texte, setTexte] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [ecoute, setEcoute] = useState(false);
  const [dispo, setDispo] = useState(false);
  const champ = useRef(null);
  const recRef = useRef(null);
  const dicteeRef = useRef(null);
  const gardeRef = useRef(null);
  const dernierDicteRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDispo(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  async function enregistrer(t) {
    const valeur = (t || "").trim();
    if (!valeur || busy) return;
    setBusy(true);
    setErr(null);
    const res = await api("/api/notes", { method: "POST", body: JSON.stringify({ date: jour, texte: valeur }) });
    setBusy(false);
    if (!res.ok) { setErr(await motifEchec(res)); return; }
    setTexte("");
    onFait();
  }

  // Dictée d'une note : une phrase, puis on s'arrête. Même moteur de
  // reconstruction que le journal (lib/dictee.js), pour que les répétitions
  // soient traitées au même endroit — et testées une seule fois.
  function dicter() {
    if (ecoute) { try { recRef.current?.stop(); } catch {} return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    recRef.current = rec;
    rec.lang = "fr-FR";
    rec.continuous = false;
    rec.interimResults = true;
    // Ce qui était déjà écrit dans le champ n'est pas effacé par la dictée.
    // Passe par la ref, pas par une variable capturée : une correction au
    // clavier en cours de dictée remplace l'objet, et le résultat suivant doit
    // repartir du nouveau, pas de celui d'il y a trois secondes.
    dicteeRef.current = creerDictee(texte);
    rec.onresult = (ev) => {
      const resultats = [];
      for (let i = 0; i < ev.results.length; i++) {
        resultats.push({ transcript: ev.results[i][0]?.transcript || "", isFinal: ev.results[i].isFinal });
      }
      const reconstruit = dicteeRef.current?.surResultat(resultats);
      if (typeof reconstruit !== "string") return;
      dernierDicteRef.current = reconstruit;
      setTexte(reconstruit);
    };
    rec.onerror = () => { setEcoute(false); gardeRef.current?.eteindre(); setErr("Micro indisponible."); };
    rec.onend = () => { setEcoute(false); gardeRef.current?.eteindre(); champ.current?.focus(); };
    try {
      rec.start();
      setEcoute(true);
      setErr(null);
      // L'écran ne doit pas s'éteindre pendant qu'on parle : la reconnaissance
      // s'arrête avec lui, en plein milieu d'une phrase.
      if (!gardeRef.current) gardeRef.current = creerGardeEcran({});
      gardeRef.current.allumer();
    } catch {}
  }

  return (
    <section className="ac-part">
      <div className="ac-bloc-tete">
        <h2>Noter</h2>
        <Link href="/notes" className="ac-lien">le calepin →</Link>
      </div>
      <div className="ac-note">
        {dispo && (
          <button
            type="button"
            className={"ac-micro" + (ecoute ? " on" : "")}
            onClick={dicter}
            aria-pressed={ecoute}
            aria-label={ecoute ? "Arrêter la dictée" : "Dicter la note"}
          >
            🎤
          </button>
        )}
        <input
          ref={champ}
          className="input"
          placeholder={ecoute ? "Je t'écoute…" : "Écrire ou dicter…"}
          value={texte}
          onChange={(e) => {
            // Même règle que le journal : ce qui est tapé à la main prime, et la
            // dictée repart de ce texte plutôt que de le remplacer.
            const v = e.target.value;
            setTexte(v);
            if (v !== dernierDicteRef.current) {
              dernierDicteRef.current = null;
              dicteeRef.current = creerDictee(v);
            }
          }}
          onKeyDown={(e) => e.key === "Enter" && enregistrer(texte)}
          disabled={busy}
        />
        <button className="btn ac-ok" onClick={() => enregistrer(texte)} disabled={busy || !texte.trim()}>
          {busy ? "…" : "+"}
        </button>
      </div>
      {err && <p className="error" style={{ marginTop: 8 }}>{err}</p>}
      {notes.length > 0 && <p className="ac-apercu">{notes.slice(-2).join(" · ")}</p>}
    </section>
  );
}

/* ---------- Dépense rapide : se saisit sur le moment ou s'oublie ---------- */
function DepenseRapide({ jour, onFait }) {
  const [montant, setMontant] = useState("");
  const [cat, setCat] = useState("repas");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(false);

  async function ajouter() {
    const valeur = Number(String(montant).replace(",", ".").trim());
    if (!Number.isFinite(valeur) || valeur <= 0 || busy) return;
    setBusy(true);
    setErr(null);
    const res = await api("/api/depenses", {
      method: "POST",
      body: JSON.stringify({ date: jour, categorie: cat, montant: valeur, note: "" }),
    });
    setBusy(false);
    if (!res.ok) { setErr(await motifEchec(res)); return; }
    setMontant("");
    setOk(true);
    setTimeout(() => setOk(false), 1600);
    onFait();
  }

  return (
    <section className="ac-part">
      <div className="ac-bloc-tete">
        <h2>Dépense</h2>
        <Link href="/budget" className="ac-lien">le budget →</Link>
      </div>
      <div className="ac-depense">
        <input
          className="input ac-montant"
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ajouter()}
        />
        <span className="ac-devise">€</span>
        <button className="btn" style={{ padding: "10px 16px" }} onClick={ajouter} disabled={busy || !montant.trim()}>
          {busy ? "…" : ok ? "✓" : "+"}
        </button>
      </div>
      <div className="ac-cats">
        {CATS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={"ac-cat" + (cat === c.id ? " on" : "")}
            onClick={() => setCat(c.id)}
          >
            <span>{c.ic}</span> {c.label}
          </button>
        ))}
      </div>
      {err && <p className="error" style={{ marginTop: 8 }}>{err}</p>}
    </section>
  );
}

/* ---------- Conversion : intégrée, pas un lien vers une autre page ---------- */
function Convertisseur() {
  const [rate, setRate] = useState(FALLBACK_RATE);
  const [live, setLive] = useState(false);
  const [mxn, setMxn] = useState("");
  const [euro, setEuro] = useState("");

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const r = await fetch("https://api.frankfurter.app/latest?from=EUR&to=MXN");
        const d = await r.json();
        const rt = d.rates?.MXN;
        if (rt && !annule) {
          setRate(rt);
          setLive(true);
          try { localStorage.setItem("carnet-rate", JSON.stringify({ rt, date: d.date })); } catch {}
        }
      } catch {
        // Hors ligne : on reprend le dernier taux connu plutôt que le repli figé.
        try {
          const saved = JSON.parse(localStorage.getItem("carnet-rate") || "null");
          if (saved?.rt && !annule) setRate(saved.rt);
        } catch {}
      }
    })();
    return () => { annule = true; };
  }, []);

  const majMxn = (v) => {
    setMxn(v);
    setEuro(v === "" || isNaN(Number(v.replace(",", "."))) ? "" : (Number(v.replace(",", ".")) / rate).toFixed(2));
  };
  const majEuro = (v) => {
    setEuro(v);
    setMxn(v === "" || isNaN(Number(v.replace(",", "."))) ? "" : (Number(v.replace(",", ".")) * rate).toFixed(2));
  };

  return (
    <section className="ac-part">
      <div className="ac-bloc-tete">
        <h2>Convertir</h2>
        <span className="ac-taux">1 € = {rate.toFixed(2)} MXN{live ? "" : " (dernier connu)"}</span>
      </div>
      <div className="ac-change">
        <label>
          <span>Pesos</span>
          <input className="input" type="text" inputMode="decimal" placeholder="0" value={mxn} onChange={(e) => majMxn(e.target.value)} />
        </label>
        <span className="ac-egal">=</span>
        <label>
          <span>Euros</span>
          <input className="input" type="text" inputMode="decimal" placeholder="0" value={euro} onChange={(e) => majEuro(e.target.value)} />
        </label>
      </div>
    </section>
  );
}

/* ---------- Météo ---------- */
function Meteo({ lieu }) {
  const [m, setM] = useState(null);
  const [pos, setPos] = useState(null);

  // La position du dernier post publié peut être à des centaines de kilomètres
  // de là où l'on se trouve : on demande d'abord la vraie position à l'appareil,
  // et le dernier post ne sert que de repli.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { maximumAge: 30 * 60 * 1000, timeout: 6000 }
    );
  }, []);

  const ici = pos || lieu;

  useEffect(() => {
    if (!ici) return;
    let annule = false;
    fetchMeteoJour(ici.lat, ici.lng).then((d) => { if (!annule) setM(d); });
    return () => { annule = true; };
  }, [ici?.lat, ici?.lng]);

  if (!m || !ici) return <div className="ac-meteo ac-meteo-vide" />;
  const info = meteoInfo(m.code);
  const detail = `https://weather.com/fr-FR/temps/aujour/l/${ici.lat.toFixed(3)},${ici.lng.toFixed(3)}`;

  return (
    <a className="ac-meteo" href={detail} target="_blank" rel="noopener noreferrer">
      <div className="ac-meteo-haut">
        <span className="ac-meteo-ic">{info.emoji}</span>
        <span>
          <span className="ac-meteo-t">{m.t}°</span>
          <span className="ac-meteo-l">
            {info.label}
            {m.tmin != null && ` · ${m.tmin}° la nuit`}
          </span>
        </span>
        <span className="ac-meteo-plus">détail ↗</span>
      </div>
      {m.heures.length > 0 && (
        <div className="ac-heures">
          {m.heures.map((h) => (
            <span key={h.h} className="ac-heure">
              <b>{String(h.h).padStart(2, "0")}h</b>
              <span>{meteoInfo(h.code).emoji}</span>
              <u>{h.t}°</u>
            </span>
          ))}
        </div>
      )}
    </a>
  );
}

/* ---------- Les derniers outils ouverts, en icônes seules ---------- */
function BandeOutils() {
  const [outils, setOutils] = useState([]);
  // L'historique vit dans le navigateur : on le lit après le montage pour que le
  // rendu serveur et le rendu client partent du même état.
  // Cinq, comme les cinq colonnes de la bande : en demander six la faisait
  // repasser sur une deuxième ligne et l'accueil ne tenait plus sur un écran.
  useEffect(() => { setOutils(derniersOutils(5)); }, []);
  if (outils.length === 0) return null;

  return (
    <nav className="ac-bande" aria-label="Derniers outils ouverts">
      {outils.map((o) => (
        <Link key={o.href} href={o.href} className="ac-bande-item">
          <span className="ac-bande-ic">{o.ic}</span>
          <span className="ac-bande-lab">{o.label}</span>
        </Link>
      ))}
    </nav>
  );
}
