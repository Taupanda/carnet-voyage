"use client";
import { useEffect, useRef } from "react";

const MIN = 0.78;       // en dessous, le texte ne se lit plus confortablement
const MIN_SUITE = 0.7;  // dernier recours : tout imprimer plutôt que couper
const PAS = 0.02;
const deborde = (el) => el.scrollHeight > el.clientHeight + 1;

function reduire(corps, depart = 1, min = MIN) {
  let e = depart;
  corps.style.setProperty("--echelle", e);
  while (deborde(corps) && e > min) {
    e = Math.round((e - PAS) * 100) / 100;
    corps.style.setProperty("--echelle", e);
  }
  return !deborde(corps);
}

// Une journée trop longue pour sa page, même en petit : la fin du récit passe
// sur une page de suite, et une page de notes suit pour que chaque journée
// reparte sur une double page (photos à gauche, récit à droite). Les blocs
// sont recopiés plutôt que déplacés : React garde les siens, simplement masqués.
function repartir(feuille) {
  const corps = feuille.querySelector(".texte-corps");
  const suite = feuille.nextElementSibling;
  const notes = suite?.nextElementSibling;
  if (!corps || !suite?.classList.contains("feuille-suite")) return;
  const corpsSuite = suite.querySelector(".texte-corps");
  const blocs = [...corps.children];
  suite.hidden = false;
  if (notes) notes.hidden = false;

  const couper = (k) => {
    blocs.forEach((b, i) => b.classList.toggle("vers-suite", i >= blocs.length - k));
    corpsSuite.replaceChildren(...blocs.slice(blocs.length - k).map((b) => {
      const c = b.cloneNode(true);
      c.classList.remove("vers-suite");
      return c;
    }));
  };

  // La même taille sur les deux pages, la plus grande possible : pour chaque
  // taille, on renvoie le moins de blocs possible vers la suite.
  for (let e = 1; e >= MIN_SUITE - 1e-9; e = Math.round((e - PAS) * 100) / 100) {
    corps.style.setProperty("--echelle", e);
    corpsSuite.style.setProperty("--echelle", e);
    for (let k = 1; k < blocs.length; k++) {
      couper(k);
      if (!deborde(corps)) {
        if (!deborde(corpsSuite)) return;
        break; // renvoyer plus de blocs ne ferait qu'alourdir la suite
      }
    }
  }
}

function ajusterTextes(racine) {
  for (const feuille of racine.querySelectorAll(".feuille-texte")) {
    const corps = feuille.querySelector(".texte-corps");
    if (corps && !reduire(corps)) repartir(feuille);
  }
}

// Les pages sont de vraies pages A4 (210 × 297 mm), identiques à l'impression :
// c'est ce qui permet de mesurer ici ce qui débordera sur le papier. À l'écran,
// elles sont seulement réduites pour tenir dans la largeur disponible.
export default function Ajusteur({ children }) {
  const zone = useRef(null);
  const feuilles = useRef(null);

  useEffect(() => {
    const z = zone.current;
    const f = feuilles.current;
    let fini = false;

    const echelle = () => {
      const s = Math.min(1, z.clientWidth / f.offsetWidth);
      f.style.transform = s < 1 ? `scale(${s})` : "";
      z.style.height = `${f.offsetHeight * s}px`;
    };

    // Prêt quand les polices sont là (elles décident de la longueur du texte)
    // et que toutes les planches ont lu le format de leurs photos.
    const verifier = async () => {
      if (fini || f.querySelector(".planche[data-attente]")) return;
      fini = true;
      await document.fonts?.ready;
      ajusterTextes(f);
      echelle();
      window.__livrePret = true;
      window.dispatchEvent(new Event("livre-pret"));
    };

    const obs = new MutationObserver(verifier);
    obs.observe(f, { subtree: true, attributes: true, childList: true });
    window.addEventListener("resize", echelle);
    echelle();
    verifier();
    return () => { obs.disconnect(); window.removeEventListener("resize", echelle); };
  }, []);

  return (
    <div ref={zone} className="livre-zone">
      <div ref={feuilles} className="livre-feuilles">{children}</div>
    </div>
  );
}
