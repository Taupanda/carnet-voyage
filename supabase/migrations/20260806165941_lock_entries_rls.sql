-- Verrouille la lecture directe de la table `entries`.
--
-- Contexte : la policy "lecture publique des posts publiés" autorisait le rôle
-- `anon` (clé publique, présente dans le bundle JS) à lire TOUTES les colonnes
-- des posts publiés — dont `reflexion` quand `reflexion_privee = true`. Le
-- masquage n'existait que dans le code Next.js ; une requête Supabase directe
-- avec la clé anon le contournait et exposait les réflexions privées.
--
-- Correctif : les pages publiques lisent désormais `entries` côté serveur via la
-- clé `service_role` (qui contourne la RLS), en filtrant `status = 'published'` et
-- en masquant `reflexion` avant l'envoi au navigateur. On peut donc retirer tout
-- accès `anon`/`authenticated` en lecture directe sur `entries`.
--
-- ⚠️ À appliquer APRÈS le déploiement de l'app basculée sur service_role
--    (sinon le blog public afficherait des pages vides le temps du redéploiement).

alter table public.entries enable row level security;

drop policy if exists "lecture publique des posts publiés" on public.entries;

-- Après cette migration, seul le rôle service_role (côté serveur) peut lire
-- `entries`. anon/authenticated n'ont plus aucune policy de lecture → refus par
-- défaut. Les écritures passaient déjà exclusivement par service_role.
