import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin, callClaude, extractJson } from "../../../lib/server";

// Lundi (AAAA-MM-JJ) de la semaine contenant `dateStr`.
function mondayOf(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7; // 0 = lundi
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db.from("weekly_recaps").select("*").order("semaine_debut", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const db = supabaseAdmin();

  // --- Générer un brouillon depuis les posts de la semaine ---
  if (body.action === "generate") {
    if (!body.semaine) return NextResponse.json({ error: "semaine requise" }, { status: 400 });
    const lundi = mondayOf(body.semaine);
    const dimanche = addDays(lundi, 6);

    const { data: entries, error } = await db
      .from("entries")
      .select("date, titre, lieux, recit, reflexion, reflexion_privee")
      .eq("status", "published")
      .gte("date", lundi)
      .lte("date", dimanche)
      .order("date", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: "Aucun post publié cette semaine." }, { status: 400 });
    }

    const brief = entries
      .map((e) => {
        const acts = Array.isArray(e.recit) ? e.recit.map((r) => r.activite).filter(Boolean).join(", ") : "";
        const lieux = Array.isArray(e.lieux) ? e.lieux.join(", ") : "";
        return `- ${e.date} · ${e.titre || ""}${lieux ? ` (${lieux})` : ""}${acts ? ` : ${acts}` : ""}`;
      })
      .join("\n");

    const system = `Tu écris le résumé hebdomadaire d'un carnet de voyage (Mexique / Amérique centrale), à la PREMIÈRE PERSONNE ("je"), au masculin, pour les proches qui suivent le voyage.
- Ton chaleureux mais SOBRE et factuel. Aucune emphase inventée, aucun lyrisme ("magique", "inoubliable"…), tu restes fidèle aux faits fournis.
- 2 à 4 courts paragraphes maximum. Donne une vue d'ensemble de la semaine (où je suis allé, ce que j'ai fait), pas un jour-par-jour exhaustif.
- N'invente aucun détail absent des notes.
Réponds UNIQUEMENT en JSON valide, sans markdown : {"titre": "titre court de la semaine (4-8 mots)", "contenu": "le résumé"}`;

    const raw = await callClaude(system, [
      { role: "user", content: `Semaine du ${lundi} au ${dimanche}. Posts publiés :\n${brief}` },
    ], 1200);
    let parsed;
    try { parsed = extractJson(raw); } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }

    const { data: saved, error: upErr } = await db
      .from("weekly_recaps")
      .upsert({ semaine_debut: lundi, titre: parsed.titre || null, contenu: parsed.contenu || null, status: "draft", updated_at: new Date().toISOString() }, { onConflict: "semaine_debut" })
      .select()
      .single();
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json(saved);
  }

  // --- Enregistrer / publier / dépublier ---
  if (!body.semaine_debut && !body.id) {
    return NextResponse.json({ error: "semaine_debut ou id requis" }, { status: 400 });
  }
  const row = {
    ...(body.id ? { id: body.id } : {}),
    ...(body.semaine_debut ? { semaine_debut: body.semaine_debut } : {}),
    titre: body.titre ?? null,
    contenu: body.contenu ?? null,
    status: body.status === "published" ? "published" : "draft",
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db
    .from("weekly_recaps")
    .upsert(row, { onConflict: body.id ? "id" : "semaine_debut" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await request.json();
  const { error } = await supabaseAdmin().from("weekly_recaps").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
