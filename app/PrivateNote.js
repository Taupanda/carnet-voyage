"use client";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { supabaseBrowser } from "../lib/supabaseClient";

export default function PrivateNote({ onNeedLogin }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    const { error } = await supabaseBrowser()
      .from("messages")
      .insert({ user_id: user.id, contenu: text.trim() });
    setBusy(false);
    if (!error) {
      setText("");
      setDone(true);
      setTimeout(() => { setDone(false); setOpen(false); }, 2000);
    }
  }

  if (!open) {
    return (
      <button
        className="btn-secondary"
        onClick={() => (user ? setOpen(true) : onNeedLogin())}
        style={{ width: "100%" }}
      >
        ✉️ Lui écrire un mot (privé)
      </button>
    );
  }

  return (
    <div className="pm-box">
      <div className="block-head">Un mot rien que pour lui</div>
      {done ? (
        <p style={{ color: "var(--text2)", fontSize: 14.5, padding: "8px 0" }}>
          C'est envoyé. Il le lira depuis la route.
        </p>
      ) : (
        <>
          <textarea
            className="input"
            rows={3}
            placeholder="Personne d'autre ne le verra."
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" onClick={() => setOpen(false)} style={{ flex: 1 }}>Annuler</button>
            <button className="btn" onClick={send} disabled={busy || !text.trim()} style={{ flex: 1 }}>
              {busy ? "…" : "Envoyer"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
