"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMode } from "./ModeProvider";

// Une seule redirection par CHARGEMENT de l'app. Ce flag est en mémoire du module :
// il est remis à zéro à chaque rechargement complet (ouverture de la PWA, refresh),
// mais conservé lors des navigations internes (soft navigation). Résultat :
//  - à l'ouverture, l'admin en mode éditeur atterrit sur l'Atelier, quel que soit
//    le point d'entrée (/, /journal, favori…),
//  - ensuite il navigue librement (cliquer sur Journal, voir le blog…) sans rebond.
let handled = false;

export default function AdminLanding() {
  const { adminView } = useMode();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (handled) return;
    if (!adminView) return; // invités + mode "utilisateur" : aucune redirection
    // On laisse les flux d'authentification se terminer d'abord.
    if (pathname?.startsWith("/connexion") || pathname?.startsWith("/profil")) return;
    handled = true;
    if (pathname !== "/atelier") router.replace("/atelier");
  }, [adminView, pathname, router]);

  return null;
}
