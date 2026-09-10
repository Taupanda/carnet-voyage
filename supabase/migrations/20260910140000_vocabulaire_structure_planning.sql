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

-- ============ Modération des membres ============
-- Bloquer quelqu'un doit l'empêcher d'écrire, pas seulement le masquer dans une
-- liste : le blocage est donc appliqué par la base, pas par l'interface.
alter table public.profiles add column if not exists bloque boolean not null default false;

-- Policies RESTRICTIVES : elles s'ajoutent aux policies d'écriture existantes
-- sans avoir à les connaître ni à les modifier. Une policy permissive autorise,
-- une restrictive impose une condition supplémentaire à toutes les autres.
drop policy if exists "compte non bloque" on public.comments;
create policy "compte non bloque" on public.comments as restrictive for insert
  with check (not exists (select 1 from public.profiles p where p.id = auth.uid() and p.bloque));

drop policy if exists "compte non bloque" on public.messages;
create policy "compte non bloque" on public.messages as restrictive for insert
  with check (not exists (select 1 from public.profiles p where p.id = auth.uid() and p.bloque));

drop policy if exists "compte non bloque" on public.recos;
create policy "compte non bloque" on public.recos as restrictive for insert
  with check (not exists (select 1 from public.profiles p where p.id = auth.uid() and p.bloque));

-- ============ Notes du jour (admin) ============
-- Le calepin de la journée : ce qu'on jette en trois secondes sur le moment,
-- avant d'écrire le post le soir. Sans lui, tout repose sur la mémoire de fin
-- de journée — et c'est ce qui se perd en premier.
create table if not exists public.notes_jour (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  texte      text not null,
  -- passée à true quand la note a servi à écrire le post : ce qui reste à false
  -- signale ce qui a été oublié en route.
  utilisee   boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notes_jour enable row level security;
-- (aucune policy : accès via service_role uniquement)

create index if not exists notes_jour_date_idx on public.notes_jour (date, created_at);
