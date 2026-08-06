-- Livre d'or : les "mots" peuvent être publics (visibles de tous) ou privés
-- (seul l'auteur du carnet les lit, via l'inbox admin).

alter table public.messages add column if not exists public boolean not null default false;

-- Lecture publique des mots marqués publics (en plus de "je vois mes propres mots").
drop policy if exists "mots publics visibles" on public.messages;
create policy "mots publics visibles" on public.messages for select using (public = true);
