"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import AuthBar from "./AuthBar";
import { useAuth } from "./AuthProvider";

const LINKS = [
  { href: "/", label: "Journal" },
  { href: "/album", label: "Album" },
  { href: "/etapes", label: "Étapes" },
  { href: "/calendrier", label: "100 jours" },
  { href: "/recos", label: "Conseils" },
];

export default function Nav() {
  const path = usePathname();
  const { user } = useAuth();
  const isAdmin = !!user?.email && user.email.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();
  if (path?.startsWith("/journal")) return null; // le mode éditeur a sa propre interface

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
        {isAdmin && (
          <Link href="/journal" className="nav-link" style={{ color: "var(--stage)", border: "1px solid var(--stage)" }}>
            ✏️ Éditeur
          </Link>
        )}
        <AuthBar />
      </div>
    </nav>
  );
}
