"use client";
import PhotoPicker from "./journal/PhotoPicker";

export const RENCONTRE_VIDE = {
  prenom: "", nom: "", pays: "", lieu_rencontre: "",
  activites: "", anecdote: "", reseaux: "", photo_url: null,
};

// Le formulaire d'une rencontre, en un seul endroit.
//
// Il vivait dans le panneau du journal, et la page /rencontres — celle qu'on
// ouvre depuis les Outils — n'en avait aucune trace : on pouvait y lire ses
// rencontres sans jamais pouvoir en corriger une. Les deux écrans partagent
// maintenant cette définition, donc ils ne peuvent plus diverger.
export default function RencontreForm({ valeur, onChange, onEnvoyerPhoto, onEnregistrer, onAnnuler, busy, err }) {
  const maj = (champ) => (e) => onChange({ ...valeur, [champ]: e.target.value });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {valeur.photo_url ? (
          <img src={valeur.photo_url} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <span className="avatar avatar-fallback" style={{ width: 64, height: 64, fontSize: 26 }}>
            {(valeur.prenom || "?")[0]?.toUpperCase()}
          </span>
        )}
        <PhotoPicker onFiles={onEnvoyerPhoto} busy={busy} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input className="input" placeholder="Prénom *" value={valeur.prenom || ""} onChange={maj("prenom")} />
        <input className="input" placeholder="Nom" value={valeur.nom || ""} onChange={maj("nom")} />
      </div>
      <input className="input" placeholder="Pays d'origine" value={valeur.pays || ""} onChange={maj("pays")} />
      <input className="input" placeholder="Lieu de rencontre" value={valeur.lieu_rencontre || ""} onChange={maj("lieu_rencontre")} />
      <input className="input" placeholder="Activités menées ensemble" value={valeur.activites || ""} onChange={maj("activites")} />
      <textarea className="input" rows={2} placeholder="Une anecdote" value={valeur.anecdote || ""} onChange={maj("anecdote")} />
      <div>
        <label className="lbl">🔒 Réseaux sociaux (privé — jamais affiché publiquement)</label>
        <input className="input" placeholder="@instagram, WhatsApp, email…" value={valeur.reseaux || ""} onChange={maj("reseaux")} />
      </div>

      {err && <p className="error">{err}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={onAnnuler}>Annuler</button>
        <button className="btn" style={{ flex: 1 }} onClick={onEnregistrer} disabled={busy}>{busy ? "…" : "Enregistrer"}</button>
      </div>
    </div>
  );
}
