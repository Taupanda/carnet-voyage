import { NextResponse } from "next/server";
import { callClaude, checkAdmin } from "../../../lib/server";

export async function POST(request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { extracted, date } = await request.json();

  const system = `Tu transformes des notes brutes de voyage en un post de carnet de bord structuré, en français.

RÈGLES STRICTES :
- Le récit est écrit à la PREMIÈRE PERSONNE ("je"). C'est LUI qui parle dans son carnet. Accords au masculin (il est un homme).
- Tu restitues les FAITS tels qu'il les a racontés. Style direct, sobre, factuel.
- Tu n'ajoutes AUCUN sentiment, émotion, émerveillement ou lyrisme qu'il n'a pas exprimé lui-même. Pas de "magique", "inoubliable", "moment suspendu", etc.
- Si LUI a exprimé une émotion dans ses notes, tu la restitues fidèlement, avec ses mots ou très proche de ses mots — sans l'amplifier ni la romancer.
- Tu n'inventes AUCUN détail : pas de description de lieux, d'ambiance, de météo ou de sensations qui ne figurent pas dans les notes.
- Tu peux réorganiser, fluidifier et corriger la langue, mais le contenu reste exactement le sien.
- Le récit est une liste à puces : une entrée par activité de la journée, avec l'activité en résumé court puis le détail factuel.

Réponds UNIQUEMENT en JSON valide, sans markdown, sous cette forme exacte :
{
 "titre": "titre court et factuel de la journée (4-8 mots, sans emphase)",
 "lieux": ["nom de chaque lieu/ville mentionné"],
 "coords": {"lat": 0.0, "lng": 0.0},
 "recit": [{"activite": "l'activité en 2-5 mots", "detail": "le commentaire factuel à la première personne, 1-2 phrases"}],
 "rencontres": "paragraphe court à la première personne sur les rencontres, ou null si rien",
 "anecdote": "l'anecdote restituée fidèlement à la première personne, ou null si rien",
 "adresse": "la bonne adresse en une ligne (nom — pourquoi), ou null si rien",
 "reflexion": "sa réflexion personnelle à la première personne, dans ses mots ou au plus près, sans reformulation lyrique, ou null si rien"
}
Pour coords, donne les coordonnées approximatives du lieu principal mentionné (ville). Si aucun lieu identifiable, mets null pour coords.`;

  const FIELD_LABELS = {
    lieu: "Lieu",
    activites: "Activités",
    rencontres: "Rencontres",
    anecdote: "Anecdote",
    adresse: "Bonne adresse",
    reflexion: "Réflexion",
  };

  try {
    const raw = await callClaude(system, [
      {
        role: "user",
        content: `Notes du jour (${date}) :\n${Object.keys(FIELD_LABELS)
          .map((f) => `${FIELD_LABELS[f]}: ${extracted[f] || "rien"}`)
          .join("\n")}`,
      },
    ]);
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
