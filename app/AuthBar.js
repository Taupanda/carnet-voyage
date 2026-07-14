"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { supabaseBrowser } from "../lib/supabaseClient";
import AuthModal from "./AuthModal";

export default function AuthBar() {
  const { user, profile, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    window.location.reload();
  }

  if (loading) return <span style={{ width: 30 }} />;

  if (user) {
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
              <button className="menu-item" onClick={signOut}>Se déconnecter</button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        className="nav-link"
        onClick={() => setOpen(true)}
        style={{ border: "1px solid var(--line2)", background: "none", cursor: "pointer" }}
      >
        Se connecter
      </button>
      {open && <AuthModal onClose={() => setOpen(false)} />}
    </>
  );
}
