"use client";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { supabaseBrowser } from "../lib/supabaseClient";

/* Bloque l'interaction tant que le prénom n'est pas renseigné.
   S'affiche automatiquement à la première connexion. */
export default function ProfileGate() {
  const { user, profile, loading, refresh } = useAuth();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setPrenom(profile.prenom || "");
      setNom(profile.nom || "");
      setAvatar(profile.avatar_url || null);
    }
  }, [profile]);

  const pathname = usePathname();
  const needsSetup = !loading && user && !profile?.prenom;
  if (!needsSetup || pathname?.startsWith("/journal")) return null;

  async function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    const sb = supabaseBrowser();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) setErr("Photo refusée : " + error.message);
    else {
      const { data } = sb.storage.from("avatars").getPublicUrl(path);
      setAvatar(data.publicUrl);
    }
    setBusy(false);
  }

  async function save() {
    if (!prenom.trim()) {
      setErr("Ton prénom, au minimum.");
      return;
    }
    setBusy(true);
    setErr(null);
    const { error } = await supabaseBrowser()
      .from("profiles")
      .upsert({ id: user.id, prenom: prenom.trim(), nom: nom.trim() || null, avatar_url: avatar });
    setBusy(false);
    if (error) setErr("Échec : " + error.message);
    else refresh();
  }

  return (
    <div className="lb" style={{ alignItems: "flex-start", paddingTop: "8vh", overflowY: "auto" }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="display" style={{ fontSize: 22, marginBottom: 6 }}>Bienvenue</h3>
        <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 20 }}>
          Dis-moi qui tu es, pour que je sache qui commente.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          {avatar ? (
            <img src={avatar} alt="" className="avatar" style={{ width: 60, height: 60 }} />
          ) : (
            <span className="avatar avatar-fallback" style={{ width: 60, height: 60, fontSize: 24 }}>
              {(prenom || "?")[0]?.toUpperCase()}
            </span>
          )}
          <div>
            <button className="btn-secondary" style={{ padding: "9px 14px", fontSize: 13 }} onClick={() => fileRef.current?.click()} disabled={busy}>
              {avatar ? "Changer" : "Ajouter une photo"}
            </button>
            <p className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 5 }}>FACULTATIF</p>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadAvatar} />
          </div>
        </div>

        <label className="lbl">Prénom</label>
        <input className="input" value={prenom} onChange={(e) => setPrenom(e.target.value)} style={{ marginBottom: 12 }} autoFocus />

        <label className="lbl">Nom</label>
        <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} style={{ marginBottom: 16 }}
          onKeyDown={(e) => e.key === "Enter" && save()} />

        {err && <p className="error" style={{ marginBottom: 12 }}>{err}</p>}

        <button className="btn" style={{ width: "100%" }} onClick={save} disabled={busy}>
          {busy ? "…" : "C'est parti"}
        </button>
      </div>
    </div>
  );
}
