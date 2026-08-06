"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMode } from "./ModeProvider";

// À l'arrivée sur le site, l'admin en mode éditeur atterrit sur l'Atelier (le menu).
// Une seule fois par session : ensuite il peut visiter "/" librement (lien Journal,
// mode visiteur…) sans être renvoyé.
export default function AdminLanding() {
  const { adminView } = useMode();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!adminView) return;
    if (pathname !== "/") return;
    let landed = false;
    try { landed = sessionStorage.getItem("carnet-landed") === "1"; } catch {}
    if (landed) return;
    try { sessionStorage.setItem("carnet-landed", "1"); } catch {}
    router.replace("/atelier");
  }, [adminView, pathname, router]);

  return null;
}
