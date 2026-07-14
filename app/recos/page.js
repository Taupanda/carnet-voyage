"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../AuthProvider";
import { supabaseBrowser } from "../../lib/supabaseClient";
import { STAGES, todayLocal } from "../../lib/stages";
import AuthModal from "../AuthModal";

export default function Recos() {
  const { user, profile } = useAuth();
  const [recos, setRecos] = useState([]);
  const [titre, setTitre] = useState("");
  const [desc, setDesc] = useState("");
  const [stage, setStage] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [ask, setAsk] = useState(false);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const { data, error } = await sb
      .from("recos")
      .select("*, profiles(prenom, nom, avatar_url)")
      .order("created_at", { ascending: false });
    if (error) setMsg("Lecture impossible : " + error.message);
    setRecos(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!titre.trim()) return;
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb.from("recos").insert({
      user_id: user.id,
      stage: stage ? Number(stage) : null,
      titre: titre.trim(),
      description: desc.trim() || null,
    });
    setBusy(false);
    if (error) setMsg("Échec : " + error.message);
    else {
      setTitre(""); setDesc(""); setStage("");
      setMsg("Merci ! C'est noté.");
      load();
      setTimeout(() => setMsg(null), 2500);
    }
  }

  async function del(id) {
    await supabaseBrowser().from("recos").delete().eq("id", id);
    load();
  }

  const today = todayLocal();
  const upcoming = STAGES.filter((s) => s.fin >= today);

  return (
    <main className="container" style={{ paddingTop: 30, paddingBottom: 70 }}>
      <p className="eyebrow">{recos.length} suggestion{recos.length > 1 ? "s" : ""}</p>
      <h1 className="display" style={{ fontSize: "clamp(26px, 5vw, 38px)", margin: "8px 0 8px" }}>
        Où devrais-je aller ?
      </h1>
      <p style={{ color: "var(--text2)", marginBottom: 26, maxWidth: 480 }}>
        Une adresse, un resto, une randonnée, un truc à ne pas rater. Dis-le-moi avant que je passe.
      </p>

      {user ? (
        <div className="reco-form">
          <input className="input" placeholder="Le nom du lieu ou de l'activité" value={titre} onChange={(e) => setTitre(e.target.value)} />
          <textarea className="input" rows={2} placeholder="Pourquoi ? (facultatif)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <select className="input" value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="">Pour quelle étape ? (facultatif)</option>
            {upcoming.map((s) => (
              <option key={s.n} value={s.n}>{String(s.n).padStart(2, "0")} — {s.nom}</option>
            ))}
          </select>
          {msg && <p className="error">{msg}</p>}
          <button className="btn" onClick={submit} disabled={busy || !titre.trim()}>
            {busy ? "…" : "Envoyer ma suggestion"}
          </button>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "30px 20px", background: "var(--ink2)", border: "1px solid var(--line)", borderRadius: 14 }}>
          <p style={{ color: "var(--text2)", marginBottom: 14 }}>Connecte-toi pour proposer une adresse.</p>
          <button className="btn" onClick={() => setAsk(true)}>Se connecter</button>
        </div>
      )}
      {ask && <AuthModal onClose={() => setAsk(false)} />}

      <div style={{ marginTop: 34 }}>
        {recos.map((r) => {
          const s = STAGES.find((x) => x.n === r.stage);
          const c = s?.couleur || "var(--line2)";
          return (
            <div key={r.id} className="reco" style={{ "--c": c }}>
              <div className="reco-head">
                {r.profiles?.avatar_url ? (
                  <img src={r.profiles.avatar_url} alt="" className="avatar" />
                ) : (
                  <span className="avatar avatar-fallback">{(r.profiles?.prenom || "?")[0]?.toUpperCase()}</span>
                )}
                <span className="mono reco-by">{r.profiles?.prenom} {r.profiles?.nom}</span>
                {s && <span className="chip" style={{ borderColor: c, color: c, marginLeft: "auto" }}>{s.nom}</span>}
                {user?.id === r.user_id && (
                  <button className="cmt-del" onClick={() => del(r.id)} aria-label="Supprimer">✕</button>
                )}
              </div>
              <div className="reco-titre">{r.titre}</div>
              {r.description && <p className="reco-desc">{r.description}</p>}
            </div>
          );
        })}
      </div>
    </main>
  );
}
