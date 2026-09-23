-- Les étapes du voyage devenaient fausses dès qu'un séjour s'allongeait d'un
-- jour : elles étaient écrites dans le code. Cette table porte les ajustements
-- faits depuis l'écran « Étapes ». Vide, le site affiche les étapes par défaut
-- de lib/stages.js ; remplie, chaque ligne remplace l'étape de même numéro.
--
-- Pas de couleur ni d'ajout d'étape ici : le nombre d'étapes et leurs couleurs
-- restent dans le code, où la page Itinéraire les apparie rang par rang.
create table if not exists public.etapes (
  n          int primary key,
  nom        text not null,
  debut      date not null,
  fin        date not null,
  updated_at timestamptz not null default now(),
  check (debut <= fin)
);

alter table public.etapes enable row level security;
-- (aucune policy : lecture et écriture via service_role côté serveur)
