"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

/* Si l'utilisateur est connecté mais n'a pas encore de prénom,
   on l'emmène UNE FOIS sur /profil pour compléter. Pas d'overlay, pas de course. */
export default function ProfileRedirect() {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (profile === undefined) return; // profil pas encore lu : on ne décide rien
    if (profile?.prenom) return;       // profil complet : rien à faire
    if (
      pathname?.startsWith("/profil") ||
      pathname?.startsWith("/connexion") ||
      pathname?.startsWith("/journal")
    ) return;
    router.replace("/profil");
  }, [loading, user, profile, pathname, router]);

  return null;
}
