-- Dépenses de préparation, à distinguer de la vie sur place.
--
-- Le billet d'avion et l'assurance écrasent tous les totaux : avec eux, la
-- moyenne journalière et les paliers hebdomadaires ne veulent plus rien dire.
-- Ce ne sont pas des dépenses de voyage au même titre qu'un repas, elles se
-- marquent donc, et un interrupteur les retire des totaux.
alter table public.depenses add column if not exists preparation boolean not null default false;

-- Amorçage : tout ce qui précède le départ (8 septembre 2026) est de la
-- préparation par définition. Le reste — une assurance souscrite en route, un
-- vol interne — se marque à la main, en une touche depuis l'historique.
update public.depenses set preparation = true where date < '2026-09-08' and preparation = false;
