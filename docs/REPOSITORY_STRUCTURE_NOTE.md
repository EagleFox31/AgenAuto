# Supporting app-local folders

En complément de l'arborescence principale, `apps/web/src/` contient aussi :

- `components/` pour les composants spécifiques à AgenAuto avant promotion éventuelle vers `packages/ui` ;
- `types/` pour les types locaux qui ne sont ni des invariants automobiles réutilisables ni des contrats inter-services.

Ces dossiers restent secondaires et ne modifient pas les frontières architecturales définies dans `REPOSITORY_STRUCTURE.md`.
