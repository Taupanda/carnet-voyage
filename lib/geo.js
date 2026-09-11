// Distance entre deux points du globe, en kilomètres.
//
// Formule de haversine : c'est une distance À VOL D'OISEAU. Elle sert à
// proposer un ordre de grandeur quand l'auteur n'a pas noté ses kilomètres
// lui-même, jamais à l'affirmer — une route réelle est toujours plus longue,
// souvent d'un quart. Ce qui est publié reste ce qu'il a validé.
const RAYON_TERRE_KM = 6371;

const enRadians = (d) => (d * Math.PI) / 180;

export function distanceKm(a, b) {
  if (!a || !b) return null;
  const [lat1, lng1, lat2, lng2] = [a.lat, a.lng, b.lat, b.lng].map(Number);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;
  if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90 || Math.abs(lng1) > 180 || Math.abs(lng2) > 180) return null;

  const dLat = enRadians(lat2 - lat1);
  const dLng = enRadians(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(enRadians(lat1)) * Math.cos(enRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Arrondi utile : au kilomètre près au-delà de 10 km, au dixième en deçà —
// personne n'a besoin de trois décimales sur un trajet de bus.
export function arrondiKm(km) {
  if (!Number.isFinite(km) || km < 0) return null;
  return km >= 10 ? Math.round(km) : Math.round(km * 10) / 10;
}

export function formateKm(km) {
  // Une distance absente n'est pas une distance nulle : sans ce garde,
  // Number(null) vaut 0 et le post afficherait « 0 km » là où il ne doit
  // rien afficher du tout.
  if (km === null || km === undefined || km === "") return null;
  const v = arrondiKm(Number(km));
  if (v === null) return null;
  return `${v.toLocaleString("fr-FR")} km`;
}
