# AgenAuto Headless Core

AgenAuto uses **Payload CMS** as its Headless Core: the reusable data, administration, authentication and API layer on which the automotive product domain is built.

This document is a concise implementation companion to `ADR-001` and `ARCHITECTURE.md`.

## Payload responsibilities

- collections and relationships for canonical vehicle data;
- dealers and locations;
- offers, prices, promotions and availability;
- users and dealer organizations;
- authentication and access control;
- Admin Panel for internal data operations;
- media/uploads;
- leads and test-drive requests;
- hooks, audit events and validation;
- PostgreSQL migrations;
- REST / Local API;
- appropriate background jobs.

## Product-domain responsibilities

Payload does not replace the AgenAuto domain.

Custom modules implement:

- specification dictionary and normalization;
- comparison engine;
- discovery/search policies;
- provenance and freshness logic;
- ingestion matching and deduplication;
- data quality review;
- future recommendation and TCO logic.

## Python boundary

Python is retained only where it gives the product leverage:

- Excel/CSV parsing at scale;
- data cleaning and transformation;
- complex matching;
- permitted website collectors;
- document extraction;
- batch quality analysis.

The Python service communicates with the Headless Core through explicit contracts. It is not a second source of truth.

## AppFactory interpretation

Payload becomes a reusable **Headless Core Brick** within the AppFactory.

AgenAuto configures that brick with automotive collections, access policies, domain hooks and custom APIs rather than rebuilding generic backend capabilities for every application.
