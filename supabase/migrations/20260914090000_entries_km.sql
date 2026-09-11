-- Kilomètres de la journée, affichés dans les indicateurs du post.
--
-- Trois colonnes plutôt qu'une : ce qui a été marché, et les trajets faits, avec
-- leur mode. Une journée enchaîne souvent plusieurs modes — taxi jusqu'à la gare
-- routière, bus de nuit, colectivo — d'où une liste et non un champ.
--
-- `km` reste : les posts écrits avant la distinction y ont leur total, et on ne
-- veut pas le leur faire perdre. L'affichage retombe dessus quand les deux
-- autres colonnes sont vides.
--
-- Tout est nullable, sans valeur par défaut autre que la liste vide : une
-- journée sans distance connue ne doit pas afficher « 0 km », ce qui
-- affirmerait qu'on n'a pas bougé.
alter table public.entries add column if not exists km numeric;
alter table public.entries add column if not exists km_marche numeric;
alter table public.entries add column if not exists trajets jsonb not null default '[]'::jsonb;
