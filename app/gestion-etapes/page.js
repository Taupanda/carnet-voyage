"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminGate from "../AdminGate";
import { useCalendrier } from "../EtapesProvider";
import { DEPART, lendemain, stageDays, fmtDate, todayLocal, erreursEtapes } from "../../lib/stages";
import { appelApi } from "../../lib/jeton";

export default function GestionEtapes() {
  return (
    <AdminGate>
      <GestionEtapesBody />
    </AdminGate>
  );
}

// On ne saisit que la fin de chaque étape : le début de la suivante en découle,
// ce qui rend les trous et les chevauchements impossibles par construction.
// Seule erreur encore possible : une étape poussée à finir avant de commencer.
function GestionEtapesBody() {
  const router = useRouter();
  const { STAGES } = useCalendrier();
  const [noms, setNoms] = useState(() => STAGES.map((s) => s.nom));
  const [fins, setFins] = useState(() => STAGES.map((s) => s.fin));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(false);

  const etapes = useMemo(
    () => STAGES.map((s, i) => ({ ...s, nom: noms[i], debut: i ? lendemain(fins[i - 1]) : DEPART, fin: fins[i] })),
    [STAGES, noms, fins]
  );
  const erreurs = erreursEtapes(etapes);
  const modifie = etapes.some((s, i) => s.nom.trim() !== STAGES[i].nom || s.fin !== STAGES[i].fin);
  const aujourdhui = todayLocal();

  function changer(setter, i, v) {
    setter((liste) => liste.map((x, j) => (j === i ? v : x)));
    setOk(false);
    setErr(null);
  }

  function annuler() {
    setNoms(STAGES.map((s) => s.nom));
    setFins(STAGES.map((s) => s.fin));
    setErr(null);
  }

  async function enregistrer() {
    setBusy(true);
    setErr(null);
    const res = await appelApi("/api/etapes", {
      method: "POST",
      body: JSON.stringify({ etapes: etapes.map(({ nom, debut, fin }) => ({ nom: nom.trim(), debut, fin })) }),
    });
    setBusy(false);
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      setErr(res.status === 401 ? "session admin non reconnue, reconnecte-toi" : detail?.error || `erreur ${res.status}`);
      return;
    }
    setOk(true);
    // Recharge les étapes lues par la mise en page : tout le site suit.
    router.refresh();
  }

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 70, maxWidth: 640 }}>
      <Link href="/atelier" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>← Menu</Link>
      <h1 className="display" style={{ fontSize: "clamp(24px, 4vw, 34px)", margin: "10px 0 6px" }}>Étapes</h1>
      <p style={{ color: "var(--ink2)", fontSize: 14, margin: "0 0 18px", lineHeight: 1.5 }}>
        Déplacer la fin d'une étape décale le début de la suivante. Le départ du {fmtDate(DEPART)} ne bouge
        pas : les numéros de jour des posts publiés en dépendent.
      </p>

      <div className="etapes-liste">
        {etapes.map((s, i) => {
          const invalide = s.fin < s.debut || !s.nom.trim();
          const enCours = aujourdhui >= s.debut && aujourdhui <= s.fin;
          return (
            <div key={s.n} className={"etape-ligne" + (invalide ? " invalide" : "")} style={{ "--c": s.couleur }}>
              <span className="etape-n">{s.n}</span>
              <div className="etape-corps">
                <div className="etape-haut">
                  <input
                    className="input etape-nom"
                    value={s.nom}
                    onChange={(e) => changer(setNoms, i, e.target.value)}
                    aria-label={`Nom de l'étape ${s.n}`}
                  />
                  {enCours && <span className="etape-badge">en cours</span>}
                </div>
                <div className="etape-dates">
                  <span className="mono">du {fmtDate(s.debut)} au</span>
                  <input
                    className="input etape-fin"
                    type="date"
                    value={s.fin}
                    min={s.debut}
                    onChange={(e) => e.target.value && changer(setFins, i, e.target.value)}
                    aria-label={`Fin de l'étape ${s.n}`}
                  />
                  <span className="mono etape-jours">{s.fin < s.debut ? "invalide" : `${stageDays(s)} j`}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mono" style={{ fontSize: 12, color: "var(--muted)", margin: "14px 0 0" }}>
        {fmtDate(etapes[0].debut)} → {fmtDate(etapes[etapes.length - 1].fin)} ·{" "}
        {stageDays({ debut: etapes[0].debut, fin: etapes[etapes.length - 1].fin })} jours
      </p>

      {erreurs.length > 0 && <p className="error" style={{ marginTop: 10 }}>{erreurs.join(" · ")}</p>}
      {err && <p className="error" style={{ marginTop: 10 }}>{err}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="btn" style={{ flex: 1 }} onClick={enregistrer} disabled={busy || !modifie || erreurs.length > 0}>
          {busy ? "…" : ok && !modifie ? "Enregistré ✓" : "Enregistrer"}
        </button>
        {modifie && (
          <button className="btn-secondary" onClick={annuler} disabled={busy}>Annuler</button>
        )}
      </div>
    </main>
  );
}
