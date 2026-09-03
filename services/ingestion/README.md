# services/ingestion

Service spécialisé optionnel pour les traitements de données qui dépassent raisonnablement Payload/TypeScript.

Cas d'usage :
- parsing complexe de PDF/Excel ;
- collecte web autorisée ;
- matching véhicule avancé ;
- normalisation en masse ;
- scoring de confiance ;
- traitement data lourd.

Principes :
- Python/FastAPI peut être utilisé ici si nécessaire ;
- aucune base métier indépendante ;
- Payload/PostgreSQL reste la source de vérité ;
- toutes les écritures doivent conserver provenance et statut de revue.
