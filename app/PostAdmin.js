"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMode } from "./ModeProvider";
import { supabaseBrowser } from "../lib/supabaseClient";

// Contrôles admin affichés sur chaque post, uniquement en mode éditeur.
export default function PostAdmin({ date }) {
  const { adminView } = useMode();
  const router = useRouter();
  if (!adminView) return null;

  async function del() {
    if (!confirm("Supprimer définitivement ce post ?")) return;
    const { data } = await supabaseBrowser().auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/entries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ date }),
    });
    if (res.ok) router.refresh();
    else alert("Échec de la suppression.");
  }

  return (
    <div className="post-admin">
      <Link href={`/journal?date=${date}`} className="post-admin-btn">✏️ Éditer</Link>
      <button className="post-admin-btn danger" onClick={del}>🗑️ Supprimer</button>
    </div>
  );
}
