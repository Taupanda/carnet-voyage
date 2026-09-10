"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AdminGate from "../AdminGate";
import { supabaseBrowser } from "../../lib/supabaseClient";
import { STAGES, stageForDate, todayLocal, TRIP_START, TRIP_END, TRIP_DATES } from "../../lib/stages";

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

// Le voyage entier, du départ au dernier jour : on ne masque rien, on se
// contente d'amener la vue sur aujourd'hui à l'ouverture.
const TOUS_LES_JOURS = (() => {
  const out = [];
  for (let i = 0; i < TRIP_DATES; i++) {
    out.push(new Date(new Date(TRIP_START + "T00:00:00").getTime() + i * 86400000).toISOString().slice(0, 10));
  }
  return out;
})();

export default function Planning() {
  return (
    <AdminGate>
      <PlanningBody />
    </AdminGate>
  );
}

function PlanningBody() {
  const [plans, setPlans] = useState({}); // date -> ligne
  const [loaded, setLoaded] = useState(false);
  const [masquerPasse, setMasquerPasse] = useState(false);
  const [err, setErr] = useState(null);
  const [enCours, setEnCours] = useState(null); // date en cours d'écriture

  const aujourdhui = todayLocal();
  const jours = useMemo(
    () => (masquerPasse ? TOUS_LES_JOURS.filter((d) => d >= aujourdhui) : TOUS_LES_JOURS),
    [masquerPasse, aujourdhui]
  );

  async function load() {
    const res = await api(`/api/planning?debut=${TRIP_START}&fin=${TRIP_END}`);
    if (!res.ok) { setErr("Chargement impossible : " + (await motifEchec(res))); setLoaded(true); return; }
    const rows = await res.json();
    setPlans(Object.fromEntries(rows.map((r) => [r.date, r])));
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  // À l'ouverture, la liste est amenée sur la journée en cours : sur 101 lignes,
  // commencer en haut obligerait à faire défiler jusqu'à aujourd'hui à chaque fois.
  useEffect(() => {
    if (!loaded) return;
    const el = document.getElementById(`jour-${aujourdhui}`);
    if (el) el.scrollIntoView({ block: "center" });
  }, [loaded, aujourdhui]);

  // Écriture immédiate à la sortie du champ : pas de bouton Enregistrer à
  // chercher quand on ajuste une journée en vitesse.
  async function enregistrer(date, champs) {
    const avant = plans[date];
    const ligne = { date, activite: "", lieu: "", fixe: false, note: "", ...avant, ...champs };
    setPlans((p) => ({ ...p, [date]: ligne }));
    setEnCours(date);
    setErr(null);
    const res = await api("/api/planning", { method: "POST", body: JSON.stringify(ligne) });
    setEnCours(null);
    if (!res.ok) {
      setErr("Enregistrement refusé : " + (await motifEchec(res)));
      setPlans((p) => ({ ...p, [date]: avant })); // on remet ce qui était en base
      return;
    }
    const maj = await res.json();
    setPlans((p) => ({ ...p, [date]: maj }));
  }

  // Les compteurs ne portent que sur ce qui reste à vivre : ce qui est passé
  // n'est plus à caler.
  const aVenir = TOUS_LES_JOURS.filter((d) => d >= aujourdhui);
  const remplis = aVenir.filter((d) => plans[d]?.activite?.trim()).length;
  const fixes = aVenir.filter((d) => plans[d]?.fixe).length;
  const aCaler = aVenir.length - remplis;

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 70, maxWidth: 760 }}>
      <Link href="/atelier" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>← Menu</Link>
      <h1 className="display" style={{ fontSize: "clamp(24px, 4vw, 32px)", margin: "8px 0 12px" }}>Mon voyage</h1>
      <div className="voyage-bascule">
        <Link href="/itineraire" className={"voyage-onglet" + (false ? " on" : "")}>Itinéraire</Link>
        <Link href="/planning" className={"voyage-onglet" + (true ? " on" : "")}>Planning</Link>
      </div>

      <p style={{ color: "var(--ink2)", marginBottom: 18 }}>
        Les 101 jours du voyage, un par ligne. Épingle ce qui est déjà fixé — vol, hôtel
        réservé, rendez-vous — et cale le reste autour.
      </p>

      <div className="plan-stats">
        <div><b>{aCaler}</b><span>à caler</span></div>
        <div><b>{remplis}</b><span>posés</span></div>
        <div><b>{fixes}</b><span>fixes 📌</span></div>
      </div>

      <div className="filters" style={{ marginTop: 18 }}>
        <button className={"filter" + (!masquerPasse ? " on" : "")} onClick={() => setMasquerPasse(false)}>
          Tout le voyage ({TOUS_LES_JOURS.length} j)
        </button>
        <button className={"filter" + (masquerPasse ? " on" : "")} onClick={() => setMasquerPasse(true)}>
          À partir d'aujourd'hui
        </button>
        <button className="filter" onClick={() => document.getElementById(`jour-${aujourdhui}`)?.scrollIntoView({ block: "center", behavior: "smooth" })}>
          ↓ Aujourd'hui
        </button>
      </div>

      {err && <p className="error" style={{ marginBottom: 12 }}>{err}</p>}

      {!loaded ? (
        <p className="empty">Chargement…</p>
      ) : jours.length === 0 ? (
        <p className="empty">Le voyage est terminé — plus rien à planifier.</p>
      ) : (
        <div className="plan-liste">
          <div className="plan-entete">
            <span>Jour</span>
            <span>Étape prévue</span>
            <span>Ce qui est prévu</span>
            <span />
          </div>
          {jours.map((d, i) => {
            const ligne = plans[d] || {};
            const etape = stageForDate(d);
            const passe = d < aujourdhui;
            const cestAujourdhui = d === aujourdhui;
            const dt = new Date(d + "T00:00:00");
            const jourSem = dt.toLocaleDateString("fr-FR", { weekday: "short" });
            const jourNum = dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
            const weekend = [0, 6].includes(dt.getDay());
            const vide = !ligne.activite?.trim();
            return (
              <div key={d}>
                <div
                  id={`jour-${d}`}
                  className={
                    "plan-jour" + (ligne.fixe ? " fixe" : "") + (vide ? " vide" : "") +
                    (passe ? " passe" : "") + (cestAujourdhui ? " auj" : "")
                  }
                  style={{ "--etape": etape?.couleur || "var(--line2)" }}
                >
                  <div className="plan-date">
                    <span className={"plan-jsem" + (weekend ? " we" : "")}>{jourSem}</span>
                    <span className="plan-jnum">{jourNum}</span>
                  </div>

                  <div className="plan-prevu" title={etape ? `Étape ${etape.n} — ${etape.nom}` : "Hors étapes"}>
                    <span className="plan-puce">{etape?.n ?? ""}</span>
                    <span className="plan-prevu-nom">{etape ? etape.nom : "—"}</span>
                  </div>

                  <input
                    className="input plan-activite"
                    placeholder={cestAujourdhui ? "Aujourd'hui — quoi ?" : "À caler…"}
                    defaultValue={ligne.activite || ""}
                    onBlur={(e) => {
                      if ((e.target.value || "") !== (ligne.activite || "")) enregistrer(d, { activite: e.target.value });
                    }}
                  />

                  <button
                    className={"plan-pin" + (ligne.fixe ? " on" : "")}
                    onClick={() => enregistrer(d, { fixe: !ligne.fixe })}
                    aria-pressed={!!ligne.fixe}
                    title={ligne.fixe ? "Fixé — cliquer pour libérer" : "Marquer comme fixe"}
                    disabled={enCours === d}
                  >
                    📌
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="plan-note">
        La colonne « étape prévue » vient de l'itinéraire de départ, inscrit dans le code.
        La colonne de droite est la tienne : ce que tu comptes vraiment faire ce jour-là.
      </p>
    </main>
  );
}
