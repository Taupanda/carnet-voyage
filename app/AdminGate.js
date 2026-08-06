"use client";
import Link from "next/link";
import { useAuth } from "./AuthProvider";

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();

// Garde d'accès réservée à l'admin. Rend le contenu seulement pour l'auteur ;
// sinon affiche un message et un retour au carnet.
export default function AdminGate({ children }) {
  const { user, loading } = useAuth();
  const isAdmin = !!user?.email && user.email.toLowerCase() === ADMIN_EMAIL;

  if (loading) {
    return <main className="container" style={{ paddingTop: 40 }}><p className="empty">Chargement…</p></main>;
  }
  if (!isAdmin) {
    return (
      <main className="container" style={{ paddingTop: 60, maxWidth: 420, textAlign: "center" }}>
        <p style={{ color: "var(--ink2)", marginBottom: 16 }}>Espace réservé à l'auteur.</p>
        <Link href="/" className="btn" style={{ display: "inline-block", textDecoration: "none" }}>← Retour au carnet</Link>
      </main>
    );
  }
  return children;
}
