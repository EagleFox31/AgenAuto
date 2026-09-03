# apps/web

Application déployable principale AgenAuto : **Next.js + Payload CMS + PostgreSQL**.

## Responsabilités actuelles

- expérience publique Next.js ;
- Payload Admin sur `/admin` ;
- API REST Payload sous `/api/*` ;
- GraphQL Payload sous `/api/graphql` ;
- authentification des utilisateurs administrateurs ;
- configuration PostgreSQL et migrations Payload.

Les domaines automobiles seront ajoutés dans les issues suivantes. Ce bootstrap ne crée volontairement que la collection `users` nécessaire au Headless Core.

## Prérequis

- Node.js `>= 24.15.0` ;
- pnpm 10 ou 11 ;
- Docker Desktop / Docker Engine pour PostgreSQL local.

Depuis la racine du repository :

```bash
corepack enable
corepack prepare pnpm@10.20.0 --activate
pnpm install
```

## Base PostgreSQL locale

```bash
pnpm db:up
```

Le conteneur PostgreSQL est exposé uniquement sur `127.0.0.1:5432` et utilise `trust` **uniquement pour le développement local**. Cette configuration ne doit jamais être reprise en production.

## Variables d'environnement

Copier le fichier d'exemple :

### PowerShell

```powershell
Copy-Item apps/web/.env.example apps/web/.env
```

### Bash

```bash
cp apps/web/.env.example apps/web/.env
```

Générer ensuite un secret local :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Remplacer la valeur de `PAYLOAD_SECRET` dans `apps/web/.env` par la valeur générée.

## Démarrer AgenAuto

Depuis la racine :

```bash
pnpm dev
```

Puis ouvrir :

- application : `http://localhost:3000` ;
- Payload Admin : `http://localhost:3000/admin`.

Au premier accès à `/admin`, Payload propose la création du premier utilisateur administrateur.

## Migrations PostgreSQL

En développement, Payload/Drizzle utilise son mode `push` pour synchroniser rapidement le schéma local. Les migrations versionnées restent la source de vérité pour les environnements non-développement.

Commandes disponibles depuis la racine :

```bash
pnpm migrate:create -- nom-de-migration
pnpm migrate
pnpm migrate:status
```

Ne pas mélanger manuellement `push` et `migrate` sur une même base de développement pour essayer de « réparer » un schéma. En cas de doute, recréer la base locale puis rejouer les migrations.

## Arrêter PostgreSQL

```bash
pnpm db:down
```

Pour supprimer également le volume local et repartir d'une base vide :

```bash
docker compose -f infra/docker/compose.yml down -v
```
