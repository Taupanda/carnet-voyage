"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import AuthBar from "./AuthBar";
import { useMode } from "./ModeProvider";

const LINKS = [
  { href: "/", label: "Journal", ic: "📖" },
  { href: "/itineraire", label: "Itinéraire", ic: "🧭" },
  { href: "/album", label: "Album", ic: "🖼️" },
  { href: "/rencontres", label: "Rencontres", ic: "🤝" },
  { href: "/recos", label: "Conseils", ic: "💡" },
  { href: "/livre-d-or", label: "Livre d'or", ic: "💛" },
];

export default function Nav() {
  const path = usePathname();
  const { adminView } = useMode();
  const [open, setOpen] = useState(false);

  if (path?.startsWith("/journal")) return null;

  return (
    <>
      {/* ---- sidebar desktop ---- */}
      <aside className="sidebar">
        <div className="side-brand"><img src="/logo-blanc.png" alt="Les aventures de Maxou" className="side-logo" /></div>
        <div className="side-sub">Mexique · Amérique centrale</div>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={"side-link" + (path === l.href ? " active" : "")}>
            <span className="ic">{l.ic}</span>{l.label}
          </Link>
        ))}
        {adminView && (
          <>
            <div className="side-div" />
            <Link href="/atelier" className={"side-link" + (path === "/atelier" ? " active" : "")} style={path === "/atelier" ? undefined : { color: "var(--accent)" }}>
              <span className="ic">🧰</span>Menu
            </Link>
          </>
        )}
        <div className="side-auth"><AuthBar /></div>
      </aside>

      {/* ---- topbar mobile ---- */}
      <div className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="topbar-brand" onClick={() => setOpen(false)}><img src="/logo-terracota.png" alt="Les aventures de Maxou" className="topbar-logo" /></Link>
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
            {adminView && (
              <Link href="/atelier" className={"nav-mobile-link" + (path === "/atelier" ? " active" : "")} style={path === "/atelier" ? undefined : { color: "var(--accent)" }} onClick={() => setOpen(false)}>
                🧰 Menu
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
