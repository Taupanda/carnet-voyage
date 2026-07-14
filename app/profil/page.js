"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../AuthProvider";
import { supabaseBrowser } from "../../lib/supabaseClient";

export default function Profil() {
  const { user, profile, loading, refresh } = useAuth();
  const router = useRouter();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setPrenom(profile.prenom || "");
      setNom(profile.nom || "");
      setAvatar(profile.avatar_url || null);
    }
  }, [profile]);



  async function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setBusy(true);
    const sb = supabaseBrowser();
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = sb.storage.from("avatars").getPublicUrl(path);
      setAvatar(data.publicUrl);
    } else {
      setMsg("Échec de l'envoi de la photo.");
    }
    setBusy(false);
  }

  async function save() {
    if (!prenom.trim()) {
      setMsg("Ton prénom est nécessaire.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const sb = supabaseBrowser();
    const { error } = await sb.from("profiles").upsert({
      id: user.id,
      prenom: prenom.trim(),
      nom: nom.trim(),
      avatar_url: avatar,
    });
    setBusy(false);
    if (error) setMsg("Échec : " + error.message);
    else {
      setMsg("Profil enregistré.");
      refresh();
      setTimeout(() => router.push("/"), 800);
    }
  }

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 40 }}>
        <p className="empty">Chargement de ton profil…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="container" style={{ paddingTop: 60, maxWidth: 420, textAlign: "center" }}>
        <p style={{ color: "var(--text2)", marginBottom: 16 }}>Tu n'es pas connecté.</p>
        <a href="/connexion" className="btn" style={{ display: "inline-block", textDecoration: "none" }}>Se connecter</a>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 30, paddingBottom: 60, maxWidth: 460 }}>
      <p className="eyebrow">Ton profil</p>
      <h1 className="display" style={{ fontSize: 30, margin: "8px 0 22px" }}>Qui es-tu ?</h1>

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
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadAvatar} />
        </div>
      </div>

      <label className="lbl">Prénom</label>
      <input className="input" value={prenom} onChange={(e) => setPrenom(e.target.value)} style={{ marginBottom: 14 }} />

      <label className="lbl">Nom</label>
      <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} style={{ marginBottom: 18 }} />

      {msg && <p className="error" style={{ marginBottom: 14 }}>{msg}</p>}

      <button className="btn" onClick={save} disabled={busy} style={{ width: "100%" }}>
        {busy ? "…" : "Enregistrer"}
      </button>

      <p className="mono" style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 16, textAlign: "center" }}>
        {user.email}
      </p>

      <button
        className="btn-secondary"
        style={{ width: "100%", marginTop: 20, color: "var(--stage-2)", borderColor: "var(--stage-2)" }}
        onClick={async () => {
          const { supabaseBrowser } = await import("../../lib/supabaseClient");
          await supabaseBrowser().auth.signOut();
          window.location.href = "/";
        }}
      >
        Se déconnecter
      </button>
    </main>
  );
}
