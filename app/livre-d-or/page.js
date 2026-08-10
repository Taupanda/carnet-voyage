"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../AuthProvider";
import { supabaseBrowser } from "../../lib/supabaseClient";
import { Avatar, attachProfiles } from "../Social";

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function LivreDor() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const isAdmin = !!user?.email && user.email.toLowerCase() === ADMIN_EMAIL;

  const [publics, setPublics] = useState([]);
  const [privs, setPrivs] = useState([]);
  const [text, setText] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const { data } = await sb.from("messages").select("*").eq("public", true).order("created_at", { ascending: false });
    setPublics(await attachProfiles(sb, data || []));
    if (isAdmin) {
      const { data: sess } = await sb.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch("/api/inbox", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.ok) { const all = await res.json(); setPrivs(all.filter((m) => !m.public)); }
    }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  async function send() {
    if (!user) return router.push("/connexion");
    if (!text.trim()) return;
    setBusy(true);
    const { error } = await supabaseBrowser().from("messages").insert({ user_id: user.id, contenu: text.trim(), public: isPublic });
    setBusy(false);
    if (!error) { setText(""); setDone(true); setTimeout(() => setDone(false), 2500); load(); }
  }

  async function markRead(id) {
    const sb = supabaseBrowser();
    const { data: sess } = await sb.auth.getSession();
    const token = sess.session?.access_token;
    await fetch("/api/inbox", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ id }) });
    setPrivs((ms) => ms.map((m) => (m.id === id ? { ...m, lu: true } : m)));
  }

  async function delMsg(id) {
    if (!confirm("Supprimer ce message ?")) return;
    const sb = supabaseBrowser();
    const { data: sess } = await sb.auth.getSession();
    const token = sess.session?.access_token;
    await fetch("/api/moderate", { method: "DELETE", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ table: "messages", id }) });
    setPublics((ms) => ms.filter((m) => m.id !== id));
    setPrivs((ms) => ms.filter((m) => m.id !== id));
  }

  return (
    <main className="container" style={{ paddingTop: 30, paddingBottom: 70, maxWidth: 640 }}>
      <p className="eyebrow">Un mot pour la route</p>
      <h1 className="display" style={{ fontSize: "clamp(26px, 5vw, 40px)", margin: "8px 0 8px" }}>Livre d'or</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 22 }}>
        Laisse un message. Public, il s'affiche ici pour tous ; privé, lui seul le lira.
      </p>

      {/* composer */}
      <div className="budget-card" style={{ marginBottom: 24 }}>
        {done ? (
          <p className="info">C'est envoyé, merci 💛</p>
        ) : (
          <>
            <textarea className="input" rows={3} placeholder={user ? "Ton mot…" : "Connecte-toi pour écrire un mot."} value={text} onChange={(e) => setText(e.target.value)} disabled={!user} style={{ marginBottom: 10 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div className="filters" style={{ margin: 0 }}>
                <button className={"filter" + (isPublic ? " on" : "")} onClick={() => setIsPublic(true)}>💛 Public</button>
                <button className={"filter" + (!isPublic ? " on" : "")} onClick={() => setIsPublic(false)}>🔒 Privé</button>
              </div>
              {user ? (
                <button className="btn" style={{ marginLeft: "auto" }} onClick={send} disabled={busy || !text.trim()}>{busy ? "…" : "Envoyer"}</button>
              ) : (
                <button className="btn" style={{ marginLeft: "auto" }} onClick={() => router.push("/connexion")}>Se connecter</button>
              )}
            </div>
          </>
        )}
      </div>

      {/* messages publics */}
      {publics.length === 0 ? (
        <p className="empty">Sois le premier à laisser un mot.</p>
      ) : (
        publics.map((m) => (
          <div key={m.id} className="pm">
            <div className="pm-head">
              <Avatar p={m.profiles} />
              <b>{m.profiles?.prenom || "Quelqu'un"} {m.profiles?.nom || ""}</b>
              <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>{timeAgo(m.created_at)}</span>
              {isAdmin && <button className="cmt-del" onClick={() => delMsg(m.id)} aria-label="Supprimer">✕</button>}
            </div>
            <p style={{ color: "var(--ink2)", fontSize: 14.5, marginTop: 6, whiteSpace: "pre-wrap" }}>{m.contenu}</p>
          </div>
        ))
      )}

      {/* mots privés (admin) */}
      {isAdmin && privs.length > 0 && (
        <div style={{ marginTop: 30, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
          <div className="aside-head" style={{ marginBottom: 10 }}>🔒 Mots privés ({privs.filter((m) => !m.lu).length} non lus)</div>
          {privs.map((m) => (
            <div key={m.id} className="pm" style={{ opacity: m.lu ? 0.6 : 1 }}>
              <div className="pm-head">
                <Avatar p={m.profiles} />
                <b>{m.profiles?.prenom || "Quelqu'un"} {m.profiles?.nom || ""}</b>
                <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>{timeAgo(m.created_at)}</span>
              </div>
              <p style={{ color: "var(--ink2)", fontSize: 14.5, marginTop: 6, whiteSpace: "pre-wrap" }}>{m.contenu}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {!m.lu && <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => markRead(m.id)}>Marquer comme lu</button>}
                <button className="btn-danger" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => delMsg(m.id)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
