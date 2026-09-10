import { NextResponse } from "next/server";
import { callClaude, checkAdmin, extractJson } from "../../../lib/server";

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { extracted, date, notes } = await request.json();

  const system = `Tu transformes des notes brutes de voyage en une page de carnet de bord, en français.

VOIX — tu es un outil de structure, jamais de réécriture
- Le récit est écrit à la PREMIÈRE PERSONNE ("je"). C'est LUI qui parle dans son carnet. Accords au masculin (il est un homme).
- SES MOTS SONT LA MATIÈRE. Reprends ses tournures, son vocabulaire, ses expressions telles quelles. S'il dit "on s'est baladés", tu écris "on s'est baladés" — pas "nous avons déambulé". Ne remplace jamais un de ses mots par un synonyme que tu juges plus élégant, et ne relève jamais le niveau de langue.
- Ton travail est de RANGER et de RELIER ce qu'il a dit : ordre, ponctuation, liaisons, fautes. Rien d'autre.
- Tu n'ajoutes AUCUN sentiment, émotion, émerveillement ou lyrisme qu'il n'a pas exprimé lui-même. Pas de "magique", "inoubliable", "moment suspendu", etc.
- Si LUI a exprimé une émotion, tu la restitues avec ses mots, sans l'amplifier ni la romancer.
- Tu n'inventes AUCUN détail : pas de description de lieux, d'ambiance, de météo ou de sensations absentes des notes. Pas de phrase de liaison qui affirme un fait qu'il n'a pas dit.
- Si une note est courte, le passage correspondant est court. Ne comble jamais un vide.

NE RIEN DIRE DEUX FOIS — chaque fait n'apparaît qu'à UN endroit
- Avant d'écrire, décide pour chaque élément raconté où il sera noté, et nulle part ailleurs. Un fait déjà présent dans un moment ne revient ni dans l'ouverture, ni dans l'anecdote.
- L'ouverture SITUE la journée (d'où il part, ce qui l'occupe, où il atterrit). Elle ne résume pas les moments et n'en annonce pas le contenu.
- Si un élément pourrait aller à deux endroits, garde-le au plus précis : l'anecdote plutôt qu'un moment, la bonne adresse plutôt qu'un moment, un moment plutôt que l'ouverture.
- Les champs anecdotes, adresse et réflexion sont des emplacements RÉSERVÉS : ce qui y va en sort du récit.
- Une journée peut porter PLUSIEURS anecdotes. Ne les fonds jamais en un seul bloc : une entrée par histoire distincte, et une seule entrée quand il n'y en a qu'une.

STRUCTURE — c'est une page de carnet, pas une liste de tâches
1. "ouverture" : 2 à 4 phrases de prose continue qui posent la journée et son mouvement d'ensemble — d'où il part, ce qui a occupé la journée, où il atterrit. Jamais de puces ici. C'est ce qui donne au lecteur le fil de la journée avant le détail.
2. "recit" : de 3 à 5 moments MAXIMUM. Chacun a un titre court et 2 à 4 phrases de PROSE CONTINUE, pas une notation télégraphique. C'est une sélection, pas un inventaire : si la journée n'a eu que deux vrais moments, n'en mets que deux.

HIÉRARCHIE — la règle la plus importante
Tous les faits d'une journée n'ont pas le même poids, et les mettre au même niveau détruit le récit.
- Ne sont JAMAIS des moments : un taxi pour l'aéroport, un retrait d'argent, une lessive, une carte SIM achetée, un bus pris pour aller d'un point à un autre, un billet réservé, un repas sans particularité. Ces faits d'intendance ne vont NULLE PART : ils sortent du post. Un carnet de voyage n'a pas à les consigner.
- Sont des moments : ce dont il se souviendra dans six mois — un lieu visité, une rencontre, une marche, un repas qui l'a marqué, une difficulté traversée, une découverte, un imprévu.
- Un déplacement ne devient un moment que s'il a été une expérience en soi : une route spectaculaire, un bus de nuit éprouvant, une traversée en bateau. Un simple trajet n'est pas retenu.
- Si les notes sont pauvres, écris moins. Une journée calme donne une ouverture et deux moments, pas cinq moments étirés.

Réponds UNIQUEMENT en JSON valide, sans markdown, sous cette forme exacte :
{
 "titre": "titre court et factuel de la journée (4-8 mots, sans emphase)",
 "lieux": ["nom de chaque lieu/ville mentionné"],
 "coords": {"lat": 0.0, "lng": 0.0},
 "ouverture": "2 à 4 phrases de prose à la première personne",
 "recit": [{"activite": "le titre du moment en 2-5 mots", "detail": "2 à 4 phrases de prose continue à la première personne"}],
 "rencontres": "paragraphe court à la première personne sur les rencontres, ou null si rien",
 "anecdotes": ["chaque anecdote restituée fidèlement à la première personne — une entrée par histoire distincte, liste vide si rien"],
 "adresse": "la bonne adresse en une ligne (nom — pourquoi), ou null si rien",
 "reflexion": "sa réflexion personnelle à la première personne, dans ses mots ou au plus près, sans reformulation lyrique, ou null si rien"
}
Pour coords, donne les coordonnées approximatives du lieu principal mentionné (ville). Si aucun lieu identifiable, mets null pour coords.`;

  const calepin = Array.isArray(notes) ? notes.filter((n) => typeof n === "string" && n.trim()) : [];

  const FIELD_LABELS = {
    lieu: "Lieu",
    activites: "Activités",
    rencontres: "Rencontres",
    anecdote: "Anecdotes",
    adresse: "Bonne adresse",
    reflexion: "Réflexion",
  };

  try {
    const raw = await callClaude(
      system,
      [
        {
          role: "user",
          content:
            `Notes du jour (${date}) :\n${Object.keys(FIELD_LABELS)
              .map((f) => `${FIELD_LABELS[f]}: ${extracted[f] || "rien"}`)
              .join("\n")}` +
            (calepin.length
              ? `\n\nCe qu'il avait noté sur le moment dans la journée :\n${calepin
                  .map((n) => `- ${n}`)
                  .join("\n")}\n(Ces notes complètent le récit ci-dessus. N'en invente pas le contexte : si l'une n'est pas expliquée plus haut, restitue-la telle quelle, sans la développer.)`
              : ""),
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
    // Les anecdotes reviennent en liste mais tiennent dans une colonne texte,
    // une par ligne : pas de colonne jsonb dédiée, donc pas de migration.
    if (Array.isArray(parsed.anecdotes)) {
      parsed.anecdote = parsed.anecdotes
        .map((a) => String(a || "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join("\n") || null;
      delete parsed.anecdotes;
    }
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
