-- Kilomètres parcourus dans la journée, affichés dans les indicateurs du post.
--
-- Nullable et sans valeur par défaut : une journée sans distance connue ne doit
-- pas afficher « 0 km », ce qui affirmerait qu'on n'a pas bougé. `numeric`
-- plutôt qu'un entier, pour les courtes distances notées à la décimale.
alter table public.entries add column if not exists km numeric;
