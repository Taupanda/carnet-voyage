-- Migration consolidée : vocabulaire, structure des posts, abonnement, planning.
--
-- Elle remplace trois migrations antérieures jamais appliquées. Deux colonnes
-- qu'elles prévoyaient — entries.en_passant et profiles.adresse — ont été
-- abandonnées entre-temps et ne sont donc pas créées ici.
--
-- Entièrement idempotente : relançable sans risque.

-- ============ Vocabulaire (admin) ============
-- Les mots appris en chemin, en français et en espagnol.
create table if not exists public.vocabulaire (
  id           uuid primary key default gen_random_uuid(),
  fr           text not null,
  es           text not null,
  -- langue réellement saisie (fr | es) : dit de quel côté vient le mot appris
  -- et donc dans quelle langue sont les alternatives.
  source       text not null default 'fr',
  -- autres traductions proposées, dans la langue CIBLE : permet de changer de
  -- mot plus tard (synonymes, variantes régionales) sans redemander l'IA.
  alternatives jsonb not null default '[]',
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.vocabulaire enable row level security;
-- (aucune policy : accès via service_role uniquement)

-- Un mot peut avoir plusieurs sens, donc plusieurs traductions légitimes :
-- seul le doublon exact est refusé, insensible à la casse.
create unique index if not exists vocabulaire_paire_unique
  on public.vocabulaire (lower(fr), lower(es));
create index if not exists vocabulaire_created_at_idx
  on public.vocabulaire (created_at desc);

-- ============ Structure des posts ============
-- Le récit était une liste de puces de même poids. Il se lit désormais en deux
-- niveaux : une ouverture en prose qui pose la journée, puis 3 à 5 moments
-- (colonne `recit`, déjà existante). Nullable : les posts déjà publiés restent
-- valides et s'affichent simplement sans chapô.
alter table public.entries add column if not exists ouverture text;

-- ============ Abonnement au récap hebdomadaire ============
alter table public.profiles add column if not exists newsletter boolean not null default false;

-- ============ Planning prospectif (admin) ============
-- Une ligne par journée du voyage : ce qui est déjà fixé (vol, hôtel réservé,
-- rendez-vous) et ce qui reste à caler. L'itinéraire de base — les 12 étapes —
-- vit dans le code ; cette table ne porte que les ajustements réels.
create table if not exists public.plan_jours (
  id         uuid primary key default gen_random_uuid(),
  date       date not null unique,
  activite   text,
  lieu       text,
  -- fixe : ce qui ne bougera plus et sert de point d'ancrage pour le reste.
  fixe       boolean not null default false,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.plan_jours enable row level security;
-- (aucune policy : accès via service_role uniquement)
create index if not exists plan_jours_date_idx on public.plan_jours (date);
