"use client";
import { useState, useEffect } from "react";
import AdminGate from "../AdminGate";

const FALLBACK_RATE = 19.5; // 1 € ≈ X MXN (repli si hors-ligne)

export default function Convertisseur() {
  return (
    <AdminGate>
      <ConvBody />
    </AdminGate>
  );
}

function ConvBody() {
  const [rate, setRate] = useState(FALLBACK_RATE); // MXN pour 1 €
  const [date, setDate] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | live | offline
  const [eur, setEur] = useState("");
  const [mxn, setMxn] = useState("");
  const [last, setLast] = useState("eur");

  async function fetchRate() {
    setStatus("loading");
    try {
      const r = await fetch("https://api.frankfurter.app/latest?from=EUR&to=MXN");
      if (!r.ok) throw new Error();
      const d = await r.json();
      const rt = d.rates?.MXN;
      if (!rt) throw new Error();
      setRate(rt);
      setDate(d.date);
      setStatus("live");
      try { localStorage.setItem("carnet-rate", JSON.stringify({ rt, date: d.date })); } catch {}
    } catch {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem("carnet-rate") || "null"); } catch {}
      setRate(saved?.rt || FALLBACK_RATE);
      setDate(saved?.date || null);
      setStatus("offline");
    }
  }

  useEffect(() => { fetchRate(); }, []);

  // Recalcule le champ dérivé quand le taux change (ex. passage repli → live).
  useEffect(() => {
    if (last === "eur" && eur !== "" && !isNaN(Number(eur))) setMxn((Number(eur) * rate).toFixed(2));
    else if (last === "mxn" && mxn !== "" && !isNaN(Number(mxn))) setEur((Number(mxn) / rate).toFixed(2));
  }, [rate]); // eslint-disable-line

  const onEur = (v) => {
    setLast("eur");
    setEur(v);
    setMxn(v === "" || isNaN(Number(v)) ? "" : (Number(v) * rate).toFixed(2));
  };
  const onMxn = (v) => {
    setLast("mxn");
    setMxn(v);
    setEur(v === "" || isNaN(Number(v)) ? "" : (Number(v) / rate).toFixed(2));
  };

  return (
    <main className="container" style={{ paddingTop: 30, paddingBottom: 70, maxWidth: 520 }}>
      <p className="eyebrow">Outil</p>
      <h1 className="display" style={{ fontSize: "clamp(26px, 5vw, 38px)", margin: "8px 0 6px" }}>Peso ⇄ Euro</h1>
      <p style={{ color: "var(--muted)", marginBottom: 22, fontSize: 13.5 }}>
        {status === "loading"
          ? "Récupération du taux…"
          : status === "live"
          ? `Taux du jour · 1 € = ${rate.toFixed(2)} MXN${date ? " · " + date : ""}`
          : `Hors-ligne · taux estimé 1 € = ${rate.toFixed(2)} MXN`}{" "}
        <button className="link-btn" onClick={fetchRate}>actualiser</button>
      </p>

      <div className="conv-card">
        <div className="conv-field">
          <label className="lbl">Pesos (MXN)</label>
          <input className="input conv-input" inputMode="decimal" placeholder="0" value={mxn} onChange={(e) => onMxn(e.target.value)} />
        </div>
        <div className="conv-swap">⇅</div>
        <div className="conv-field">
          <label className="lbl">Euros (€)</label>
          <input className="input conv-input" inputMode="decimal" placeholder="0" value={eur} onChange={(e) => onEur(e.target.value)} />
        </div>
      </div>

      <div className="conv-quick">
        {[50, 100, 200, 500, 1000].map((v) => (
          <button key={"m" + v} className="filter" onClick={() => onMxn(String(v))}>{v} MXN</button>
        ))}
      </div>
      <div className="conv-quick" style={{ marginTop: 8 }}>
        {[10, 20, 50, 100].map((v) => (
          <button key={"e" + v} className="filter" onClick={() => onEur(String(v))}>{v} €</button>
        ))}
      </div>
    </main>
  );
}
