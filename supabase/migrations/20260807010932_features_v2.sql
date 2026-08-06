-- Nouvelles fonctionnalités : coffre documents, résumés hebdo, check-list, réactions.

-- ============ Coffre documents (admin) ============
-- Passeport, assurance, contacts d'urgence… Fichiers dans un bucket PRIVÉ.
create table if not exists public.coffre_docs (
  id         uuid primary key default gen_random_uuid(),
  categorie  text not null default 'autre',   -- passeport | assurance | sante | contact | autre
  titre      text not null,
  notes      text,
  fichiers   jsonb not null default '[]',      -- [{ path, name, type }]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.coffre_docs enable row level security;
-- (aucune policy : accès via service_role uniquement, comme les réservations)
insert into storage.buckets (id, name, public)
values ('coffre', 'coffre', false)
on conflict (id) do nothing;

-- ============ Résumés hebdo (admin génère → valide → publie) ============
create table if not exists public.weekly_recaps (
  id           uuid primary key default gen_random_uuid(),
  semaine_debut date not null,                 -- lundi de la semaine couverte
  titre        text,
  contenu      text,
  status       text not null default 'draft',  -- draft | published
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (semaine_debut)
);
alter table public.weekly_recaps enable row level security;
-- lecture publique des résumés publiés (brouillons : service_role uniquement)
drop policy if exists "recaps publies publics" on public.weekly_recaps;
create policy "recaps publies publics" on public.weekly_recaps
  for select using (status = 'published');

-- ============ Check-list voyage (admin) ============
create table if not exists public.checklist_items (
  id         uuid primary key default gen_random_uuid(),
  groupe     text not null default 'general',  -- avant_depart | valise | administratif | general
  texte      text not null,
  done       boolean not null default false,
  ordre      int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.checklist_items enable row level security;
-- (aucune policy : accès via service_role uniquement)

-- ============ Réactions rapides (public, comme les likes) ============
create table if not exists public.reactions (
  id         uuid primary key default gen_random_uuid(),
  entry_date date not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (entry_date, user_id, emoji)
);
alter table public.reactions enable row level security;
drop policy if exists "reactions visibles par tous" on public.reactions;
drop policy if exists "je reagis" on public.reactions;
drop policy if exists "je retire ma reaction" on public.reactions;
create policy "reactions visibles par tous" on public.reactions for select using (true);
create policy "je reagis" on public.reactions for insert with check (auth.uid() = user_id);
create policy "je retire ma reaction" on public.reactions for delete using (auth.uid() = user_id);
