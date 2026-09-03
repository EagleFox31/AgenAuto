# AppFactory

Ce dossier matérialise la façon dont AgenAuto exploite l'approche AppFactory.

Il ne contient pas une copie de toutes les dépendances du produit. Il documente les briques réutilisables et les décisions **Build / Reuse / Adapt / Integrate**.

Structure :
- `registry/` : catalogue des briques retenues ou envisagées ;
- `sources/` : références open source évaluées, avec licence et usage autorisé ;
- les implémentations réelles restent dans `packages/`, `apps/` ou `services/`.

Principe : **l'architecture d'AgenAuto reste souveraine ; les repos GitHub servent de briques ou de références, jamais de produit à déformer.**
