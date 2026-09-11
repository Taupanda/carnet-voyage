"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { useMode } from "./ModeProvider";
import { supabaseBrowser } from "../lib/supabaseClient";
import { jetonCourant } from "../lib/jeton";

export default function AuthBar() {
  const { user, profile, loading, signOut } = useAuth();
  const { adminView } = useMode();
  const pathname = usePathname();
  const [recu, setRecu] = useState(0);

  // La cloche se pose sur la photo de profil, au même endroit sur toutes les
  // pages. Elle ne s'allume que quand quelque chose est arrivé : un mot non lu,
  // un conseil ou un commentaire de la semaine.
  useEffect(() => {
    if (!adminView) { setRecu(0); return; }
    let annule = false;
    (async () => {
      try {
        const token = await jetonCourant();
        if (!token) return;
        const res = await fetch("/api/notifs", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const n = await res.json();
        if (!annule) setRecu(n.total || 0);
      } catch {}
    })();
    return () => { annule = true; };
  }, [adminView, pathname]);

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
      {/* La cloche est posée À CÔTÉ de la photo, pas dessus : en la chevauchant
          elle masquait un coin du visage et se lisait mal sur une photo claire. */}
      {adminView && (
        <Link
          href="/moderation"
          className={"avatar-cloche" + (recu > 0 ? " du" : "")}
          aria-label={recu > 0 ? `${recu} nouveauté(s) reçue(s)` : "Notifications"}
          title={recu > 0 ? `${recu} nouveauté(s) reçue(s)` : "Notifications"}
        >
          <span aria-hidden="true">🔔</span>
        </Link>
      )}
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
