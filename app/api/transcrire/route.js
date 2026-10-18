import { NextResponse } from "next/server";
import { supabaseAdmin, checkAdmin } from "../../../lib/server";
import { etapesServeur } from "../../../lib/etapesServeur";
import { transcrireAudio, extensionAudio, TAILLE_MAX } from "../../../lib/transcription";

// Plusieurs minutes de voix se transcrivent en quelques secondes à quelques
// dizaines de secondes.
export const maxDuration = 60;

// Un enregistrement court part directement dans la requête. Au-delà, Vercel
// refuserait le corps (4,5 Mo) : le téléphone le dépose d'abord dans un
// compartiment privé, et on va l'y chercher.
const BUCKET = "audio";

// Les noms propres que la reconnaissance écorche : villes et lieux des
// derniers jours, étapes, prénoms des rencontres.
async function indicesDuVoyage(db) {
  const [entrees, rencontres, etapes] = await Promise.all([
    db.from("entries").select("lieux").order("date", { ascending: false }).limit(20),
    db.from("rencontres").select("prenom").order("created_at", { ascending: false }).limit(40),
    etapesServeur().catch(() => []),
  ]);
  return [
    ...(entrees.data || []).flatMap((e) => (Array.isArray(e.lieux) ? e.lieux : [])),
    ...(rencontres.data || []).map((r) => r.prenom),
    ...(etapes || []).map((e) => e.nom),
  ];
}

async function urlDeDepot(db, chemin) {
  let r = await db.storage.from(BUCKET).createSignedUploadUrl(chemin);
  // Premier enregistrement long : le compartiment n'existe pas encore.
  if (r.error && /not found/i.test(r.error.message || "")) {
    const c = await db.storage.createBucket(BUCKET, { public: false, fileSizeLimit: TAILLE_MAX });
    if (c.error && !/already exists/i.test(c.error.message || "")) return { error: c.error };
    r = await db.storage.from(BUCKET).createSignedUploadUrl(chemin);
  }
  return r;
}

function reponseErreur(e) {
  const status = Number(e?.status) >= 400 ? Number(e.status) : 500;
  return NextResponse.json({ error: e?.message || "transcription impossible" }, { status });
}

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();

  // 1. Envoi direct : le fichier est dans la requête.
  if ((request.headers.get("content-type") || "").includes("multipart/form-data")) {
    const form = await request.formData();
    const fichier = form.get("file");
    if (!fichier || typeof fichier === "string") return NextResponse.json({ error: "aucun son reçu" }, { status: 400 });
    if (fichier.size > TAILLE_MAX) return NextResponse.json({ error: "enregistrement trop long" }, { status: 413 });
    try {
      const texte = await transcrireAudio(fichier, { indices: await indicesDuVoyage(db) });
      return NextResponse.json({ texte });
    } catch (e) {
      return reponseErreur(e);
    }
  }

  const body = await request.json().catch(() => ({}));

  // 2. Demande d'une adresse de dépôt pour un long enregistrement.
  if (body.depot) {
    const ext = extensionAudio(body.depot.type);
    if (!ext) return NextResponse.json({ error: `format audio non reconnu : ${body.depot.type || "inconnu"}` }, { status: 415 });
    if (Number(body.depot.taille) > TAILLE_MAX) return NextResponse.json({ error: "enregistrement trop long" }, { status: 413 });
    const chemin = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data, error } = await urlDeDepot(db, chemin);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ chemin, url: data.signedUrl });
  }

  // 3. Transcription d'un enregistrement déposé.
  if (typeof body.chemin === "string") {
    const chemin = body.chemin;
    if (!/^[0-9]+-[a-z0-9]+\.[a-z0-9]+$/.test(chemin)) return NextResponse.json({ error: "chemin invalide" }, { status: 400 });
    const { data, error } = await db.storage.from(BUCKET).download(chemin);
    if (error || !data) return NextResponse.json({ error: error?.message || "enregistrement introuvable" }, { status: 404 });
    try {
      // Le type du fichier téléchargé n'est pas toujours conservé : l'extension
      // du chemin, choisie par nous, fait foi.
      const ext = chemin.split(".").pop();
      const type = { webm: "audio/webm", ogg: "audio/ogg", mp4: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav" }[ext];
      const fichier = new Blob([await data.arrayBuffer()], { type });
      const texte = await transcrireAudio(fichier, { indices: await indicesDuVoyage(db) });
      return NextResponse.json({ texte });
    } catch (e) {
      return reponseErreur(e);
    } finally {
      // Réussi ou non, le son n'a plus à rester ici : le téléphone garde sa
      // copie jusqu'à ce que le texte soit arrivé, et la redéposera s'il faut.
      await db.storage.from(BUCKET).remove([chemin]).catch(() => {});
    }
  }

  return NextResponse.json({ error: "requête incomprise" }, { status: 400 });
}
