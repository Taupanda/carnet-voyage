import { NextResponse } from "next/server";

// Le partage est normalement intercepté par le service worker, qui met les
// photos de côté avant de renvoyer le journal. Ce gestionnaire ne sert qu'au cas
// où il ne contrôle pas encore la page — juste après l'installation, ou après un
// vidage du cache : sans lui, Android recevrait un 404 en pleine navigation.
export const dynamic = "force-dynamic";

export async function POST(request) {
  return NextResponse.redirect(new URL("/journal?partage=0", request.url), 303);
}

export async function GET(request) {
  return NextResponse.redirect(new URL("/journal", request.url), 303);
}
