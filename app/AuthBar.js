"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { supabaseBrowser } from "../lib/supabaseClient";

export default function AuthBar() {
  const { user, profile, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function sendLink() {
    if (!email.includes("@")) {
      setErr("Entre une adresse email valide.");
      return;
    }
    setBusy(true);
    setErr(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/profil` },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    window.location.reload();
  }

  if (loading) return <span style={{ width: 32 }} />;

  if (user) {
    const nom = profile?.prenom || user.email.split("@")[0];
    return (
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          aria-label="Mon compte"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="avatar" />
          ) : (
            <span className="avatar avatar-fallback">{nom[0]?.toUpperCase()}</span>
          )}
        </button>
        {open && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setOpen(false)} />
            <div className="menu">
              <div className="menu-name">{profile?.prenom} {profile?.nom}</div>
              <div className="menu-mail mono">{user.email}</div>
              <Link href="/profil" className="menu-item" onClick={() => setOpen(false)}>Mon profil</Link>
              <button className="menu-item" onClick={signOut}>Se déconnecter</button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <button className="nav-link" onClick={() => setOpen(true)} style={{ border: "1px solid var(--line2)", background: "none", cursor: "pointer" }}>
        Se connecter
      </button>
      {open && (
        <div className="lb" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="lb-close" onClick={() => setOpen(false)}>✕</button>
            {sent ? (
              <>
                <h3 className="display" style={{ fontSize: 22, marginBottom: 10 }}>Regarde tes mails</h3>
                <p style={{ color: "var(--text2)", fontSize: 14.5 }}>
                  Un lien de connexion vient de partir vers <b>{email}</b>. Clique dessus et tu seras connecté.
                </p>
              </>
            ) : (
              <>
                <h3 className="display" style={{ fontSize: 22, marginBottom: 6 }}>Rejoindre le carnet</h3>
                <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 16 }}>
                  Pas de mot de passe. Entre ton email, tu recevras un lien pour te connecter.
                </p>
                <input
                  className="input"
                  type="email"
                  placeholder="ton@email.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendLink()}
                />
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
