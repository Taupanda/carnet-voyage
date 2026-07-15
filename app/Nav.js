"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import AuthBar from "./AuthBar";
import { useAuth } from "./AuthProvider";

const LINKS = [
  { href: "/", label: "Journal" },
  { href: "/itineraire", label: "Itinéraire" },
  { href: "/album", label: "Album" },
  { href: "/etapes", label: "Étapes" },
  { href: "/calendrier", label: "100 jours" },
  { href: "/recos", label: "Conseils" },
];

export default function Nav() {
  const path = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const isAdmin = !!user?.email && user.email.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();

  if (path?.startsWith("/journal")) return null;

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-brand" onClick={() => setOpen(false)}>
          CARNET<span>.</span>
        </Link>

        {/* liens — inline sur desktop, cachés sur mobile */}
        <div className="nav-links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={"nav-link" + (path === l.href ? " active" : "")}>
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/journal" className="nav-link" style={{ color: "var(--stage)", border: "1px solid var(--stage)" }}>
              ✏️ Éditeur
            </Link>
          )}
        </div>

        {/* à droite : compte (toujours visible) + hamburger (mobile) */}
        <div className="nav-right">
          <AuthBar />
          <button
            className="nav-burger"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* panneau mobile déroulant */}
      {open && (
        <div className="nav-mobile">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={"nav-mobile-link" + (path === l.href ? " active" : "")}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/journal" className="nav-mobile-link" style={{ color: "var(--stage)" }} onClick={() => setOpen(false)}>
              ✏️ Mode éditeur
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
