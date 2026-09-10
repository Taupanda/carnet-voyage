"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AdminGate from "../AdminGate";
import { supabaseBrowser } from "../../lib/supabaseClient";
import { STAGES, stageForDate, todayLocal, TRIP_END } from "../../lib/stages";

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

const decale = (dateStr, n) =>
  new Date(new Date(dateStr + "T00:00:00").getTime() + n * 86400000).toISOString().slice(0, 10);

const FENETRES = [
  { jours: 7, label: "7 jours" },
  { jours: 14, label: "14 jours" },
  { jours: 30, label: "30 jours" },
];

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
  const [fenetre, setFenetre] = useState(14);
  const [err, setErr] = useState(null);
  const [enCours, setEnCours] = useState(null); // date en cours d'écriture

  const debut = todayLocal();
  // On ne planifie pas au-delà de la fin du voyage.
  const fin = useMemo(() => {
    const brut = decale(debut, fenetre - 1);
    return brut > TRIP_END ? TRIP_END : brut;
  }, [debut, fenetre]);

  const jours = useMemo(() => {
    const out = [];
    for (let d = debut; d <= fin; d = decale(d, 1)) out.push(d);
    return out;
  }, [debut, fin]);

  async function load() {
    const res = await api(`/api/planning?debut=${debut}&fin=${decale(debut, 60)}`);
    if (!res.ok) { setErr("Chargement impossible : " + (await motifEchec(res))); setLoaded(true); return; }
    const rows = await res.json();
    setPlans(Object.fromEntries(rows.map((r) => [r.date, r])));
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

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

  const remplis = jours.filter((d) => plans[d]?.activite?.trim()).length;
  const fixes = jours.filter((d) => plans[d]?.fixe).length;
  const aCaler = jours.length - remplis;

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 70, maxWidth: 760 }}>
      <Link href="/atelier" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>← Menu</Link>
      <h1 className="display" style={{ fontSize: "clamp(26px, 4vw, 38px)", margin: "10px 0 4px" }}>Planning</h1>
      <p style={{ color: "var(--ink2)", marginBottom: 18 }}>
        Les jours à venir, un par ligne. Épingle ce qui est déjà fixé — vol, hôtel réservé,
        rendez-vous — et cale le reste autour.
      </p>

      <div className="plan-stats">
        <div><b>{aCaler}</b><span>à caler</span></div>
        <div><b>{remplis}</b><span>posés</span></div>
        <div><b>{fixes}</b><span>fixes 📌</span></div>
      </div>

      <div className="filters" style={{ marginTop: 18 }}>
        {FENETRES.map((f) => (
          <button key={f.jours} className={"filter" + (fenetre === f.jours ? " on" : "")} onClick={() => setFenetre(f.jours)}>
            {f.label}
          </button>
        ))}
      </div>

      {err && <p className="error" style={{ marginBottom: 12 }}>{err}</p>}

      {!loaded ? (
        <p className="empty">Chargement…</p>
      ) : jours.length === 0 ? (
        <p className="empty">Le voyage est terminé — plus rien à planifier.</p>
      ) : (
        <div className="plan-liste">
          {jours.map((d) => {
            const ligne = plans[d] || {};
            const etape = stageForDate(d);
            const dt = new Date(d + "T00:00:00");
            const jourSem = dt.toLocaleDateString("fr-FR", { weekday: "short" });
            const jourNum = dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
            const weekend = [0, 6].includes(dt.getDay());
            const vide = !ligne.activite?.trim();
            return (
              <div
                key={d}
                className={"plan-jour" + (ligne.fixe ? " fixe" : "") + (vide ? " vide" : "")}
                style={{ "--etape": etape?.couleur || "var(--line2)" }}
              >
                <div className="plan-date">
                  <span className={"plan-jsem" + (weekend ? " we" : "")}>{jourSem}</span>
                  <span className="plan-jnum">{jourNum}</span>
                  {etape && <span className="plan-etape" title={etape.nom}>{etape.nom}</span>}
                </div>

                <div className="plan-corps">
                  <input
                    className="input plan-activite"
                    placeholder={d === debut ? "Aujourd'hui — quoi ?" : "À caler…"}
                    defaultValue={ligne.activite || ""}
                    onBlur={(e) => {
                      if ((e.target.value || "") !== (ligne.activite || "")) enregistrer(d, { activite: e.target.value });
                    }}
                  />
                  <input
                    className="input plan-lieu"
                    placeholder="Lieu"
                    defaultValue={ligne.lieu || ""}
                    onBlur={(e) => {
                      if ((e.target.value || "") !== (ligne.lieu || "")) enregistrer(d, { lieu: e.target.value });
                    }}
                  />
                </div>

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
            );
          })}
        </div>
      )}

      <p className="plan-note">
        Les 12 étapes du voyage restent la trame de fond — elles s'affichent à gauche de chaque
        journée. Ce planning ne note que tes ajustements réels.
      </p>
    </main>
  );
}
