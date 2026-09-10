"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AdminGate from "../AdminGate";
import { supabaseBrowser } from "../../lib/supabaseClient";
import { todayLocal, afficheJour, dayNumberOf, stageForDate } from "../../lib/stages";

const CATS = [
  { id: "repas", label: "Repas", ic: "🍽️" },
  { id: "transport", label: "Transport", ic: "🚌" },
  { id: "hebergement", label: "Hébergement", ic: "🛏️" },
  { id: "activites", label: "Activités", ic: "🎯" },
  { id: "sorties", label: "Sorties", ic: "🍸" },
  { id: "autres", label: "Autres", ic: "📦" },
];

const FALLBACK_RATE = 19.5; // 1 € ≈ X MXN, repli hors-ligne

async function api(path, opts = {}) {
  const { data } = await supabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  return fetch(path, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}

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

  const etape = stageForDate(jour);
  const numero = afficheJour(dayNumberOf(jour));
  const dateLongue = new Date(jour + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });

  const aRaconter = etat && etat.postDuJour === null;
  const notes = etat?.notes || [];
  const arrivees = etat ? etat.motsNonLus + etat.conseilsSemaine + etat.commentairesSemaine : 0;

  return (
    <main className="container" style={{ paddingTop: 20, paddingBottom: 24, maxWidth: 620 }}>
      <div className="ac-tete">
        <div>
          <p className="ac-date">{dateLongue}</p>
          <h1 className="ac-jour">
            Jour {numero > 0 ? numero : "—"}
            {etape && <span style={{ color: etape.couleur }}> · {etape.nom}</span>}
          </h1>
        </div>
        {etat && etat.depenseDuJour > 0 && (
          <span className="ac-depense-jour">{eur(etat.depenseDuJour)} € aujourd'hui</span>
        )}
      </div>

      {err && <p className="error" style={{ marginBottom: 14 }}>{err}</p>}

      {/* ---- L'action du soir, mise en avant ---- */}
      <Link href="/journal" className={"ac-raconter" + (aRaconter ? " du" : "")}>
        <span className="ac-raconter-ic">✏️</span>
        <span className="ac-raconter-corps">
          <b>Raconter ma journée</b>
          <span>
            {!etat
              ? "…"
              : etat.postDuJour === "published"
              ? "La journée est publiée."
              : etat.postDuJour === "draft"
              ? "Un brouillon attend d'être publié."
              : notes.length > 0
              ? `${notes.length} note${notes.length > 1 ? "s" : ""} du calepin t'attendent.`
              : "Rien d'écrit pour aujourd'hui."}
          </span>
        </span>
        <span className="ac-raconter-fleche">→</span>
      </Link>

      <NoteRapide jour={jour} notes={notes} onFait={charger} />
      <DepenseRapide jour={jour} onFait={charger} />
      <Convertisseur />

      {/* ---- Ce qui est arrivé ---- */}
      <section className="ac-bloc">
        <div className="ac-bloc-tete">
          <h2>Ce qui est arrivé</h2>
          {arrivees > 0 && <span className="ac-compteur">{arrivees}</span>}
        </div>
        {!etat ? (
          <p className="ac-vide">…</p>
        ) : arrivees === 0 ? (
          <p className="ac-vide">Rien de neuf.</p>
        ) : (
          <div className="ac-arrivees">
            {etat.motsNonLus > 0 && (
              <Link href="/livre-d-or" className="ac-arrivee">
                <b>{etat.motsNonLus}</b> mot{etat.motsNonLus > 1 ? "s" : ""} privé{etat.motsNonLus > 1 ? "s" : ""} non lu{etat.motsNonLus > 1 ? "s" : ""}
              </Link>
            )}
            {etat.conseilsSemaine > 0 && (
              <Link href="/recos" className="ac-arrivee">
                <b>{etat.conseilsSemaine}</b> conseil{etat.conseilsSemaine > 1 ? "s" : ""} cette semaine
              </Link>
            )}
            {etat.commentairesSemaine > 0 && (
              <Link href="/moderation" className="ac-arrivee">
                <b>{etat.commentairesSemaine}</b> commentaire{etat.commentairesSemaine > 1 ? "s" : ""} cette semaine
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

/* ---------- Note rapide : le geste le plus fréquent ---------- */
function NoteRapide({ jour, notes, onFait }) {
  const [texte, setTexte] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const champ = useRef(null);

  async function noter() {
    const t = texte.trim();
    if (!t || busy) return;
    setBusy(true);
    setErr(null);
    const res = await api("/api/notes", { method: "POST", body: JSON.stringify({ date: jour, texte: t }) });
    setBusy(false);
    if (!res.ok) { setErr(await motifEchec(res)); return; }
    setTexte("");
    champ.current?.focus();
    onFait();
  }

  return (
    <section className="ac-bloc">
      <div className="ac-bloc-tete">
        <h2>Noter</h2>
        <Link href="/notes" className="ac-lien">le calepin →</Link>
      </div>
      <div className="cmt-form">
        <input
          ref={champ}
          className="input"
          placeholder="Ce que je veux retenir…"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && noter()}
          disabled={busy}
        />
        <button className="btn" style={{ padding: "10px 16px" }} onClick={noter} disabled={busy || !texte.trim()}>
          {busy ? "…" : "+"}
        </button>
      </div>
      {err && <p className="error" style={{ marginTop: 8 }}>{err}</p>}
      {notes.length > 0 && (
        <p className="ac-apercu">{notes.slice(-2).join(" · ")}</p>
      )}
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
    <section className="ac-bloc">
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
    <section className="ac-bloc">
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
