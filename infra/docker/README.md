# infra/docker

Configuration d'infrastructure locale et conteneurisée.

Au MVP, ne conteneuriser que ce qui apporte une valeur réelle :
- PostgreSQL local si nécessaire ;
- services auxiliaires ajoutés lorsque leur besoin est confirmé.

Redis, moteurs de recherche dédiés et autres services ne sont pas des dépendances obligatoires du bootstrap.
