"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMode } from "./ModeProvider";

// L'app s'ouvrait sur le blog public : à chaque lancement l'auteur atterrissait
// chez ses visiteurs et devait naviguer pour rejoindre ses outils. Une seule
// redirection par CHARGEMENT complet (drapeau en mémoire de module) : à
// l'ouverture on arrive sur l'accueil, ensuite on navigue librement.
let deja = false;

export default function ArriveeAdmin() {
  const { adminView } = useMode();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (deja || !adminView) return;
    // Seulement depuis la page d'accueil publique : arriver par un lien direct
    // ou un favori sur une autre page reste respecté.
    if (pathname !== "/") { deja = true; return; }
    deja = true;
    router.replace("/accueil");
  }, [adminView, pathname, router]);

  return null;
}
