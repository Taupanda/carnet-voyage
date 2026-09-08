-- Vocabulaire (admin) : les mots appris en chemin, en français et en espagnol.
-- Même régime que la check-list et le coffre : RLS activée sans policy publique,
-- donc lecture/écriture uniquement via service_role côté serveur.

create table if not exists public.vocabulaire (
  id           uuid primary key default gen_random_uuid(),
  fr           text not null,
  es           text not null,
  -- langue réellement saisie (fr | es) : dit de quel côté vient le mot appris et
  -- donc dans quelle langue sont les alternatives.
  source       text not null default 'fr',
  -- autres traductions proposées, dans la langue CIBLE : permet de changer de mot
  -- plus tard (synonymes, variantes régionales) sans redemander une traduction.
  alternatives jsonb not null default '[]',
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.vocabulaire enable row level security;
-- (aucune policy : accès via service_role uniquement)

-- Un mot peut avoir plusieurs sens, donc plusieurs traductions légitimes :
-- on n'interdit que le doublon exact, insensible à la casse.
create unique index if not exists vocabulaire_paire_unique
  on public.vocabulaire (lower(fr), lower(es));

create index if not exists vocabulaire_created_at_idx
  on public.vocabulaire (created_at desc);
