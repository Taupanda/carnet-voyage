import { NextResponse } from "next/server";
import { callClaude, checkAdmin, extractJson } from "../../../../lib/server";

const SYSTEM = `Tu assistes un voyageur francophone qui apprend l'espagnol au Mexique et en Amérique centrale (Belize, Guatemala, Salvador).

On te donne un mot ou une courte expression. Tu détermines s'il est en FRANÇAIS ou en ESPAGNOL, puis tu le traduis dans l'autre langue.

RÈGLES :
- L'espagnol visé est celui d'Amérique latine, pas le castillan d'Espagne : privilégie l'usage courant au Mexique et en Amérique centrale.
- "traduction" est la traduction la plus courante à l'oral.
- "alternatives" liste de 0 à 4 AUTRES traductions correctes (synonymes, variantes régionales), de la plus courante à la moins courante. N'y répète jamais "traduction".
- Pour un nom espagnol, inclus l'article ("el mercado", "la playa"). Pour un nom français, inclus l'article ("le marché", "la plage").
- Si le mot existe dans les deux langues, retiens la langue la plus probable et explique-le en une phrase courte dans "note".
- Corrige silencieusement une faute d'orthographe évidente dans le champ "mot".
- Réponds par un mot ou une expression, jamais par une phrase.

Réponds UNIQUEMENT en JSON valide, sans markdown, sous cette forme exacte :
{
 "langue_source": "fr ou es",
 "mot": "le mot saisi, orthographe corrigée",
 "traduction": "la meilleure traduction",
 "alternatives": ["autre traduction", "..."],
 "note": "précision courte si le mot est ambigu ou régional, sinon null"
}`;

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { mot } = await request.json();
  const terme = typeof mot === "string" ? mot.trim() : "";
  if (!terme) return NextResponse.json({ error: "mot requis" }, { status: 400 });
  if (terme.length > 80) {
    return NextResponse.json({ error: "trop long : un mot ou une courte expression" }, { status: 400 });
  }

  try {
    const raw = await callClaude(SYSTEM, [{ role: "user", content: terme }], 400);
    const p = extractJson(raw);

    const source = p.langue_source === "es" ? "es" : "fr";
    const motCorrige = String(p.mot || terme).trim();
    const traduction = String(p.traduction || "").trim();
    if (!traduction) throw new Error("aucune traduction proposée");

    const alternatives = Array.isArray(p.alternatives)
      ? [...new Set(p.alternatives.map((a) => String(a).trim()).filter(Boolean))]
          .filter((a) => a.toLowerCase() !== traduction.toLowerCase())
          .slice(0, 4)
      : [];

    // On renvoie déjà rangé par langue : le client n'a pas à savoir dans quel
    // sens la traduction s'est faite, il affiche simplement fr et es.
    return NextResponse.json({
      source,
      fr: source === "fr" ? motCorrige : traduction,
      es: source === "fr" ? traduction : motCorrige,
      alternatives, // toujours dans la langue cible, celle qui a été traduite
      note: p.note ? String(p.note).trim() : null,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
