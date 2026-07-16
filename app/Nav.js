"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import AuthBar from "./AuthBar";
import { useAuth } from "./AuthProvider";

const LINKS = [
  { href: "/", label: "Journal", ic: "📖" },
  { href: "/itineraire", label: "Itinéraire", ic: "🧭" },
  { href: "/album", label: "Album", ic: "🖼️" },
  { href: "/calendrier", label: "100 jours", ic: "🗓️" },
  { href: "/rencontres", label: "Rencontres", ic: "🤝" },
  { href: "/recos", label: "Conseils", ic: "💡" },
];

export default function Nav() {
  const path = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const isAdmin = !!user?.email && user.email.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();

  if (path?.startsWith("/journal")) return null;

  return (
    <>
      {/* ---- sidebar desktop ---- */}
      <aside className="sidebar">
        <div className="side-brand">CARNET<span>.</span></div>
        <div className="side-sub">Mexique · Amérique centrale</div>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={"side-link" + (path === l.href ? " active" : "")}>
            <span className="ic">{l.ic}</span>{l.label}
          </Link>
        ))}
        {isAdmin && (
          <Link href="/journal" className="side-link" style={{ color: "var(--accent)" }}>
            <span className="ic">✏️</span>Éditeur
          </Link>
        )}
        <div className="side-quote">« Not all those who wander are lost. »</div>
        <div className="side-auth"><AuthBar /></div>
      </aside>

      {/* ---- topbar mobile ---- */}
      <div className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="topbar-brand" onClick={() => setOpen(false)}>CARNET<span>.</span></Link>
          <AuthBar />
          <button className="nav-burger" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
            {open ? "✕" : "☰"}
          </button>
        </div>
        {open && (
          <div className="nav-mobile">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={"nav-mobile-link" + (path === l.href ? " active" : "")} onClick={() => setOpen(false)}>
                {l.ic} {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/journal" className="nav-mobile-link" style={{ color: "var(--accent)" }} onClick={() => setOpen(false)}>
                ✏️ Mode éditeur
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
