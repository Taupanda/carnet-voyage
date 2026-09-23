-- Le résumé hebdomadaire devient illustré : une accroche, des chapitres
-- rattachés à des jours, et les photos de ces jours. Le tout tient dans une
-- colonne jsonb ; `contenu` garde la version texte seul (aperçu de la
-- notification, repli). Les résumés déjà publiés, sans mise en page, restent
-- affichés comme avant.
alter table public.weekly_recaps add column if not exists mise_en_page jsonb;
