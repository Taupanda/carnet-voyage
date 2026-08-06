-- App Réservations (hôtels / transport) — réservée à l'admin.
-- Accès uniquement via l'API serveur (service_role) : RLS activée sans policy
-- publique => anon/authenticated refusés par défaut. Les billets (PDF/images)
-- vivent dans un bucket de stockage PRIVÉ, servis via URLs signées temporaires.

create table if not exists public.reservations (
  id             uuid primary key default gen_random_uuid(),
  type           text not null default 'hotel',   -- hotel | transport | autre
  titre          text not null,
  lieu           text,
  date_debut     date,
  date_fin       date,
  plateforme_url text,                             -- lien vers la plateforme (Booking, etc.)
  notes          text,
  fichiers       jsonb not null default '[]',      -- [{ path, name, type }] dans le bucket privé
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.reservations enable row level security;
-- (aucune policy : lecture/écriture seulement via service_role côté serveur)

-- Bucket privé pour les billets. `public = false` => pas d'URL publique,
-- accès par URL signée générée côté serveur.
insert into storage.buckets (id, name, public)
values ('tickets', 'tickets', false)
on conflict (id) do nothing;
