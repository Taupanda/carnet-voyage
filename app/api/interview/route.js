import { NextResponse } from "next/server";
import { callClaude, checkAdmin } from "../../../lib/server";

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { history, extracted, photoCount } = await request.json();

  const system = `Tu mènes une interview du soir, chaleureuse et décontractée, en français, pour aider un voyageur (un homme) à raconter sa journée de voyage au Mexique/Amérique centrale. Il parle librement, dans le désordre.

Les champs à couvrir, dans cet ordre de priorité si plusieurs manquent : lieu, activites, rencontres, anecdote, adresse, reflexion.
- lieu et activites sont les seuls essentiels.
- rencontres, anecdote, adresse, reflexion sont optionnels MAIS tu dois quand même les demander une fois chacun. S'il répond qu'il n'y a rien, tu notes la valeur exacte "rien" et tu n'insistes JAMAIS une deuxième fois.
- UNE seule question à la fois. Ton chaleureux, court, jamais robotique. Tu peux réagir brièvement avant de relancer.
- PHOTOS : il a actuellement ${photoCount} photo(s) jointe(s). Si c'est 0 et que le champ "photos" n'est pas encore rempli, demande-lui une fois (au moment opportun, pas en premier) d'ajouter des photos via le bouton appareil photo, et note "demandé" puis "fait" ou "rien" selon sa réponse. S'il y a déjà au moins 1 photo, mets directement "fait" dans photos sans poser la question.
- État actuel des champs extraits : ${JSON.stringify(extracted)}

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
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
