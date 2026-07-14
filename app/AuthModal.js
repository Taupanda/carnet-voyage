"use client";
import { useState } from "react";
import { supabaseBrowser } from "../lib/supabaseClient";

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState("signin"); // signin | signup | forgot
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState(null);

  async function google() {
    setBusy(true);
    setErr(null);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
    }
  }

  async function submit() {
    setErr(null);
    setInfo(null);

    if (!email.includes("@")) {
      setErr("Entre une adresse email valide.");
      return;
    }

    const sb = supabaseBrowser();
    setBusy(true);

    if (mode === "forgot") {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/profil`,
      });
      setBusy(false);
      if (error) setErr(error.message);
      else setInfo("Un lien de réinitialisation part vers ta boîte mail.");
      return;
    }

    if (pwd.length < 6) {
      setErr("Le mot de passe doit faire au moins 6 caractères.");
      setBusy(false);
      return;
    }

    if (mode === "signup") {
      const { error } = await sb.auth.signUp({
        email,
        password: pwd,
        options: { emailRedirectTo: `${window.location.origin}/profil` },
      });
      setBusy(false);
      if (error) setErr(error.message);
      else setInfo("Compte créé. Vérifie ta boîte mail pour confirmer ton adresse, puis reviens te connecter.");
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password: pwd });
      setBusy(false);
      if (error) {
        setErr(
          error.message.includes("Invalid login")
            ? "Email ou mot de passe incorrect."
            : error.message
        );
      } else {
        onClose();
      }
    }
  }

  const titles = {
    signin: "Se connecter",
    signup: "Créer un compte",
    forgot: "Mot de passe oublié",
  };

  return (
    <div className="lb" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="lb-close" onClick={onClose} aria-label="Fermer">✕</button>

        <h3 className="display" style={{ fontSize: 23, marginBottom: 4 }}>{titles[mode]}</h3>
        <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 20 }}>
          {mode === "forgot"
            ? "On t'envoie un lien pour en choisir un nouveau."
            : "Pour liker, commenter et me souffler des adresses."}
        </p>

        {mode !== "forgot" && (
          <>
            <button className="btn-google" onClick={google} disabled={busy}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.2 5.2C40.9 36.5 44 30.9 44 24c0-1.3-.1-2.4-.4-3.5z"/>
              </svg>
              Continuer avec Google
            </button>

            <div className="sep"><span>ou</span></div>
          </>
        )}

        <label className="lbl">Email</label>
        <input
          className="input"
          type="email"
          autoComplete="email"
          placeholder="ton@email.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        {mode !== "forgot" && (
          <>
            <label className="lbl">Mot de passe</label>
            <input
              className="input"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder={mode === "signup" ? "6 caractères minimum" : "••••••••"}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              style={{ marginBottom: 8 }}
            />
          </>
        )}

        {mode === "signin" && (
          <button className="link-btn" onClick={() => { setMode("forgot"); setErr(null); }}>
            Mot de passe oublié ?
          </button>
        )}

        {err && <p className="error" style={{ marginTop: 12 }}>{err}</p>}
        {info && <p className="info" style={{ marginTop: 12 }}>{info}</p>}

        <button className="btn" style={{ width: "100%", marginTop: 14 }} onClick={submit} disabled={busy}>
          {busy
            ? "…"
            : mode === "signup"
            ? "Créer mon compte"
            : mode === "forgot"
            ? "Envoyer le lien"
            : "Me connecter"}
        </button>

        <div className="switch">
          {mode === "signin" && (
            <>
              Pas encore de compte ?{" "}
              <button className="link-btn" onClick={() => { setMode("signup"); setErr(null); setInfo(null); }}>
                Créer un compte
              </button>
            </>
          )}
          {mode === "signup" && (
            <>
              Déjà un compte ?{" "}
              <button className="link-btn" onClick={() => { setMode("signin"); setErr(null); setInfo(null); }}>
                Se connecter
              </button>
            </>
          )}
          {mode === "forgot" && (
            <button className="link-btn" onClick={() => { setMode("signin"); setErr(null); setInfo(null); }}>
              ← Retour à la connexion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
