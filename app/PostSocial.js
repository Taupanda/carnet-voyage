"use client";
import { useState } from "react";
import Social from "./Social";
import { supabaseBrowser } from "../lib/supabaseClient";

export default function PostSocial({ entryDate }) {
  const [askLogin, setAskLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function sendLink() {
    if (!email.includes("@")) { setErr("Entre une adresse email valide."); return; }
    setBusy(true); setErr(null);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/profil` },
    });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  }

  return (
    <>
      <Social entryDate={entryDate} onNeedLogin={() => setAskLogin(true)} />
      {askLogin && (
        <div className="lb" onClick={() => setAskLogin(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="lb-close" onClick={() => setAskLogin(false)}>✕</button>
            {sent ? (
              <>
                <h3 className="display" style={{ fontSize: 22, marginBottom: 10 }}>Regarde tes mails</h3>
                <p style={{ color: "var(--text2)", fontSize: 14.5 }}>
                  Un lien de connexion part vers <b>{email}</b>.
                </p>
              </>
            ) : (
              <>
                <h3 className="display" style={{ fontSize: 22, marginBottom: 6 }}>Rejoindre le carnet</h3>
                <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 16 }}>
                  Pas de mot de passe : un email, un lien, et c'est fait.
                </p>
                <input className="input" type="email" placeholder="ton@email.fr" value={email}
                  onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendLink()} />
                {err && <p className="error" style={{ marginTop: 10 }}>{err}</p>}
                <button className="btn" style={{ marginTop: 14, width: "100%" }} onClick={sendLink} disabled={busy}>
                  {busy ? "Envoi…" : "Recevoir mon lien"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
