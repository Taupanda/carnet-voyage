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
