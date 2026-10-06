// Le rappel du soir part à 23 h sur place, quelle que soit l'étape : son
// fuseau décide de l'heure UTC, et la journée rappelée est celle du lieu.
import test from "node:test";
import assert from "node:assert/strict";
import { ETAPES_DEFAUT, soireeEnCours } from "../lib/stages.js";

const a = (iso) => new Date(iso);

test("Basse Californie (UTC-7) : 23 h sur place = 6 h UTC, journée de la veille UTC", () => {
  const s = soireeEnCours(a("2026-10-07T06:10:00Z"), ETAPES_DEFAUT);
  assert.equal(s.date, "2026-10-06");
  assert.equal(s.etape.nom, "Basse Californie");
  assert.equal(soireeEnCours(a("2026-10-07T05:10:00Z"), ETAPES_DEFAUT), null, "22 h sur place : rien");
  assert.equal(soireeEnCours(a("2026-10-07T04:10:00Z"), ETAPES_DEFAUT), null, "21 h sur place : rien");
});

test("Mexique central (UTC-6) : 5 h UTC", () => {
  const s = soireeEnCours(a("2026-10-20T05:45:00Z"), ETAPES_DEFAUT);
  assert.equal(s.date, "2026-10-19");
  assert.equal(s.etape.nom, "Côte oaxaqueña");
  assert.equal(soireeEnCours(a("2026-10-20T06:10:00Z"), ETAPES_DEFAUT), null);
});

test("Quintana Roo (UTC-5) : 4 h UTC", () => {
  assert.equal(soireeEnCours(a("2026-11-15T04:30:00Z"), ETAPES_DEFAUT).date, "2026-11-14");
});

test("Amérique centrale : Belize, Guatemala, Salvador à 5 h UTC", () => {
  for (const [iso, nom] of [["2026-11-28T05:05:00Z", "Belize"], ["2026-12-05T05:05:00Z", "Guatemala"], ["2026-12-15T05:05:00Z", "Salvador"]]) {
    assert.equal(soireeEnCours(a(iso), ETAPES_DEFAUT).etape.nom, nom);
  }
});

test("chaque jour du voyage a exactement un rappel parmi les trois passages (4, 5, 6 h UTC)", () => {
  for (let t = Date.parse("2026-09-08T12:00:00Z"); t <= Date.parse("2026-12-17T12:00:00Z"); t += 86400000) {
    const lendemain = new Date(t + 86400000).toISOString().slice(0, 10);
    const passages = [4, 5, 6].map((h) => soireeEnCours(new Date(`${lendemain}T0${h}:30:00Z`), ETAPES_DEFAUT)).filter(Boolean);
    const jour = new Date(t).toISOString().slice(0, 10);
    // y compris les soirs de changement de fuseau, à l'entrée et à la sortie d'une étape
    assert.equal(passages.length, 1, `${jour} : ${passages.length} rappels`);
    assert.equal(passages[0].date, jour);
  }
});

test("hors du voyage : aucun rappel", () => {
  assert.equal(soireeEnCours(a("2027-01-10T05:30:00Z"), ETAPES_DEFAUT), null);
});
