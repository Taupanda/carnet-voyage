"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../AuthProvider";
import { supabaseBrowser } from "../../lib/supabaseClient";

export default function Profil() {
  const { user, profile, loading, refresh, signOut } = useAuth();
  const router = useRouter();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [msgOk, setMsgOk] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null);
  const fileRef = useRef(null);

  const firstTime = profile !== undefined && !profile?.prenom;
  const isEmailUser = !!user?.identities?.some((i) => i.provider === "email");
  const isGoogleUser = !!user?.identities?.some((i) => i.provider === "google");

  useEffect(() => {
    if (profile) {
      setPrenom(profile.prenom || "");
      setNom(profile.nom || "");
      setAvatar(profile.avatar_url || null);
    }
  }, [profile]);

  if (loading || (user && profile === undefined)) {
    return (
      <main className="container" style={{ paddingTop: 40 }}>
        <p className="empty">Chargement…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="container" style={{ paddingTop: 60, maxWidth: 420, textAlign: "center" }}>
        <p style={{ color: "var(--text2)", marginBottom: 16 }}>Tu n'es pas connecté.</p>
        <Link href="/connexion" className="btn" style={{ display: "inline-block", textDecoration: "none" }}>
          Se connecter
        </Link>
      </main>
    );
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    const sb = supabaseBrowser();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { setMsg("Photo refusée : " + error.message); setMsgOk(false); }
    else {
      const { data } = sb.storage.from("avatars").getPublicUrl(path);
      setAvatar(data.publicUrl);
    }
    setBusy(false);
  }

  async function save() {
    if (!prenom.trim()) { setMsg("Ton prénom est nécessaire."); setMsgOk(false); return; }
    setBusy(true);
    setMsg(null);
    const { error } = await supabaseBrowser().from("profiles").upsert({
      id: user.id,
      prenom: prenom.trim(),
      nom: nom.trim() || null,
      avatar_url: avatar,
    });
    setBusy(false);
    if (error) { setMsg("Échec : " + error.message); setMsgOk(false); return; }
    setMsg("Enregistré !");
    setMsgOk(true);
    await refresh();
    if (firstTime) setTimeout(() => router.push("/"), 700);
  }

  async function changePwd() {
    if (newPwd.length < 6) { setPwdMsg("6 caractères minimum."); return; }
    setPwdBusy(true);
    setPwdMsg(null);
    const { error } = await supabaseBrowser().auth.updateUser({ password: newPwd });
    setPwdBusy(false);
    if (error) setPwdMsg("Échec : " + error.message);
    else { setPwdMsg("Mot de passe mis à jour."); setNewPwd(""); }
  }

  return (
    <main className="container" style={{ paddingTop: 30, paddingBottom: 60, maxWidth: 460 }}>
      <p className="eyebrow">{firstTime ? "Première connexion" : "Ton profil"}</p>
      <h1 className="display" style={{ fontSize: 30, margin: "8px 0 6px" }}>
        {firstTime ? "Bienvenue !" : "Mon profil"}
      </h1>
      {firstTime && (
        <p style={{ color: "var(--text2)", fontSize: 14.5, marginBottom: 22 }}>
          Dis-moi qui tu es — c'est ce que les autres verront à côté de tes commentaires.
        </p>
      )}
      {!firstTime && <div style={{ marginBottom: 22 }} />}

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
        {avatar ? (
          <img src={avatar} alt="" className="avatar" style={{ width: 72, height: 72 }} />
        ) : (
          <span className="avatar avatar-fallback" style={{ width: 72, height: 72, fontSize: 28 }}>
            {(prenom || "?")[0]?.toUpperCase()}
          </span>
        )}
        <div>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
            {avatar ? "Changer la photo" : "Ajouter une photo"}
          </button>
          <p className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 5 }}>FACULTATIF</p>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadAvatar} />
        </div>
      </div>

      <label className="lbl">Prénom</label>
      <input className="input" value={prenom} onChange={(e) => setPrenom(e.target.value)} style={{ marginBottom: 14 }} />

      <label className="lbl">Nom</label>
      <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} style={{ marginBottom: 18 }}
        onKeyDown={(e) => e.key === "Enter" && save()} />

      {msg && <p className={msgOk ? "info" : "error"} style={{ marginBottom: 14 }}>{msg}</p>}

      <button className="btn" onClick={save} disabled={busy} style={{ width: "100%" }}>
        {busy ? "…" : firstTime ? "C'est parti" : "Enregistrer"}
      </button>

      {/* ---- Compte ---- */}
      <div style={{ marginTop: 34, paddingTop: 22, borderTop: "1px solid var(--line)" }}>
        <p className="lbl" style={{ marginBottom: 10 }}>Compte</p>
        <p className="mono" style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
          {user.email}
          {isGoogleUser && " · connecté via Google"}
        </p>

        {isEmailUser ? (
          <>
            <label className="lbl">Nouveau mot de passe</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" type="password" placeholder="6 caractères minimum"
                value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && changePwd()} />
              <button className="btn-secondary" onClick={changePwd} disabled={pwdBusy} style={{ whiteSpace: "nowrap" }}>
                {pwdBusy ? "…" : "Changer"}
              </button>
            </div>
            {pwdMsg && <p className={pwdMsg.startsWith("Échec") ? "error" : "info"} style={{ marginTop: 10 }}>{pwdMsg}</p>}
          </>
        ) : (
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            Connexion gérée par Google — aucun mot de passe à retenir ici.
          </p>
        )}

        <button
          className="btn-secondary"
          style={{ width: "100%", marginTop: 20, color: "var(--stage-2)", borderColor: "var(--stage-2)" }}
          onClick={signOut}
        >
          Se déconnecter
        </button>
      </div>
    </main>
  );
}
