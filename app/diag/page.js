"use client";
import { useState, useEffect } from "react";
import { supabaseBrowser } from "../../lib/supabaseClient";

export default function Diag() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    (async () => {
      const r = {};

      // 1. Variables publiques présentes ?
      r.envUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      r.envAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      r.envAdminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "(absente)";

      // 2. Jetons stockés dans le navigateur ?
      try {
        r.storageKeys = Object.keys(window.localStorage).filter((k) => k.startsWith("sb-"));
      } catch (e) {
        r.storageKeys = ["ERREUR localStorage : " + e.message];
      }

      // 3. Session lisible ?
      try {
        const { data, error } = await supabaseBrowser().auth.getSession();
        r.sessionError = error?.message || null;
        r.hasSession = !!data.session;
        r.email = data.session?.user?.email || null;
        r.expiresAt = data.session
          ? new Date(data.session.expires_at * 1000).toLocaleString("fr-FR")
          : null;
      } catch (e) {
        r.sessionError = "EXCEPTION : " + e.message;
      }

      setReport(r);
    })();
  }, []);

  if (!report) return <main className="container" style={{ paddingTop: 40 }}><p className="empty">Analyse…</p></main>;

  const Row = ({ label, value, ok }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ color: "var(--muted)", fontSize: 13.5 }}>{label}</span>
      <span className="mono" style={{ fontSize: 12.5, color: ok === false ? "var(--stage-2)" : ok === true ? "#3FBF6F" : "var(--text)", textAlign: "right", wordBreak: "break-all" }}>
        {String(value)}
      </span>
    </div>
  );

  return (
    <main className="container" style={{ paddingTop: 30, paddingBottom: 60, maxWidth: 560 }}>
      <h1 className="display" style={{ fontSize: 24, marginBottom: 18 }}>Diagnostic session</h1>
      <Row label="Variable SUPABASE_URL" value={report.envUrl ? "présente" : "MANQUANTE"} ok={report.envUrl} />
      <Row label="Variable ANON_KEY" value={report.envAnon ? "présente" : "MANQUANTE"} ok={report.envAnon} />
      <Row label="Variable ADMIN_EMAIL (publique)" value={report.envAdminEmail} ok={report.envAdminEmail !== "(absente)"} />
      <Row label="Jetons stockés (sb-*)" value={report.storageKeys.length ? report.storageKeys.join(", ") : "AUCUN"} ok={report.storageKeys.length > 0} />
      <Row label="Session active" value={report.hasSession ? "OUI" : "NON"} ok={report.hasSession} />
      <Row label="Email de session" value={report.email || "—"} />
      <Row label="Expire le" value={report.expiresAt || "—"} />
      <Row label="Erreur" value={report.sessionError || "aucune"} ok={!report.sessionError} />
      <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 18 }}>
        Envoie une capture de cet écran pour analyse. Cette page ne modifie rien.
      </p>
    </main>
  );
}
