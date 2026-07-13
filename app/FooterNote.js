"use client";
import { useState } from "react";
import PrivateNote from "./PrivateNote";
import { supabaseBrowser } from "../lib/supabaseClient";

export default function FooterNote() {
  const [ask, setAsk] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function sendLink() {
    if (!email.includes("@")) return;
    setBusy(true);
    await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/profil` },
    });
    setBusy(false);
    setSent(true);
  }

  return (
    <>
      <PrivateNote onNeedLogin={() => setAsk(true)} />
      {ask && (
        <div className="lb" onClick={() => setAsk(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="lb-close" onClick={() => setAsk(false)}>✕</button>
            {sent ? (
              <p style={{ color: "var(--text2)" }}>Un lien de connexion part vers <b>{email}</b>.</p>
            ) : (
              <>
                <h3 className="display" style={{ fontSize: 20, marginBottom: 12 }}>Se connecter</h3>
                <input className="input" type="email" placeholder="ton@email.fr" value={email}
                  onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendLink()} />
                <button className="btn" style={{ marginTop: 12, width: "100%" }} onClick={sendLink} disabled={busy}>
                  {busy ? "…" : "Recevoir mon lien"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
