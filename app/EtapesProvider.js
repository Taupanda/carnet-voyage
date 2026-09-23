"use client";
import { createContext, useContext, useMemo } from "react";
import { ETAPES_DEFAUT, creerCalendrier } from "../lib/stages";

// Les étapes lues côté serveur par la mise en page racine, transmises une fois
// à tous les composants client.
const Contexte = createContext(ETAPES_DEFAUT);

export default function EtapesProvider({ etapes, children }) {
  return <Contexte.Provider value={etapes}>{children}</Contexte.Provider>;
}

export function useCalendrier() {
  const etapes = useContext(Contexte);
  return useMemo(() => creerCalendrier(etapes), [etapes]);
}
