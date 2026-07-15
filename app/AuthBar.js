"use client";
import Link from "next/link";
import { useAuth } from "./AuthProvider";

export default function AuthBar() {
  const { user, profile, loading, signOut } = useAuth();

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
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Link href="/profil" aria-label="Mon profil" title="Mon profil" style={{ display: "flex" }}>
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="avatar" />
        ) : (
          <span className="avatar avatar-fallback">{nom[0]?.toUpperCase()}</span>
        )}
      </Link>
      <button
        className="nav-link"
        style={{ border: "none", background: "none", cursor: "pointer" }}
        onClick={signOut}
      >
        Sortir
      </button>
    </div>
  );
}
