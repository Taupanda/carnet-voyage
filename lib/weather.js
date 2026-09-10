// Codes météo WMO -> affichage
export function meteoInfo(code) {
  if (code === 0) return { emoji: "☀️", label: "Ensoleillé" };
  if (code <= 2) return { emoji: "🌤️", label: "Éclaircies" };
  if (code === 3) return { emoji: "☁️", label: "Couvert" };
  if (code <= 48) return { emoji: "🌫️", label: "Brume" };
  if (code <= 57) return { emoji: "🌦️", label: "Bruine" };
  if (code <= 67) return { emoji: "🌧️", label: "Pluie" };
  if (code <= 77) return { emoji: "🌨️", label: "Neige" };
  if (code <= 82) return { emoji: "🌧️", label: "Averses" };
  if (code >= 95) return { emoji: "⛈️", label: "Orage" };
  return { emoji: "🌡️", label: "" };
}

export async function fetchMeteo(lat, lng, date) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${date}&end_date=${date}`;
    const r = await fetch(url);
    const d = await r.json();
    if (!d.daily) return null;
    return {
      code: d.daily.weather_code[0],
      tmax: Math.round(d.daily.temperature_2m_max[0]),
      tmin: Math.round(d.daily.temperature_2m_min[0]),
    };
  } catch {
    return null;
  }
}

// Météo du jour + tranches horaires, pour le bandeau de l'accueil. Même service
// qu'au-dessus (Open-Meteo, sans clé), un paramètre `hourly` en plus.
export async function fetchMeteoJour(lat, lng) {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code` +
      `&daily=temperature_2m_min&forecast_days=1&timezone=auto`;
    const r = await fetch(url);
    const d = await r.json();
    if (!d.current || !d.hourly) return null;

    // Une tranche toutes les deux heures, à partir de l'heure en cours.
    const maintenant = new Date().getHours();
    const heures = [];
    for (let h = maintenant; h < 24 && heures.length < 6; h += 2) {
      if (d.hourly.temperature_2m[h] == null) continue;
      heures.push({
        h,
        t: Math.round(d.hourly.temperature_2m[h]),
        code: d.hourly.weather_code[h],
      });
    }
    return {
      t: Math.round(d.current.temperature_2m),
      code: d.current.weather_code,
      tmin: d.daily?.temperature_2m_min?.[0] != null ? Math.round(d.daily.temperature_2m_min[0]) : null,
      heures,
    };
  } catch {
    return null;
  }
}
