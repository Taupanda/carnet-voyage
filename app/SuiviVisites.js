"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { noterVisite } from "../lib/outils";

// Enregistre discrètement l'outil ouvert, pour alimenter la bande d'accès
// rapide de l'accueil. Rien n'est envoyé au serveur : l'historique vit dans le
// navigateur, il n'a de sens que sur l'appareil qui s'en sert.
export default function SuiviVisites() {
  const pathname = usePathname();
  useEffect(() => { if (pathname) noterVisite(pathname); }, [pathname]);
  return null;
}
