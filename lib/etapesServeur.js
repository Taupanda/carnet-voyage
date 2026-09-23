import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { creerCalendrier, fusionnerEtapes } from "./stages";

export const TAG_ETAPES = "etapes";

// Lue par la mise en page racine, donc par toutes les pages : une base
// injoignable (ou absente, au build) ne doit jamais faire tomber le site. Tout
// échec renvoie null, et fusionnerEtapes retombe sur les étapes par défaut.
//
// Le tag permet à l'écran d'édition d'invalider la lecture dès l'enregistrement ;
// les 5 minutes rattrapent une modification faite directement dans Supabase.
async function lireLignes() {
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      global: { fetch: (url, init) => fetch(url, { ...init, next: { tags: [TAG_ETAPES], revalidate: 300 } }) },
    });
    const { data, error } = await db.from("etapes").select("n, nom, debut, fin").order("n");
    return error ? null : data;
  } catch {
    return null;
  }
}

export const etapesServeur = cache(async () => fusionnerEtapes(await lireLignes()));

export const calendrierServeur = cache(async () => creerCalendrier(await etapesServeur()));
