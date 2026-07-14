"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { supabaseBrowser } from "../lib/supabaseClient";

export default function AuthBar() {
  const { user, profile, loading } = useAuth();
  const [menu, setMenu] = useState(false);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    window.location.href = "/";
  }

  if (loading) return <span style={{ width: 30 }} />;

  if (!user) {
    return (
      <Link href="/connexion" className="nav-link" style={{ border: "1px solid var(--line2)" }}>
        Se connecter
      </Link>
    );
  }

  const nom = profile?.prenom || user.email?.split("@")[0] || "?";
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setMenu((m) => !m)}
        style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        aria-label="Mon compte"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="avatar" />
        ) : (
          <span className="avatar avatar-fallback">{nom[0]?.toUpperCase()}</span>
        )}
      </button>
      {menu && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setMenu(false)} />
          <div className="menu">
            <div className="menu-name">{profile?.prenom} {profile?.nom}</div>
            <div className="menu-mail mono">{user.email}</div>
            <Link href="/profil" className="menu-item" onClick={() => setMenu(false)}>Mon profil</Link>
            <button className="menu-item" style={{ color: "var(--stage-2)" }} onClick={signOut}>Se déconnecter</button>
          </div>
        </>
      )}
    </div>
  );
}
