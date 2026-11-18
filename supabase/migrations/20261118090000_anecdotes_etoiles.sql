-- Les anecdotes préférées de l'auteur. Une anecdote n'a pas d'identifiant à
-- elle : c'est une ligne de la colonne entries.anecdote. On la repère par sa
-- journée et son texte (espaces normalisés). Si le texte est réécrit, l'étoile
-- se perd plutôt que de passer sur une autre anecdote.
create table if not exists public.anecdotes_etoiles (
  entry_date date not null,
  texte      text not null,
  created_at timestamptz not null default now(),
  primary key (entry_date, texte)
);

alter table public.anecdotes_etoiles enable row level security;
-- (aucune policy : lecture et écriture via service_role côté serveur)
