-- Guadalajara passe avant la Basse Californie : elle devient l'étape 4, la
-- Basse Californie l'étape 5. À exécuter UNE SEULE FOIS — la permutation des
-- conseils s'annulerait à la seconde exécution.

-- Les conseils des lecteurs sont rattachés à un numéro d'étape : ceux de la
-- Basse Californie (4) et de Guadalajara (5) suivent leur destination.
update public.recos
set stage = case stage when 4 then 5 when 5 then 4 end
where stage in (4, 5);

-- Un découpage enregistré depuis l'écran « Étapes » garderait l'ancien ordre
-- par-dessus celui du code : on repart des étapes par défaut, à jour.
delete from public.etapes;
