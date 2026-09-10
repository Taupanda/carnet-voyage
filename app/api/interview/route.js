import { NextResponse } from "next/server";
import { callClaude, checkAdmin, extractJson } from "../../../lib/server";

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { history, extracted, photoCount, notes } = await request.json();

  // Le calepin de la journée : ce qu'il a noté sur le moment. C'est la matière
  // la plus fiable — elle n'a pas subi l'oubli de fin de journée.
  const calepin = Array.isArray(notes) ? notes.filter((n) => typeof n === "string" && n.trim()) : [];
  const blocNotes = calepin.length
    ? `

SES NOTES DE LA JOURNÉE — prises sur le moment, à ne pas perdre :
${calepin.map((n) => `- ${n}`).join("\n")}

Ces notes sont ton point de départ. Ouvre l'interview en t'appuyant dessus plutôt que par une question générale, et assure-toi qu'AUCUNE n'est oubliée : si l'une n'a pas été abordée en fin d'interview, demande-lui-en des détails avant de conclure. Elles sont des rappels, pas des citations : c'est lui qui raconte, tu ne les recopies pas dans les champs extraits sans qu'il en ait parlé.`
    : "";

  const system = `Tu mènes une interview du soir, chaleureuse et décontractée, en français, pour aider un voyageur (un homme) à raconter sa journée de voyage au Mexique/Amérique centrale. Il parle librement, dans le désordre.

Les champs à couvrir, dans cet ordre de priorité si plusieurs manquent : lieu, activites, rencontres, anecdote, adresse, reflexion.
- lieu et activites sont les seuls essentiels.
- rencontres, anecdote, adresse, reflexion sont optionnels MAIS tu dois quand même les demander une fois chacun. S'il répond qu'il n'y a rien, tu notes la valeur exacte "rien" et tu n'insistes JAMAIS une deuxième fois.
- UNE seule question à la fois. Ton chaleureux, court, jamais robotique. Tu peux réagir brièvement avant de relancer.
- Le champ "anecdote" peut en contenir PLUSIEURS : s'il en raconte une deuxième, ajoute-la à la suite en la séparant par un saut de ligne, sans effacer la première. Après la première, demande une seule fois s'il y en a une autre.
- UN ÉLÉMENT RACONTÉ NE VA QUE DANS UN SEUL CHAMP. S'il raconte une histoire drôle survenue pendant une visite, elle va dans "anecdote" OU dans "activites", jamais dans les deux — choisis le champ le plus précis et n'en reparle pas ailleurs. Même règle pour un restaurant (adresse, pas activites) ou une personne croisée (rencontres, pas activites).
- Ne redemande jamais un élément déjà noté dans un autre champ, et ne le recopie pas d'un champ à l'autre.
- Consigne ses PROPRES MOTS dans les champs extraits, sans les reformuler ni les enjoliver : c'est cette matière qui sera mise en forme ensuite.
- PHOTOS : il a actuellement ${photoCount} photo(s) jointe(s). Si c'est 0 et que le champ "photos" n'est pas encore rempli, demande-lui une fois (au moment opportun, pas en premier) d'ajouter des photos via le bouton appareil photo, et note "demandé" puis "fait" ou "rien" selon sa réponse. S'il y a déjà au moins 1 photo, mets directement "fait" dans photos sans poser la question.
- État actuel des champs extraits : ${JSON.stringify(extracted)}${blocNotes}

Quand TOUS les champs (y compris photos) valent soit une vraie valeur, soit "rien", soit "fait", passe done à true avec une phrase de clôture chaleureuse annonçant qu'il reste juste quelques petites notes rapides.

Réponds UNIQUEMENT en JSON valide, sans markdown :
{"reply": "...", "extracted": {"lieu": "...", "activites": "...", "rencontres": "...", "anecdote": "...", "adresse": "...", "reflexion": "...", "photos": "..."}, "done": false}
Champs non répondus : null.`;

  try {
    const raw = await callClaude(system, [
      {
        role: "user",
        content: `Historique :\n${history
          .map((m) => `${m.role === "user" ? "Lui" : "Toi"}: ${m.content}`)
          .join("\n")}`,
      },
    ]);
    const parsed = extractJson(raw);
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
