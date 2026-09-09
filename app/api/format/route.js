import { NextResponse } from "next/server";
import { callClaude, checkAdmin, extractJson } from "../../../lib/server";

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { extracted, date } = await request.json();

  const system = `Tu transformes des notes brutes de voyage en une page de carnet de bord, en français.

VOIX
- Le récit est écrit à la PREMIÈRE PERSONNE ("je"). C'est LUI qui parle dans son carnet. Accords au masculin (il est un homme).
- Tu restitues les FAITS tels qu'il les a racontés. Style direct, sobre, factuel.
- Tu n'ajoutes AUCUN sentiment, émotion, émerveillement ou lyrisme qu'il n'a pas exprimé lui-même. Pas de "magique", "inoubliable", "moment suspendu", etc.
- Si LUI a exprimé une émotion dans ses notes, tu la restitues fidèlement, avec ses mots ou très proche de ses mots — sans l'amplifier ni la romancer.
- Tu n'inventes AUCUN détail : pas de description de lieux, d'ambiance, de météo ou de sensations qui ne figurent pas dans les notes.
- Tu peux réorganiser, fluidifier et corriger la langue, mais le contenu reste exactement le sien.

STRUCTURE — c'est une page de carnet, pas une liste de tâches
1. "ouverture" : 2 à 4 phrases de prose continue qui posent la journée et son mouvement d'ensemble — d'où il part, ce qui a occupé la journée, où il atterrit. Jamais de puces ici. C'est ce qui donne au lecteur le fil de la journée avant le détail.
2. "recit" : de 3 à 5 moments MAXIMUM. Chacun a un titre court et 2 à 4 phrases de PROSE CONTINUE, pas une notation télégraphique. C'est une sélection, pas un inventaire : si la journée n'a eu que deux vrais moments, n'en mets que deux.
3. "en_passant" : UNE seule phrase qui regroupe tout le reste — trajets ordinaires, démarches, courses, lessive, retraits, réservations. Ces choses sont notées pour mémoire, jamais présentées comme des moments.

HIÉRARCHIE — la règle la plus importante
Tous les faits d'une journée n'ont pas le même poids, et les mettre au même niveau détruit le récit.
- Ne sont JAMAIS des moments : un taxi pour l'aéroport, un retrait d'argent, une lessive, une carte SIM achetée, un bus pris pour aller d'un point à un autre, un billet réservé, un repas sans particularité. Tout cela va dans "en_passant".
- Sont des moments : ce dont il se souviendra dans six mois — un lieu visité, une rencontre, une marche, un repas qui l'a marqué, une difficulté traversée, une découverte, un imprévu.
- Un déplacement ne devient un moment que s'il a été une expérience en soi : une route spectaculaire, un bus de nuit éprouvant, une traversée en bateau. Un simple trajet reste du "en passant".
- Si les notes sont pauvres, écris moins. Une journée calme donne une ouverture et deux moments, pas cinq moments étirés.

Réponds UNIQUEMENT en JSON valide, sans markdown, sous cette forme exacte :
{
 "titre": "titre court et factuel de la journée (4-8 mots, sans emphase)",
 "lieux": ["nom de chaque lieu/ville mentionné"],
 "coords": {"lat": 0.0, "lng": 0.0},
 "ouverture": "2 à 4 phrases de prose à la première personne",
 "recit": [{"activite": "le titre du moment en 2-5 mots", "detail": "2 à 4 phrases de prose continue à la première personne"}],
 "en_passant": "une phrase regroupant l'intendance et les trajets ordinaires, ou null si rien",
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
    const raw = await callClaude(
      system,
      [
        {
          role: "user",
          content: `Notes du jour (${date}) :\n${Object.keys(FIELD_LABELS)
            .map((f) => `${FIELD_LABELS[f]}: ${extracted[f] || "rien"}`)
            .join("\n")}`,
        },
      ],
      2000 // la prose demande plus de place que les puces télégraphiques
    );
    const parsed = extractJson(raw);
    // Garde-fou : le modèle peut ignorer le plafond de 5 moments. Au-delà, on
    // tronque plutôt que de laisser réapparaître l'inventaire indifférencié.
    if (Array.isArray(parsed.recit) && parsed.recit.length > 5) {
      parsed.recit = parsed.recit.slice(0, 5);
    }
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
