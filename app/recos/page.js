"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../AuthProvider";
import { supabaseBrowser } from "../../lib/supabaseClient";
import { STAGES, todayLocal } from "../../lib/stages";
import { Avatar, attachProfiles } from "../Social";

const CATS = [
  { id: "visite", label: "Visites & expériences", emoji: "🏛️" },
  { id: "resto", label: "Restaurants & hôtels", emoji: "🍽️" },
  { id: "musique", label: "Musique", emoji: "🎵" },
  { id: "livre", label: "Livres", emoji: "📚" },
];

export default function Recos() {
  const { user } = useAuth();
  const [recos, setRecos] = useState([]);
  const [filter, setFilter] = useState(null); // null = tout
  const [titre, setTitre] = useState("");
  const [desc, setDesc] = useState("");
  const [stage, setStage] = useState("");
  const [cat, setCat] = useState("visite");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const { data, error } = await sb.from("recos").select("*").order("created_at", { ascending: false });
    if (error) { setMsg("Lecture impossible : " + error.message); return; }
    setRecos(await attachProfiles(sb, data));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!titre.trim()) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabaseBrowser().from("recos").insert({
      user_id: user.id,
      categorie: cat,
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
  const list = filter ? recos.filter((r) => (r.categorie || "visite") === filter) : recos;
  const countBy = (id) => recos.filter((r) => (r.categorie || "visite") === id).length;

  return (
    <main className="container" style={{ paddingTop: 30, paddingBottom: 70 }}>
      <p className="eyebrow">{recos.length} suggestion{recos.length > 1 ? "s" : ""}</p>
      <h1 className="display" style={{ fontSize: "clamp(26px, 5vw, 38px)", margin: "8px 0 8px" }}>
        Vos conseils
      </h1>
      <p style={{ color: "var(--text2)", marginBottom: 22, maxWidth: 480 }}>
        Un lieu à voir, une table, un album pour la route, un livre pour les bus de nuit — dis-le-moi avant que je passe.
      </p>

      {/* ---- formulaire ---- */}
      {user ? (
        <div className="reco-form">
          <div className="cat-picker">
            {CATS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={"cat-option" + (cat === c.id ? " on" : "")}
                onClick={() => setCat(c.id)}
              >
                <span className="cat-emoji">{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
          <input className="input" placeholder={
            cat === "musique" ? "Artiste, album ou morceau" :
            cat === "livre" ? "Titre du livre" :
            cat === "resto" ? "Nom du restaurant ou de l'hôtel" :
            "Le lieu ou l'activité"
          } value={titre} onChange={(e) => setTitre(e.target.value)} />
          <textarea className="input" rows={2} placeholder="Pourquoi ? (facultatif)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          {(cat === "visite" || cat === "resto") && (
            <select className="input" value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">Pour quelle étape ? (facultatif)</option>
              {upcoming.map((s) => (
                <option key={s.n} value={s.n}>{String(s.n).padStart(2, "0")} — {s.nom}</option>
              ))}
            </select>
          )}
          {msg && <p className="error">{msg}</p>}
          <button className="btn" onClick={submit} disabled={busy || !titre.trim()}>
            {busy ? "…" : "Envoyer ma suggestion"}
          </button>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "30px 20px", background: "var(--ink2)", border: "1px solid var(--line)", borderRadius: 14 }}>
          <p style={{ color: "var(--text2)", marginBottom: 14 }}>Connecte-toi pour proposer quelque chose.</p>
          <Link href="/connexion" className="btn" style={{ display: "inline-block", textDecoration: "none" }}>Se connecter</Link>
        </div>
      )}

      {/* ---- filtres par catégorie ---- */}
      <div className="filters" style={{ marginTop: 30 }}>
        <button className={"filter" + (filter === null ? " on" : "")}
          style={filter === null ? { background: "var(--text)", borderColor: "var(--text)" } : {}}
          onClick={() => setFilter(null)}>
          Tout ({recos.length})
        </button>
        {CATS.map((c) => (
          <button key={c.id} className={"filter" + (filter === c.id ? " on" : "")}
            style={filter === c.id ? { background: "var(--stage)", borderColor: "var(--stage)" } : {}}
            onClick={() => setFilter(c.id)}>
            {c.emoji} {c.label} ({countBy(c.id)})
          </button>
        ))}
      </div>

      {/* ---- liste ---- */}
      <div style={{ marginTop: 20 }}>
        {list.length === 0 && <p className="empty">Rien dans cette catégorie pour l'instant.</p>}
        {list.map((r) => {
          const s = STAGES.find((x) => x.n === r.stage);
          const catInfo = CATS.find((c) => c.id === (r.categorie || "visite"));
          const color = s?.couleur || "var(--stage)";
          return (
            <div key={r.id} className="reco" style={{ "--c": color }}>
              <div className="reco-head">
                <Avatar p={r.profiles} />
                <span className="mono reco-by">{r.profiles?.prenom || "Quelqu'un"} {r.profiles?.nom || ""}</span>
                <span className="chip" style={{ marginLeft: "auto" }}>{catInfo?.emoji} {catInfo?.label}</span>
                {s && <span className="chip" style={{ borderColor: color, color }}>{s.nom}</span>}
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
