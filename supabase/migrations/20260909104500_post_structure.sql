-- Structure des posts : trois niveaux au lieu d'une liste plate.
--
-- Le récit était une suite de puces de même poids, où un taxi pour l'aéroport
-- côtoyait une journée de marche. On sépare désormais :
--   ouverture  — 2 à 4 phrases de prose qui posent le fil de la journée
--   recit      — les 3 à 5 moments qui ont fait la journée (colonne existante)
--   en_passant — une ligne pour les trajets ordinaires et l'intendance
--
-- Les deux colonnes sont nullables : les posts déjà publiés restent valides et
-- s'affichent sans chapô ni ligne d'intendance.

alter table public.entries add column if not exists ouverture  text;
alter table public.entries add column if not exists en_passant text;
