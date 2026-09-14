-- Date à laquelle l'auteur a regardé ses notifications pour la dernière fois.
--
-- Sans elle, la cloche comptait les conseils et commentaires des sept derniers
-- jours : un seul commentaire la gardait allumée une semaine, même relu dix
-- fois. Le point rouge ne signalait plus une action à faire, seulement une
-- activité récente — de quoi apprendre à l'ignorer.
--
-- Sur le profil et non dans le navigateur : ce qui a été lu sur le téléphone
-- doit l'être aussi sur l'ordinateur.
alter table public.profiles add column if not exists notifs_vues_le timestamptz;
