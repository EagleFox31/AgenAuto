# infra/docker

Infrastructure locale minimale pour AgenAuto.

## PostgreSQL

`compose.yml` démarre PostgreSQL 16 pour Payload :

```bash
pnpm db:up
```

Caractéristiques :

- image `postgres:16-alpine` ;
- base `agenauto` ;
- utilisateur local `agenauto` ;
- port publié uniquement sur `127.0.0.1:5432` ;
- volume Docker persistant ;
- healthcheck `pg_isready`.

La configuration utilise `POSTGRES_HOST_AUTH_METHOD=trust` afin d'éviter de versionner un mot de passe de développement. Elle est acceptable uniquement parce que le port est lié à l'interface loopback locale.

**Ne jamais réutiliser cette configuration en staging ou en production.** Les environnements distants doivent utiliser un fournisseur PostgreSQL sécurisé et une `DATABASE_URL` stockée dans le gestionnaire de secrets de la plateforme de déploiement.

## Commandes

```bash
pnpm db:up
pnpm db:logs
pnpm db:down
```

Reset complet de la base locale :

```bash
docker compose -f infra/docker/compose.yml down -v
pnpm db:up
```

## Ce qui n'est pas inclus

Redis, OpenSearch/Meilisearch, workers séparés et autres services ne font pas partie du bootstrap. Ils ne seront ajoutés que lorsqu'un besoin produit ou opérationnel mesuré le justifie.
