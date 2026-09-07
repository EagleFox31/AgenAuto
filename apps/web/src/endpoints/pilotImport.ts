import type { Endpoint, PayloadRequest } from 'payload'

const PILOT_BRANCH = 'feat/cameroon-pilot-ingestion'
const EXPECTED_SUMMARY = {
  brand_count: 8,
  model_count: 59,
  specification_definition_count: 22,
  candidate_count: 59,
  blocked_candidate_count: 59,
  ready_for_trim_promotion_count: 0,
} as const

type SpecificationUnit =
  | 'mm'
  | 'cm'
  | 'm'
  | 'l'
  | 'cm3'
  | 'kw'
  | 'hp'
  | 'nm'
  | 'kg'
  | 'km-h'
  | 'l-100km'
  | 'kwh-100km'
  | 'km'
  | 'g-km'
  | 's'
  | 'percent'

type BrandOperation = {
  name: string
  slug: string
  sourceReference: string
  sourceObservedAt: string
}

type ModelOperation = {
  brandSlug: string
  name: string
  slug: string
  sourceReference: string
  sourceObservedAt: string
}

type DefinitionOperation = {
  sourceKey: string
  key: string
  label: string
  category: string
  valueType: string
  unit?: SpecificationUnit
  comparable: boolean
  filterable: boolean
}

type PromotionBlocker = {
  code: string
  note?: string
}

type ReviewCandidateOperation = {
  candidateKey: string
  displayName: string
  brandName: string
  modelName: string
  brandSlug: string
  modelSlug: string
  distributor: string
  sourceReference: string
  sourceObservedAt: string
  sourceType: string
  confidence: 'A' | 'B' | 'C'
  contentHash?: string | null
  variants: string[]
  specifications: unknown[]
  qualityFlags: string[]
  promotionBlockers: PromotionBlocker[]
  rawCandidate: Record<string, unknown>
}

type PilotImportPlan = {
  schema_version: number
  mode: string
  summary: Record<keyof typeof EXPECTED_SUMMARY, number>
  brands: BrandOperation[]
  models: ModelOperation[]
  specificationDefinitions: DefinitionOperation[]
  reviewCandidates: ReviewCandidateOperation[]
}

function htmlPage(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title} — AgenAuto</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; background: #f7f5ef; color: #10242b; }
    main { max-width: 760px; margin: 8vh auto; padding: 40px; }
    .card { background: #fff; border: 1px solid #dfe3e1; padding: 32px; border-radius: 12px; }
    h1 { margin: 0 0 12px; font-size: 32px; }
    p { line-height: 1.55; }
    code { background: #eef1ef; padding: 2px 6px; border-radius: 4px; }
    button, a.button { display: inline-block; border: 0; border-radius: 8px; background: #176d64; color: #fff; padding: 12px 18px; font: inherit; font-weight: 650; text-decoration: none; cursor: pointer; }
    .muted { color: #5e6d70; }
    .ok { color: #176d64; font-weight: 700; }
    .danger { color: #9a2f2f; font-weight: 700; }
  </style>
</head>
<body><main><div class="card">${body}</div></main></body>
</html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

function isAdminRequest(req: PayloadRequest): boolean {
  const user = req.user as { role?: string } | null | undefined
  return user?.role === 'admin'
}

function assertPreviewBranch(): string {
  const branch = process.env.VERCEL_GIT_COMMIT_REF
  const sha = process.env.VERCEL_GIT_COMMIT_SHA

  if (branch !== PILOT_BRANCH) {
    throw new Error(
      `Pilot bootstrap is locked to ${PILOT_BRANCH}; current branch is ${branch || 'unknown'}.`,
    )
  }
  if (!sha || !/^[0-9a-f]{40}$/i.test(sha)) {
    throw new Error('VERCEL_GIT_COMMIT_SHA is unavailable; refusing an unpinned pilot import.')
  }
  return sha
}

function assertPlan(plan: PilotImportPlan): void {
  if (plan.schema_version !== 1 || plan.mode !== 'draft_review_only') {
    throw new Error('Unexpected pilot import plan schema or mode.')
  }

  for (const [key, expected] of Object.entries(EXPECTED_SUMMARY)) {
    const actual = plan.summary[key as keyof typeof EXPECTED_SUMMARY]
    if (actual !== expected) {
      throw new Error(`Pilot plan ${key}: expected ${expected}, found ${actual}.`)
    }
  }

  if (
    plan.brands.length !== EXPECTED_SUMMARY.brand_count ||
    plan.models.length !== EXPECTED_SUMMARY.model_count ||
    plan.specificationDefinitions.length !== EXPECTED_SUMMARY.specification_definition_count ||
    plan.reviewCandidates.length !== EXPECTED_SUMMARY.candidate_count
  ) {
    throw new Error('Pilot plan arrays do not match the validated summary.')
  }

  if (plan.reviewCandidates.some((candidate) => candidate.promotionBlockers.length === 0)) {
    throw new Error(
      'Every pilot candidate must remain blocked pending human Generation/Trim review.',
    )
  }
}

async function loadPinnedPlan(): Promise<PilotImportPlan> {
  const sha = assertPreviewBranch()
  const source = `https://raw.githubusercontent.com/EagleFox31/AgenAuto/${sha}/data/pilot/payload-import-plan.json`
  const response = await fetch(source, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Unable to load the pinned pilot plan (${response.status}).`)
  }
  const plan = (await response.json()) as PilotImportPlan
  assertPlan(plan)
  return plan
}

async function assertEmptyPromotionState(req: PayloadRequest): Promise<void> {
  const [generations, trims] = await Promise.all([
    req.payload.find({
      collection: 'generations',
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: req.user,
      req,
    }),
    req.payload.find({
      collection: 'trims',
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: req.user,
      req,
    }),
  ])

  if (generations.totalDocs !== 0 || trims.totalDocs !== 0) {
    throw new Error('Bootstrap refused: Generation/Trim review has already started.')
  }
}

function canonicalSourceFields(operation: BrandOperation | ModelOperation) {
  return {
    catalogStatus: 'draft' as const,
    sourceType: 'official-dealer' as const,
    sourceReference: operation.sourceReference,
    sourceObservedAt: operation.sourceObservedAt,
    qualityFlags: [
      {
        code: 'pilot_import_draft',
        severity: 'warning' as const,
        note: 'Created from the Cameroon pilot staging dataset; review before publication.',
      },
    ],
  }
}

async function applyPlan(req: PayloadRequest, plan: PilotImportPlan) {
  const brandIds = new Map<string, number>()
  const modelIds = new Map<string, number>()
  const created = { brands: 0, models: 0, definitions: 0, candidates: 0 }

  for (const operation of plan.brands) {
    const found = await req.payload.find({
      collection: 'brands',
      where: { slug: { equals: operation.slug } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: req.user,
      req,
    })
    let doc = found.docs[0]
    if (!doc) {
      doc = await req.payload.create({
        collection: 'brands',
        data: {
          name: operation.name,
          slug: operation.slug,
          ...canonicalSourceFields(operation),
        },
        overrideAccess: false,
        user: req.user,
        req,
      })
      created.brands += 1
    }
    brandIds.set(operation.slug, Number(doc.id))
  }

  for (const operation of plan.models) {
    const brandId = brandIds.get(operation.brandSlug)
    if (!brandId) throw new Error(`Missing staged brand id for ${operation.brandSlug}.`)

    const identityKey = `${brandId}:${operation.slug}`
    const found = await req.payload.find({
      collection: 'vehicle-models',
      where: { identityKey: { equals: identityKey } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: req.user,
      req,
    })
    let doc = found.docs[0]
    if (!doc) {
      doc = await req.payload.create({
        collection: 'vehicle-models',
        data: {
          brand: brandId,
          name: operation.name,
          slug: operation.slug,
          identityKey,
          ...canonicalSourceFields(operation),
        },
        overrideAccess: false,
        user: req.user,
        req,
      })
      created.models += 1
    }
    modelIds.set(`${operation.brandSlug}:${operation.slug}`, Number(doc.id))
  }

  for (const definition of plan.specificationDefinitions) {
    const found = await req.payload.find({
      collection: 'specification-definitions',
      where: { key: { equals: definition.key } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: req.user,
      req,
    })
    if (found.docs[0]) continue

    await req.payload.create({
      collection: 'specification-definitions',
      data: {
        key: definition.key,
        label: definition.label,
        category: definition.category as
          | 'engine'
          | 'performance'
          | 'drivetrain'
          | 'dimensions'
          | 'capacity'
          | 'efficiency'
          | 'chassis'
          | 'safety'
          | 'comfort'
          | 'other',
        valueType: definition.valueType as 'text' | 'number' | 'boolean',
        unit: definition.unit,
        comparable: definition.comparable,
        filterable: definition.filterable,
        catalogStatus: 'draft',
        sourceType: 'manual-verification',
        sourceReference: `pilot-normalization:${definition.sourceKey}`,
        sourceNotes: 'Seeded from normalized pilot keys; review semantics before publication.',
        qualityFlags: [
          {
            code: 'pilot_dictionary_seed',
            severity: 'warning',
            note: 'Definition is a draft dictionary proposal, not a published specification.',
          },
        ],
      },
      overrideAccess: false,
      user: req.user,
      req,
    })
    created.definitions += 1
  }

  for (const candidate of plan.reviewCandidates) {
    const brandId = brandIds.get(candidate.brandSlug)
    const modelId = modelIds.get(`${candidate.brandSlug}:${candidate.modelSlug}`)
    if (!brandId || !modelId) {
      throw new Error(`Missing staged canonical parent for ${candidate.displayName}.`)
    }

    const factual = {
      candidateKey: candidate.candidateKey,
      displayName: candidate.displayName,
      brandName: candidate.brandName,
      modelName: candidate.modelName,
      distributor: candidate.distributor,
      sourceReference: candidate.sourceReference,
      sourceObservedAt: candidate.sourceObservedAt,
      sourceType: candidate.sourceType,
      confidence: candidate.confidence,
      contentHash: candidate.contentHash ?? undefined,
      variants: candidate.variants.map((name) => ({ name })),
      specifications: candidate.specifications,
      qualityFlags: candidate.qualityFlags.map((code) => ({ code })),
      rawCandidate: candidate.rawCandidate,
      proposedBrand: brandId,
      proposedModel: modelId,
    }

    const found = await req.payload.find({
      collection: 'catalog-ingestion-candidates',
      where: { candidateKey: { equals: candidate.candidateKey } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: req.user,
      req,
    })
    const existing = found.docs[0]
    if (!existing) {
      await req.payload.create({
        collection: 'catalog-ingestion-candidates',
        data: {
          ...factual,
          mappingStatus: 'needs_review',
          trimMappings: candidate.variants.map((name) => ({ sourceVariant: name })),
          promotionBlockers: candidate.promotionBlockers,
        },
        overrideAccess: false,
        user: req.user,
        req,
      })
      created.candidates += 1
    } else {
      await req.payload.update({
        collection: 'catalog-ingestion-candidates',
        id: existing.id,
        data: factual,
        overrideAccess: false,
        user: req.user,
        req,
      })
    }
  }

  const [brands, models, definitions, candidates, generations, trims] = await Promise.all([
    req.payload.find({
      collection: 'brands',
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: req.user,
      req,
    }),
    req.payload.find({
      collection: 'vehicle-models',
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: req.user,
      req,
    }),
    req.payload.find({
      collection: 'specification-definitions',
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: req.user,
      req,
    }),
    req.payload.find({
      collection: 'catalog-ingestion-candidates',
      limit: 100,
      depth: 0,
      overrideAccess: false,
      user: req.user,
      req,
    }),
    req.payload.find({
      collection: 'generations',
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: req.user,
      req,
    }),
    req.payload.find({
      collection: 'trims',
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: req.user,
      req,
    }),
  ])

  if (
    brands.totalDocs < EXPECTED_SUMMARY.brand_count ||
    models.totalDocs < EXPECTED_SUMMARY.model_count ||
    definitions.totalDocs < EXPECTED_SUMMARY.specification_definition_count ||
    candidates.totalDocs < EXPECTED_SUMMARY.candidate_count
  ) {
    throw new Error('Post-import counts are below the validated pilot minimums.')
  }
  if (generations.totalDocs !== 0 || trims.totalDocs !== 0) {
    throw new Error('Safety invariant failed: automatic import created a Generation or Trim.')
  }
  if (candidates.docs.some((candidate) => candidate.mappingStatus !== 'needs_review')) {
    throw new Error('Safety invariant failed: a bootstrap candidate is not needs_review.')
  }

  return {
    created,
    persisted: {
      brands: brands.totalDocs,
      models: models.totalDocs,
      definitions: definitions.totalDocs,
      candidates: candidates.totalDocs,
      generations: generations.totalDocs,
      trims: trims.totalDocs,
    },
  }
}

const getEndpoint: Endpoint = {
  path: '/pilot-import',
  method: 'get',
  handler: async (req) => {
    if (!isAdminRequest(req)) {
      return htmlPage(
        'Accès refusé',
        '<h1>Accès refusé</h1><p>Connecte-toi à Payload Admin avec un compte administrateur.</p>',
        403,
      )
    }

    try {
      assertPreviewBranch()
      await assertEmptyPromotionState(req)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pilot bootstrap unavailable.'
      return htmlPage(
        'Import indisponible',
        `<h1>Import indisponible</h1><p class="danger">${message}</p>`,
        409,
      )
    }

    return htmlPage(
      'Import pilote',
      `<h1>Importer le pilote Cameroun</h1>
       <p>Cette opération importe uniquement les données de staging validées : <strong>8 marques, 59 modèles, 22 définitions et 59 candidats de review</strong>.</p>
       <p class="muted">Aucune Generation ni aucun Trim ne sera créé automatiquement. Tous les candidats resteront en <code>needs_review</code>.</p>
       <form method="post" action="/api/pilot-import">
         <input type="hidden" name="confirm" value="import-cameroon-pilot" />
         <button type="submit">Importer le pilote</button>
       </form>`,
    )
  },
}

const postEndpoint: Endpoint = {
  path: '/pilot-import',
  method: 'post',
  handler: async (req) => {
    if (!isAdminRequest(req)) {
      return htmlPage(
        'Accès refusé',
        '<h1>Accès refusé</h1><p>Administrateur Payload requis.</p>',
        403,
      )
    }

    try {
      const readFormData = req.formData
      if (typeof readFormData !== 'function') {
        return htmlPage(
          'Confirmation requise',
          '<h1>Confirmation requise</h1><p>Le formulaire de confirmation est indisponible.</p>',
          400,
        )
      }
      const form = await readFormData.call(req)
      if (form.get('confirm') !== 'import-cameroon-pilot') {
        return htmlPage(
          'Confirmation requise',
          '<h1>Confirmation requise</h1><p>Utilise le formulaire d’import.</p>',
          400,
        )
      }

      assertPreviewBranch()
      await assertEmptyPromotionState(req)
      const plan = await loadPinnedPlan()
      const result = await applyPlan(req, plan)

      return htmlPage(
        'Import terminé',
        `<h1>Import terminé</h1>
         <p class="ok">Le pilote est maintenant chargé dans Payload staging.</p>
         <p><strong>Créés :</strong> ${result.created.brands} marques · ${result.created.models} modèles · ${result.created.definitions} définitions · ${result.created.candidates} candidats.</p>
         <p><strong>Persistés :</strong> ${result.persisted.brands} / ${result.persisted.models} / ${result.persisted.definitions} / ${result.persisted.candidates}.</p>
         <p><strong>Generation / Trim :</strong> ${result.persisted.generations} / ${result.persisted.trims}.</p>
         <p><a class="button" href="/admin/collections/catalog-ingestion-candidates">Ouvrir les candidats de review</a></p>`,
      )
    } catch (error) {
      req.payload.logger.error({ err: error }, 'Pilot staging bootstrap failed')
      const message = error instanceof Error ? error.message : 'Unexpected bootstrap error.'
      return htmlPage(
        'Import échoué',
        `<h1>Import échoué</h1><p class="danger">${message}</p><p>Aucune donnée inconnue n’est inventée. Corrige l’erreur puis relance le bootstrap.</p>`,
        500,
      )
    }
  },
}

export const pilotImportEndpoints: Endpoint[] = [getEndpoint, postEndpoint]
