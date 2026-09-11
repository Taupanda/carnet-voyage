-- Deux canaux distincts pour le récap hebdomadaire : la notification et
-- l'e-mail. Jusqu'ici il n'y en avait qu'un, et la case « newsletter » cochée à
-- l'inscription ne commandait rien du tout.

-- Recevoir le récap par e-mail. Préférence de la PERSONNE, donc sur le profil.
alter table public.profiles add column if not exists recap_email boolean not null default false;

-- Reprise de l'ancienne préférence, pour que personne ne perde son abonnement.
update public.profiles set recap_email = true where newsletter is true and recap_email is false;

-- La notification, elle, appartient au NAVIGATEUR : c'est la présence de la
-- ligne dans push_subs qui fait foi, pas une case. Il lui manquait seulement le
-- lien vers le compte, sans quoi on ne pouvait ni savoir qui est abonné, ni
-- cesser d'écrire à quelqu'un qu'on vient de bloquer.
alter table public.push_subs add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists push_subs_user_idx on public.push_subs (user_id);

-- recap_vu : dit que la préférence a été décidée sur la page profil. Sans elle,
-- le choix fait à l'inscription serait repris à chaque chargement et
-- réactiverait l'e-mail juste après un désabonnement.
-- (ajoutée plus bas)

-- `profiles.newsletter` n'est plus lu par l'application. Elle est conservée :
-- la supprimer ferait perdre la trace des choix faits avant cette migration.
alter table public.profiles add column if not exists recap_vu boolean not null default false;
