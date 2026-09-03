# Hooks

Hooks Payload organisés et limités aux préoccupations qui appartiennent réellement au cycle de vie des collections.

Exemples futurs :
- audit ;
- dérivation de champs simples ;
- synchronisation légère ;
- déclenchement contrôlé de jobs.

Les règles métier complexes doivent rester dans `features/` ou `packages/automotive-domain` afin d'éviter un système opaque de hooks imbriqués.
