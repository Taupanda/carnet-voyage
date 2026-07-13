"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthProvider";
import { supabaseBrowser } from "../lib/supabaseClient";

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

function Avatar({ p, size = 30 }) {
  const initial = (p?.prenom || "?")[0]?.toUpperCase();
  if (p?.avatar_url)
    return <img src={p.avatar_url} alt="" className="avatar" style={{ width: size, height: size }} />;
  return (
    <span className="avatar avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {initial}
    </span>
  );
}

export default function Social({ entryDate, onNeedLogin }) {
  const { user, profile } = useAuth();
  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [openC, setOpenC] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const [likeRes, cmtRes] = await Promise.all([
      sb.from("likes").select("user_id").eq("entry_date", entryDate),
      sb
        .from("comments")
        .select("id, contenu, created_at, user_id, profiles(prenom, nom, avatar_url)")
        .eq("entry_date", entryDate)
        .order("created_at", { ascending: true }),
    ]);
    if (cmtRes.error) setErr("Commentaires indisponibles : " + cmtRes.error.message);
    setLikes(likeRes.data || []);
    setComments(cmtRes.data || []);
  }, [entryDate]);

  useEffect(() => {
    load();
  }, [load]);

  const liked = user && likes.some((l) => l.user_id === user.id);

  async function toggleLike() {
    if (!user) return onNeedLogin();
    const sb = supabaseBrowser();
    if (liked) {
      setLikes((ls) => ls.filter((l) => l.user_id !== user.id));
      await sb.from("likes").delete().eq("entry_date", entryDate).eq("user_id", user.id);
    } else {
      setLikes((ls) => [...ls, { user_id: user.id }]);
      await sb.from("likes").insert({ entry_date: entryDate, user_id: user.id });
    }
  }

  async function postComment() {
    if (!user) return onNeedLogin();
    if (!text.trim()) return;
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb.from("comments").insert({
      entry_date: entryDate,
      user_id: user.id,
      contenu: text.trim(),
    });
    setBusy(false);
    if (error) setErr("Échec : " + error.message);
    else {
      setErr(null);
      setText("");
      load();
    }
  }

  async function delComment(id) {
    const sb = supabaseBrowser();
    await sb.from("comments").delete().eq("id", id);
    load();
  }

  return (
    <div className="social">
      <div className="social-actions">
        <button className={"like-btn" + (liked ? " on" : "")} onClick={toggleLike} aria-pressed={liked}>
          <span className="like-heart">{liked ? "♥" : "♡"}</span>
          {likes.length > 0 && <span className="mono">{likes.length}</span>}
        </button>
        <button className="cmt-btn" onClick={() => setOpenC((o) => !o)}>
          <span>💬</span>
          {comments.length > 0 && <span className="mono">{comments.length}</span>}
          <span className="cmt-label">{comments.length === 0 ? "Commenter" : ""}</span>
        </button>
      </div>

      {openC && (
        <div className="cmt-zone">
          {err && <p className="error">{err}</p>}
          {comments.map((c) => (
            <div key={c.id} className="cmt">
              <Avatar p={c.profiles} />
              <div className="cmt-body">
                <div className="cmt-head">
                  <b>{c.profiles?.prenom} {c.profiles?.nom}</b>
                  <span className="mono cmt-time">{timeAgo(c.created_at)}</span>
                  {user?.id === c.user_id && (
                    <button className="cmt-del" onClick={() => delComment(c.id)} aria-label="Supprimer">✕</button>
                  )}
                </div>
                <p>{c.contenu}</p>
              </div>
            </div>
          ))}

          {user ? (
            <div className="cmt-form">
              <Avatar p={profile} />
              <input
                className="input"
                placeholder="Écrire un commentaire…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && postComment()}
              />
              <button className="btn" onClick={postComment} disabled={busy || !text.trim()} style={{ padding: "10px 16px" }}>
                Envoyer
              </button>
            </div>
          ) : (
            <button className="btn-secondary" style={{ width: "100%" }} onClick={onNeedLogin}>
              Se connecter pour commenter
            </button>
          )}
        </div>
      )}
    </div>
  );
}
