"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import AuthBar from "./AuthBar";

const LINKS = [
  { href: "/", label: "Journal" },
  { href: "/album", label: "Album" },
  { href: "/etapes", label: "Étapes" },
  { href: "/calendrier", label: "100 jours" },
  { href: "/recos", label: "Conseils" },
];

export default function Nav() {
  const path = usePathname();
  if (path?.startsWith("/journal")) return null; // espace privé : pas de nav publique

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          CARNET<span>.</span>
        </Link>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={"nav-link" + (path === l.href ? " active" : "")}
          >
            {l.label}
          </Link>
        ))}
        <AuthBar />
      </div>
    </nav>
  );
}
