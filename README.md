# Carnet de voyage — Mexique & Amérique centrale

Journal de bord conversationnel : une interview guidée par IA chaque soir, un blog public qui s'alimente automatiquement.

- `/` — le blog public (posts publiés uniquement)
- `/journal` — ton espace privé (protégé par mot de passe)

## Déploiement (une seule fois, ~15 minutes)

### 1. Mettre le code sur GitHub
1. Sur github.com, clique **New repository**, nomme-le `carnet-voyage`, laisse en **Private**, crée-le
2. Sur la page du dépôt vide, clique **uploading an existing file**
3. Glisse-dépose TOUT le contenu de ce dossier (les dossiers `app`, `lib`, et les fichiers `package.json`, etc.)
4. Clique **Commit changes**

### 2. Connecter Vercel
1. Sur vercel.com, clique **Add New → Project**
2. Importe le dépôt `carnet-voyage` (autorise l'accès GitHub si demandé)
3. AVANT de cliquer Deploy, ouvre **Environment Variables** et ajoute ces 5 variables :

| Nom | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (Supabase → Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key (même page) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (même page — SECRET) |
| `ANTHROPIC_API_KEY` | ta clé API Anthropic (SECRET) |
| `ADMIN_PASSWORD` | un mot de passe de ton choix pour accéder à /journal |

4. Clique **Deploy** — 2 minutes plus tard ton site est en ligne à l'adresse `xxx.vercel.app`

### 3. Tester
- Ouvre `https://ton-site.vercel.app/journal` → mot de passe → interview
- Publie une journée test → vérifie qu'elle apparaît sur `https://ton-site.vercel.app`

## Prérequis côté Supabase (déjà fait si tu as suivi le guide)
Le script `setup-supabase.sql` doit avoir été exécuté, plus la ligne :
```sql
alter table entries add column if not exists photos jsonb default '[]';

```

## Sécurité
- Les clés secrètes ne vivent QUE dans les variables Vercel, jamais dans le code
- Le blog public ne peut lire que les posts publiés (règle appliquée par la base elle-même)
- Toute écriture passe par le serveur et exige le mot de passe admin
