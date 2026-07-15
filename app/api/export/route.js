import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";

export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const [entries, comments, likes, messages, recos, profiles] = await Promise.all([
    db.from("entries").select("*").order("date"),
    db.from("comments").select("*").order("created_at"),
    db.from("likes").select("*"),
    db.from("messages").select("*").order("created_at"),
    db.from("recos").select("*").order("created_at"),
    db.from("profiles").select("id, prenom, nom, avatar_url"),
  ]);

  const payload = {
    exporte_le: new Date().toISOString(),
    note: "Les photos restent hébergées aux URLs indiquées dans chaque entrée (champ photos).",
    entries: entries.data || [],
    comments: comments.data || [],
    likes: likes.data || [],
    messages: messages.data || [],
    recos: recos.data || [],
    profiles: profiles.data || [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="carnet-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
