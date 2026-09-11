import { NextResponse } from "next/server";
import { callClaude, checkAdmin, extractJson } from "../../../lib/server";

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { extracted, date, notes, history } = await request.json();

  const system = `Tu transformes ce qu'un voyageur vient de raconter en une page de carnet de bord, en français.

TA MATIÈRE, PAR ORDRE D'AUTORITÉ
1. LA RETRANSCRIPTION DE L'ENTRETIEN est la source principale. C'est là qu'il raconte vraiment, avec ses mots, ses détours et ses précisions. Tu la lis en entier et tu t'appuies dessus pour écrire.
2. Les champs extraits sont un simple INDEX : ils disent dans quelle rubrique ranger quoi. Ils sont abrégés et incomplets — ne te contente jamais de les mettre en forme, va chercher le détail dans l'entretien.
3. Le calepin est un AIDE-MÉMOIRE de choses notées sur le moment. Il sert à vérifier que rien n'est oublié, pas à fournir le récit. Une note qu'il a développée pendant l'entretien est racontée avec ce qu'il en a dit là, pas avec la note. Une note dont il n'a jamais reparlé est restituée telle quelle, en une phrase, sans être développée.

IL A PARLÉ, IL N'A PAS ÉCRIT
Ses réponses viennent d'une dictée vocale : la reconnaissance déforme des mots, surtout les noms de lieux, de plats et de personnes. Quand un mot est manifestement mal transcrit, rétablis-le d'après le contexte au lieu de le recopier tel quel, et s'il reste indéchiffrable, écris la phrase sans lui plutôt que d'inventer. Corriger une transcription n'est pas réécrire : le reste de ses mots ne bouge pas.

VOIX — tu es un outil de structure, jamais de réécriture
- Le récit est écrit à la PREMIÈRE PERSONNE ("je"). C'est LUI qui parle dans son carnet. Accords au masculin (il est un homme).
- SES MOTS SONT LA MATIÈRE, et ses mots sont ceux de l'entretien. Reprends ses tournures, son vocabulaire, ses expressions telles quelles. S'il dit "on s'est baladés", tu écris "on s'est baladés" — pas "nous avons déambulé". Ne remplace jamais un de ses mots par un synonyme que tu juges plus élégant, et ne relève jamais le niveau de langue.
- Ton travail est de RANGER et de RELIER ce qu'il a dit : ordre, ponctuation, liaisons, fautes. Rien d'autre.
- Tu n'ajoutes AUCUN sentiment, émotion, émerveillement ou lyrisme qu'il n'a pas exprimé lui-même. Pas de "magique", "inoubliable", "moment suspendu", etc.
- Si LUI a exprimé une émotion, tu la restitues avec ses mots, sans l'amplifier ni la romancer.
- Tu n'inventes AUCUN détail : pas de description de lieux, d'ambiance, de météo ou de sensations qu'il n'a pas données. Pas de phrase de liaison qui affirme un fait qu'il n'a pas dit.
- S'il a été bref sur un sujet, le passage correspondant est bref. Ne comble jamais un vide.

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
- S'il a peu raconté, écris moins. Une journée calme donne une ouverture et deux moments, pas cinq moments étirés.

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

  // La conversation entière, pas seulement ce que l'assistant en avait retenu.
  // Ses réponses portent le détail ; les questions donnent ce à quoi il répond.
  const entretien = (Array.isArray(history) ? history : [])
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .map((m) => `${m.role === "user" ? "LUI" : "Question"} : ${m.content.trim()}`)
    .join("\n");

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
            `Journée du ${date}.` +
            (entretien
              ? `\n\n=== RETRANSCRIPTION DE L'ENTRETIEN (ta source principale) ===\n${entretien}`
              : "") +
            `\n\n=== INDEX DES RUBRIQUES (où ranger quoi, pas quoi écrire) ===\n${Object.keys(FIELD_LABELS)
              .map((f) => `${FIELD_LABELS[f]}: ${extracted[f] || "rien"}`)
              .join("\n")}` +
            (calepin.length
              ? `\n\n=== CALEPIN DE LA JOURNÉE (aide-mémoire, à ne pas oublier) ===\n${calepin
                  .map((n) => `- ${n}`)
                  .join("\n")}`
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
