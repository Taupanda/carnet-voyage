-- ============ Profil enrichi ============
-- Adresse postale (pour l'envoi d'une carte, d'un souvenir) et abonnement
-- explicite au récap hebdomadaire.
alter table public.profiles add column if not exists adresse    text;
alter table public.profiles add column if not exists newsletter boolean not null default false;

-- ============ Itinéraire prospectif ============
-- Planification à quelques jours d'avance : une ligne par journée, ce qui est
-- déjà fixé (vol, hôtel réservé, rendez-vous) et ce qui reste à caler.
-- L'itinéraire de base (les 12 étapes) vit dans le code : cette table ne porte
-- que les ajustements réels du voyage.
create table if not exists public.plan_jours (
  id         uuid primary key default gen_random_uuid(),
  date       date not null unique,
  activite   text,
  lieu       text,
  -- fixe : ce qui ne bougera plus et sert de point d'ancrage pour caler le reste.
  fixe       boolean not null default false,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plan_jours enable row level security;
-- (aucune policy : accès via service_role uniquement, comme la check-list)

create index if not exists plan_jours_date_idx on public.plan_jours (date);
