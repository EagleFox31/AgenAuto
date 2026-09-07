import type { Endpoint, PayloadRequest } from 'payload'

import { normalizeSlug, relationshipId } from '../lib/automotive/identity'

type RelationshipValue = string | number | { id?: string | number; name?: string; label?: string } | null

type CandidateVariant = {
  name?: string | null
}

type CandidateTrimMapping = {
  id?: string | number | null
  sourceVariant?: string | null
  proposedTrim?: RelationshipValue
}

type PromotionBlocker = {
  id?: string | number | null
  code?: string | null
  note?: string | null
}

type CandidateDoc = {
  id: string | number
  displayName?: string | null
  brandName?: string | null
  modelName?: string | null
  distributor?: string | null
  sourceReference?: string | null
  sourceObservedAt?: string | null
  confidence?: string | null
  mappingStatus?: string | null
  proposedBrand?: RelationshipValue
  proposedModel?: RelationshipValue
  proposedGeneration?: RelationshipValue
  variants?: CandidateVariant[] | null
  trimMappings?: CandidateTrimMapping[] | null
  promotionBlockers?: PromotionBlocker[] | null
  specifications?: unknown
  rawCandidate?: unknown
  reviewNotes?: string | null
}

type CanonicalDoc = {
  id: string | number
  name?: string | null
  model?: RelationshipValue
  generation?: RelationshipValue
}

const STATUS_LABELS: Record<string, string> = {
  needs_review: 'Needs review',
  mapped: 'Mapped',
  approved: 'Approved for promotion',
  rejected: 'Rejected',
  promoted: 'Promoted',
}

function isAdminRequest(req: PayloadRequest): boolean {
  const user = req.user as { role?: string } | null | undefined
  return user?.role === 'admin'
}

function escapeHTML(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function safeExternalURL(value: unknown): string | null {
  try {
    const url = new URL(String(value ?? ''))
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function htmlPage(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHTML(title)} — AgenAuto</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f7f5ef; color: #10242b; }
    main { max-width: 1180px; margin: 0 auto; padding: 40px 24px 64px; }
    h1 { margin: 0; font-size: 34px; letter-spacing: -0.03em; }
    h2 { margin: 0 0 16px; font-size: 21px; }
    h3 { margin: 0 0 10px; font-size: 16px; }
    p { line-height: 1.55; }
    a { color: #176d64; }
    code { background: #eef1ef; padding: 2px 6px; border-radius: 4px; }
    pre { margin: 0; padding: 16px; overflow: auto; background: #10242b; color: #f7f5ef; border-radius: 8px; font-size: 12px; line-height: 1.45; max-height: 420px; }
    .topbar { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 28px; }
    .eyebrow { margin: 0 0 6px; color: #5f6f70; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    .muted { color: #5f6f70; }
    .grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(320px, .85fr); gap: 18px; }
    .stack { display: grid; gap: 18px; }
    .card { background: white; border: 1px solid #dfe3e1; border-radius: 12px; padding: 22px; }
    .compact { padding: 16px 18px; }
    .row { display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; }
    .kv { display: grid; grid-template-columns: 150px 1fr; gap: 10px; padding: 7px 0; border-bottom: 1px solid #edf0ee; }
    .kv:last-child { border-bottom: 0; }
    .badge { display: inline-flex; align-items: center; padding: 5px 9px; border: 1px solid #ced8d5; border-radius: 999px; font-size: 12px; font-weight: 700; background: #f5f8f7; }
    .badge.ok { border-color: #acd7cf; background: #edf8f5; color: #176d64; }
    .badge.warn { border-color: #e5c892; background: #fff8e8; color: #795516; }
    .badge.danger { border-color: #e5b7b7; background: #fff1f1; color: #8a2f2f; }
    .button, button { display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 8px; background: #176d64; color: white; padding: 10px 14px; font: inherit; font-weight: 700; text-decoration: none; cursor: pointer; }
    .button.secondary, button.secondary { background: #eef1ef; color: #10242b; border: 1px solid #d8dfdc; }
    .button.danger, button.danger { background: #8a2f2f; }
    form.inline { display: grid; gap: 12px; }
    label { display: grid; gap: 6px; font-size: 13px; font-weight: 700; }
    input, textarea { width: 100%; border: 1px solid #ccd6d3; border-radius: 7px; background: white; color: #10242b; padding: 10px 11px; font: inherit; }
    textarea { min-height: 90px; resize: vertical; }
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
    .form-grid .wide { grid-column: 1 / -1; }
    .blocker { border-left: 3px solid #d5a23a; padding: 8px 0 8px 14px; margin: 10px 0; }
    .blocker strong { display: block; margin-bottom: 3px; }
    .checklist { display: grid; gap: 9px; }
    .check { display: flex; gap: 10px; align-items: flex-start; }
    .check b { width: 20px; flex: 0 0 20px; text-align: center; }
    table { width: 100%; border-collapse: collapse; background: white; }
    th, td { padding: 12px 10px; border-bottom: 1px solid #e8ecea; text-align: left; vertical-align: middle; }
    th { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #6b7778; }
    .table-wrap { overflow: auto; border: 1px solid #dfe3e1; border-radius: 12px; background: white; }
    .notice { margin: 0 0 18px; padding: 12px 14px; background: #edf8f5; border: 1px solid #acd7cf; border-radius: 8px; color: #176d64; font-weight: 700; }
    .error { margin: 0 0 18px; padding: 12px 14px; background: #fff1f1; border: 1px solid #e5b7b7; border-radius: 8px; color: #8a2f2f; font-weight: 700; }
    .trim-row { border-top: 1px solid #edf0ee; padding-top: 16px; margin-top: 16px; }
    @media (max-width: 840px) { .grid { grid-template-columns: 1fr; } .topbar { flex-direction: column; } .form-grid { grid-template-columns: 1fr; } .kv { grid-template-columns: 1fr; gap: 2px; } }
  </style>
</head>
<body><main>${body}</main></body>
</html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

function relationLabel(value: RelationshipValue): string {
  if (value && typeof value === 'object') {
    return String(value.name || value.label || value.id || '—')
  }
  return value === null || value === undefined ? '—' : String(value)
}

function variantNames(candidate: CandidateDoc): string[] {
  return (candidate.variants || [])
    .map((variant) => String(variant?.name || '').trim())
    .filter(Boolean)
}

function trimMappingProgress(candidate: CandidateDoc): { mapped: number; total: number } {
  const variants = variantNames(candidate)
  const mappings = candidate.trimMappings || []
  const byVariant = new Map(
    mappings
      .map((mapping) => [String(mapping.sourceVariant || '').trim(), relationshipId(mapping.proposedTrim)] as const)
      .filter(([variant]) => Boolean(variant)),
  )
  return {
    total: variants.length,
    mapped: variants.filter((variant) => byVariant.get(variant) !== undefined).length,
  }
}

function candidateReviewHref(id: string | number, notice?: string): string {
  const params = new URLSearchParams({ candidate: String(id) })
  if (notice) params.set('notice', notice)
  return `/api/pilot-review?${params.toString()}`
}

function redirectToCandidate(id: string | number, notice: string): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: candidateReviewHref(id, notice) },
  })
}

async function getCandidate(req: PayloadRequest, id: string | number, depth = 1): Promise<CandidateDoc> {
  return (await req.payload.findByID({
    collection: 'catalog-ingestion-candidates',
    id,
    depth,
    overrideAccess: false,
    user: req.user,
    req,
  })) as CandidateDoc
}

async function getCanonicalDoc(
  req: PayloadRequest,
  collection: 'generations' | 'trims',
  id: string | number,
): Promise<CanonicalDoc> {
  return (await req.payload.findByID({
    collection,
    id,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  })) as CanonicalDoc
}

function currentCandidateState(original: CandidateDoc, patch: Partial<CandidateDoc>): CandidateDoc {
  return { ...original, ...patch }
}

async function assertMappingIntegrity(req: PayloadRequest, candidate: CandidateDoc): Promise<void> {
  const modelId = relationshipId(candidate.proposedModel)
  const generationId = relationshipId(candidate.proposedGeneration)
  if (modelId === undefined) throw new Error('Proposed Model is required before mapping.')
  if (generationId === undefined) throw new Error('Select or create the Generation first.')

  const generation = await getCanonicalDoc(req, 'generations', generationId)
  if (String(relationshipId(generation.model)) !== String(modelId)) {
    throw new Error('The selected Generation does not belong to the proposed Model.')
  }

  const variants = variantNames(candidate)
  if (variants.length === 0) {
    throw new Error('No source-backed trim names are available. Do not invent a Trim.')
  }

  const mappings = candidate.trimMappings || []
  const byVariant = new Map(mappings.map((mapping) => [String(mapping.sourceVariant || '').trim(), mapping]))

  for (const variant of variants) {
    const mapping = byVariant.get(variant)
    const trimId = relationshipId(mapping?.proposedTrim)
    if (trimId === undefined) throw new Error(`Trim mapping is missing for “${variant}”.`)

    const trim = await getCanonicalDoc(req, 'trims', trimId)
    if (String(relationshipId(trim.generation)) !== String(generationId)) {
      throw new Error(`Trim “${variant}” does not belong to the selected Generation.`)
    }
  }
}

function blockerCodes(candidate: CandidateDoc): string[] {
  return (candidate.promotionBlockers || [])
    .map((blocker) => String(blocker?.code || '').trim())
    .filter(Boolean)
}

function appendReviewNote(existing: string | null | undefined, note: string): string {
  const stamp = new Date().toISOString()
  return [String(existing || '').trim(), `[${stamp}] ${note}`].filter(Boolean).join('\n')
}

async function handleCreateGeneration(req: PayloadRequest, candidate: CandidateDoc, form: FormData): Promise<Response> {
  const modelId = relationshipId(candidate.proposedModel)
  if (modelId === undefined) throw new Error('Candidate has no proposed Model.')

  const name = String(form.get('generationName') || '').trim()
  if (!name) throw new Error('Generation name is required.')

  const slug = normalizeSlug(name)
  if (!slug) throw new Error('Generation name cannot be normalized.')
  const identityKey = `${modelId}:${slug}`

  const existing = await req.payload.find({
    collection: 'generations',
    where: { identityKey: { equals: identityKey } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  })

  let generation = existing.docs[0] as CanonicalDoc | undefined
  if (!generation) {
    const generationCode = String(form.get('generationCode') || '').trim()
    const startYearRaw = String(form.get('productionStartYear') || '').trim()
    const endYearRaw = String(form.get('productionEndYear') || '').trim()
    const startYear = startYearRaw ? Number(startYearRaw) : undefined
    const endYear = endYearRaw ? Number(endYearRaw) : undefined

    if (startYear !== undefined && !Number.isInteger(startYear)) throw new Error('Invalid production start year.')
    if (endYear !== undefined && !Number.isInteger(endYear)) throw new Error('Invalid production end year.')

    generation = (await req.payload.create({
      collection: 'generations',
      data: {
        model: modelId,
        name,
        slug,
        generationCode: generationCode || undefined,
        productionStartYear: startYear,
        productionEndYear: endYear,
        sourceType: 'manual-verification',
        sourceReference: candidate.sourceReference || undefined,
        sourceObservedAt: candidate.sourceObservedAt || undefined,
        sourceNotes: `Created during pilot review for ${candidate.displayName || candidate.id}.`,
        reviewNotes: 'Generation identity confirmed by a human reviewer during pilot mapping.',
        catalogStatus: 'draft',
      },
      overrideAccess: false,
      user: req.user,
      req,
    })) as CanonicalDoc
  }

  const remainingBlockers = (candidate.promotionBlockers || []).filter(
    (blocker) => blocker.code !== 'missing_generation_identity',
  )

  await req.payload.update({
    collection: 'catalog-ingestion-candidates',
    id: candidate.id,
    data: {
      proposedGeneration: generation.id,
      promotionBlockers: remainingBlockers,
      reviewNotes: appendReviewNote(
        candidate.reviewNotes,
        `Generation linked: ${generation.name || generation.id}.`,
      ),
    },
    overrideAccess: false,
    user: req.user,
    req,
  })

  return redirectToCandidate(candidate.id, 'Generation linked successfully.')
}

async function handleCreateTrim(req: PayloadRequest, candidate: CandidateDoc, form: FormData): Promise<Response> {
  const generationId = relationshipId(candidate.proposedGeneration)
  if (generationId === undefined) throw new Error('Create or select the Generation before mapping Trims.')

  const sourceVariant = String(form.get('sourceVariant') || '').trim()
  const trimName = String(form.get('trimName') || '').trim()
  if (!sourceVariant || !trimName) throw new Error('Source variant and Trim name are required.')

  const variants = variantNames(candidate)
  if (!variants.includes(sourceVariant)) {
    throw new Error('This source variant does not belong to the candidate.')
  }

  const slug = normalizeSlug(trimName)
  if (!slug) throw new Error('Trim name cannot be normalized.')
  const identityKey = `${generationId}:${slug}`

  const existing = await req.payload.find({
    collection: 'trims',
    where: { identityKey: { equals: identityKey } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  })

  let trim = existing.docs[0] as CanonicalDoc | undefined
  if (!trim) {
    trim = (await req.payload.create({
      collection: 'trims',
      data: {
        generation: generationId,
        name: trimName,
        slug,
        sourceType: 'manual-verification',
        sourceReference: candidate.sourceReference || undefined,
        sourceObservedAt: candidate.sourceObservedAt || undefined,
        sourceNotes: `Created from source-backed variant “${sourceVariant}” during pilot review.`,
        reviewNotes: 'Trim identity mapped by a human reviewer during pilot staging review.',
        catalogStatus: 'draft',
      },
      overrideAccess: false,
      user: req.user,
      req,
    })) as CanonicalDoc
  }

  const mappings = [...(candidate.trimMappings || [])]
  const index = mappings.findIndex((mapping) => String(mapping.sourceVariant || '').trim() === sourceVariant)
  if (index >= 0) {
    mappings[index] = { ...mappings[index], sourceVariant, proposedTrim: trim.id }
  } else {
    mappings.push({ sourceVariant, proposedTrim: trim.id })
  }

  await req.payload.update({
    collection: 'catalog-ingestion-candidates',
    id: candidate.id,
    data: {
      trimMappings: mappings,
      reviewNotes: appendReviewNote(candidate.reviewNotes, `Trim mapped: ${sourceVariant} → ${trim.name || trim.id}.`),
    },
    overrideAccess: false,
    user: req.user,
    req,
  })

  return redirectToCandidate(candidate.id, `Trim mapped for ${sourceVariant}.`)
}

async function handleMarkMapped(req: PayloadRequest, candidate: CandidateDoc): Promise<Response> {
  await assertMappingIntegrity(req, candidate)

  await req.payload.update({
    collection: 'catalog-ingestion-candidates',
    id: candidate.id,
    data: {
      mappingStatus: 'mapped',
      reviewNotes: appendReviewNote(candidate.reviewNotes, 'Generation and source-backed Trim mappings validated.'),
    },
    overrideAccess: false,
    user: req.user,
    req,
  })

  return redirectToCandidate(candidate.id, 'Candidate mapping validated.')
}

async function handleResolveSpecScope(req: PayloadRequest, candidate: CandidateDoc, form: FormData): Promise<Response> {
  const code = 'specs_not_trim_scoped'
  if (!blockerCodes(candidate).includes(code)) throw new Error('The specification-scope blocker is not present.')

  const note = String(form.get('resolutionNote') || '').trim()
  if (note.length < 12) {
    throw new Error('Add a short review note explaining how the specification scope was verified.')
  }

  const blockers = (candidate.promotionBlockers || []).filter((blocker) => blocker.code !== code)
  await req.payload.update({
    collection: 'catalog-ingestion-candidates',
    id: candidate.id,
    data: {
      promotionBlockers: blockers,
      reviewNotes: appendReviewNote(candidate.reviewNotes, `Resolved ${code}: ${note}`),
    },
    overrideAccess: false,
    user: req.user,
    req,
  })

  return redirectToCandidate(candidate.id, 'Specification scope blocker resolved.')
}

async function handleApprove(req: PayloadRequest, candidate: CandidateDoc): Promise<Response> {
  if (candidate.mappingStatus !== 'mapped') {
    throw new Error('Validate the Generation/Trim mapping before approval.')
  }

  await assertMappingIntegrity(req, candidate)
  const blockers = blockerCodes(candidate)
  if (blockers.length > 0) {
    throw new Error(`Promotion blockers remain: ${blockers.join(', ')}.`)
  }

  await req.payload.update({
    collection: 'catalog-ingestion-candidates',
    id: candidate.id,
    data: {
      mappingStatus: 'approved',
      reviewNotes: appendReviewNote(candidate.reviewNotes, 'Candidate approved for canonical promotion.'),
    },
    overrideAccess: false,
    user: req.user,
    req,
  })

  return redirectToCandidate(candidate.id, 'Candidate approved for promotion.')
}

function renderBlockers(candidate: CandidateDoc): string {
  const blockers = candidate.promotionBlockers || []
  if (blockers.length === 0) {
    return '<p><span class="badge ok">No promotion blockers</span></p>'
  }

  return blockers
    .map((blocker) => {
      const code = String(blocker.code || 'unknown')
      const note = blocker.note ? `<div class="muted">${escapeHTML(blocker.note)}</div>` : ''
      const resolution =
        code === 'specs_not_trim_scoped'
          ? `<form class="inline" method="post" action="/api/pilot-review" style="margin-top:10px">
               <input type="hidden" name="action" value="resolve-spec-scope" />
               <input type="hidden" name="candidate" value="${escapeHTML(candidate.id)}" />
               <label>Note de vérification
                 <textarea name="resolutionNote" required placeholder="Ex. Les valeurs ont été vérifiées sur la fiche de la finition X et ne sont plus traitées comme agrégées."></textarea>
               </label>
               <div><button type="submit" class="secondary">Confirmer cette vérification</button></div>
             </form>`
          : code === 'missing_generation_identity'
            ? '<p class="muted">Résolution automatique dès qu’une Generation est liée ci-dessous.</p>'
            : code === 'no_trim_names_extracted'
              ? '<p class="muted">Blocage dur : aucune finition ne doit être inventée. Il faut une source officielle supplémentaire.</p>'
              : code === 'unregistered_spec_definition'
                ? '<p class="muted">Crée/valide d’abord les définitions de spécification manquantes dans Payload.</p>'
                : ''
      return `<div class="blocker"><strong>${escapeHTML(code)}</strong>${note}${resolution}</div>`
    })
    .join('')
}

function renderTrimMappings(candidate: CandidateDoc): string {
  const variants = variantNames(candidate)
  if (variants.length === 0) {
    return '<p class="muted">Aucun nom de finition fiable n’a été extrait. On s’arrête ici tant qu’une source officielle ne donne pas la finition.</p>'
  }

  const mappings = candidate.trimMappings || []
  const byVariant = new Map(mappings.map((mapping) => [String(mapping.sourceVariant || '').trim(), mapping]))

  return variants
    .map((variant) => {
      const mapping = byVariant.get(variant)
      const trimId = relationshipId(mapping?.proposedTrim)
      if (trimId !== undefined) {
        return `<div class="trim-row">
          <div class="row"><strong>${escapeHTML(variant)}</strong><span class="badge ok">Mapped</span></div>
          <p class="muted">Trim: ${escapeHTML(relationLabel(mapping?.proposedTrim || null))}</p>
          <a class="button secondary" href="/admin/collections/trims/${encodeURIComponent(String(trimId))}">Ouvrir le Trim</a>
        </div>`
      }

      return `<div class="trim-row">
        <div class="row"><strong>${escapeHTML(variant)}</strong><span class="badge warn">To map</span></div>
        <form class="inline" method="post" action="/api/pilot-review" style="margin-top:12px">
          <input type="hidden" name="action" value="create-trim" />
          <input type="hidden" name="candidate" value="${escapeHTML(candidate.id)}" />
          <input type="hidden" name="sourceVariant" value="${escapeHTML(variant)}" />
          <label>Nom canonique du Trim
            <input name="trimName" value="${escapeHTML(variant)}" required />
          </label>
          <div><button type="submit">Créer / lier ce Trim</button></div>
        </form>
      </div>`
    })
    .join('')
}

function renderCandidate(candidate: CandidateDoc, notice?: string): string {
  const sourceURL = safeExternalURL(candidate.sourceReference)
  const generationId = relationshipId(candidate.proposedGeneration)
  const mapping = trimMappingProgress(candidate)
  const blockers = blockerCodes(candidate)
  const status = String(candidate.mappingStatus || 'needs_review')
  const mappingComplete = generationId !== undefined && mapping.total > 0 && mapping.mapped === mapping.total

  const noticeHTML = notice ? `<div class="notice">${escapeHTML(notice)}</div>` : ''
  const sourceLink = sourceURL
    ? `<a href="${escapeHTML(sourceURL)}" target="_blank" rel="noreferrer">Ouvrir la source officielle ↗</a>`
    : '<span class="muted">Source URL indisponible</span>'

  const generationPanel = generationId !== undefined
    ? `<div class="row"><span class="badge ok">Generation linked</span><strong>${escapeHTML(relationLabel(candidate.proposedGeneration || null))}</strong></div>
       <p><a class="button secondary" href="/admin/collections/generations/${encodeURIComponent(String(generationId))}">Ouvrir la Generation</a></p>`
    : `<p class="muted">Le crawler prouve le modèle, pas la génération canonique. C’est donc une décision humaine.</p>
       <form class="inline" method="post" action="/api/pilot-review">
         <input type="hidden" name="action" value="create-generation" />
         <input type="hidden" name="candidate" value="${escapeHTML(candidate.id)}" />
         <div class="form-grid">
           <label class="wide">Nom de la Generation
             <input name="generationName" required placeholder="Ex. XP210, 5th generation, 2024 facelift… uniquement si vérifié" />
           </label>
           <label>Code génération
             <input name="generationCode" placeholder="Optionnel" />
           </label>
           <span></span>
           <label>Début production
             <input name="productionStartYear" inputmode="numeric" placeholder="Optionnel" />
           </label>
           <label>Fin production
             <input name="productionEndYear" inputmode="numeric" placeholder="Optionnel" />
           </label>
         </div>
         <div><button type="submit">Créer / lier la Generation</button></div>
       </form>`

  const mappingAction = mappingComplete && status === 'needs_review'
    ? `<form method="post" action="/api/pilot-review">
         <input type="hidden" name="action" value="mark-mapped" />
         <input type="hidden" name="candidate" value="${escapeHTML(candidate.id)}" />
         <button type="submit">Valider le mapping Generation / Trims</button>
       </form>`
    : ''

  const approveAction = status === 'mapped' && blockers.length === 0
    ? `<form method="post" action="/api/pilot-review">
         <input type="hidden" name="action" value="approve" />
         <input type="hidden" name="candidate" value="${escapeHTML(candidate.id)}" />
         <button type="submit">Approuver pour promotion</button>
       </form>`
    : ''

  const checklist = [
    [relationshipId(candidate.proposedBrand) !== undefined, 'Brand liée'],
    [relationshipId(candidate.proposedModel) !== undefined, 'Model lié'],
    [generationId !== undefined, 'Generation vérifiée et liée'],
    [mapping.total > 0 && mapping.mapped === mapping.total, `Trims mappés (${mapping.mapped}/${mapping.total})`],
    [blockers.length === 0, `Aucun blocker restant (${blockers.length})`],
  ]
    .map(([ok, label]) => `<div class="check"><b>${ok ? '✓' : '○'}</b><span>${escapeHTML(label)}</span></div>`)
    .join('')

  return `${noticeHTML}
    <div class="topbar">
      <div>
        <p class="eyebrow">Pilot review workspace</p>
        <h1>${escapeHTML(candidate.displayName || `${candidate.brandName || ''} ${candidate.modelName || ''}`)}</h1>
        <p class="muted">${escapeHTML(candidate.distributor || 'Distributor unknown')} · Confidence ${escapeHTML(candidate.confidence || '—')}</p>
      </div>
      <div class="row">
        <a class="button secondary" href="/api/pilot-review">← Tous les candidats</a>
        <a class="button secondary" href="/admin/collections/catalog-ingestion-candidates/${encodeURIComponent(String(candidate.id))}">Éditer dans Payload</a>
      </div>
    </div>

    <div class="grid">
      <div class="stack">
        <section class="card">
          <h2>1. Identité source</h2>
          <div class="kv"><strong>Brand</strong><span>${escapeHTML(candidate.brandName || relationLabel(candidate.proposedBrand || null))}</span></div>
          <div class="kv"><strong>Model</strong><span>${escapeHTML(candidate.modelName || relationLabel(candidate.proposedModel || null))}</span></div>
          <div class="kv"><strong>Distributor</strong><span>${escapeHTML(candidate.distributor || '—')}</span></div>
          <div class="kv"><strong>Observed</strong><span>${escapeHTML(candidate.sourceObservedAt || '—')}</span></div>
          <div class="kv"><strong>Source</strong><span>${sourceLink}</span></div>
        </section>

        <section class="card">
          <h2>2. Generation</h2>
          ${generationPanel}
        </section>

        <section class="card">
          <h2>3. Trims source → canoniques</h2>
          <p class="muted">On ne crée que les finitions présentes dans la source. Pas de devinette, même si Google semble très sûr de lui.</p>
          ${renderTrimMappings(candidate)}
        </section>

        <section class="card">
          <h2>4. Specifications observées</h2>
          <p class="muted">Utilise ceci pour vérifier si les valeurs sont réellement propres à une finition ou seulement agrégées au niveau modèle.</p>
          <pre>${escapeHTML(JSON.stringify(candidate.specifications ?? [], null, 2))}</pre>
        </section>
      </div>

      <aside class="stack">
        <section class="card">
          <h2>État de review</h2>
          <p><span class="badge ${status === 'approved' ? 'ok' : status === 'rejected' ? 'danger' : 'warn'}">${escapeHTML(STATUS_LABELS[status] || status)}</span></p>
          <div class="checklist">${checklist}</div>
          <div style="margin-top:18px" class="stack">
            ${mappingAction}
            ${approveAction}
          </div>
        </section>

        <section class="card">
          <h2>Promotion blockers</h2>
          ${renderBlockers(candidate)}
        </section>

        <section class="card">
          <h2>Review notes</h2>
          <p class="muted" style="white-space:pre-wrap">${escapeHTML(candidate.reviewNotes || 'Aucune note pour le moment.')}</p>
        </section>

        <section class="card">
          <h2>Raw candidate</h2>
          <pre>${escapeHTML(JSON.stringify(candidate.rawCandidate ?? {}, null, 2))}</pre>
        </section>
      </aside>
    </div>`
}

async function renderCandidateList(req: PayloadRequest): Promise<Response> {
  const result = await req.payload.find({
    collection: 'catalog-ingestion-candidates',
    limit: 100,
    depth: 0,
    sort: 'displayName',
    overrideAccess: false,
    user: req.user,
    req,
  })

  const candidates = result.docs as CandidateDoc[]
  const counts = candidates.reduce<Record<string, number>>((acc, candidate) => {
    const status = String(candidate.mappingStatus || 'needs_review')
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  const rows = candidates
    .map((candidate) => {
      const progress = trimMappingProgress(candidate)
      const generation = relationshipId(candidate.proposedGeneration) !== undefined ? '✓' : '—'
      const blockers = blockerCodes(candidate).length
      return `<tr>
        <td><strong>${escapeHTML(candidate.displayName || candidate.id)}</strong><br/><span class="muted">${escapeHTML(candidate.distributor || '')}</span></td>
        <td>${escapeHTML(STATUS_LABELS[String(candidate.mappingStatus)] || candidate.mappingStatus || 'needs_review')}</td>
        <td>${generation}</td>
        <td>${progress.mapped}/${progress.total}</td>
        <td>${blockers}</td>
        <td><a class="button secondary" href="${candidateReviewHref(candidate.id)}">Review</a></td>
      </tr>`
    })
    .join('')

  return htmlPage(
    'Pilot review',
    `<div class="topbar">
      <div>
        <p class="eyebrow">AgenAuto · Cameroon pilot</p>
        <h1>Pilot review workspace</h1>
        <p class="muted">${candidates.length} candidats staging. Ici on transforme les données collectées en décisions canoniques vérifiées.</p>
      </div>
      <a class="button secondary" href="/admin/collections/catalog-ingestion-candidates">Payload list view</a>
    </div>
    <div class="row" style="margin-bottom:18px">
      <span class="badge warn">Needs review: ${counts.needs_review || 0}</span>
      <span class="badge">Mapped: ${counts.mapped || 0}</span>
      <span class="badge ok">Approved: ${counts.approved || 0}</span>
      <span class="badge danger">Rejected: ${counts.rejected || 0}</span>
      <span class="badge">Promoted: ${counts.promoted || 0}</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Candidate</th><th>Status</th><th>Generation</th><th>Trims</th><th>Blockers</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`,
  )
}

const getEndpoint: Endpoint = {
  path: '/pilot-review',
  method: 'get',
  handler: async (req) => {
    if (!isAdminRequest(req)) {
      return htmlPage('Accès refusé', '<div class="error">Administrateur Payload requis.</div>', 403)
    }

    try {
      const url = new URL(req.url)
      const candidateId = url.searchParams.get('candidate')
      if (!candidateId) return renderCandidateList(req)

      const candidate = await getCandidate(req, candidateId, 1)
      return htmlPage(
        candidate.displayName || 'Pilot review',
        renderCandidate(candidate, url.searchParams.get('notice') || undefined),
      )
    } catch (error) {
      req.payload.logger.error({ err: error }, 'Pilot review page failed')
      const message = error instanceof Error ? error.message : 'Unable to load the pilot review workspace.'
      return htmlPage('Review indisponible', `<div class="error">${escapeHTML(message)}</div>`, 500)
    }
  },
}

const postEndpoint: Endpoint = {
  path: '/pilot-review',
  method: 'post',
  handler: async (req) => {
    if (!isAdminRequest(req)) {
      return htmlPage('Accès refusé', '<div class="error">Administrateur Payload requis.</div>', 403)
    }

    try {
      const readFormData = req.formData
      if (typeof readFormData !== 'function') throw new Error('Form data is unavailable.')
      const form = await readFormData.call(req)
      const candidateId = String(form.get('candidate') || '').trim()
      const action = String(form.get('action') || '').trim()
      if (!candidateId || !action) throw new Error('Candidate and action are required.')

      const candidate = await getCandidate(req, candidateId, 0)

      switch (action) {
        case 'create-generation':
          return handleCreateGeneration(req, candidate, form)
        case 'create-trim':
          return handleCreateTrim(req, candidate, form)
        case 'mark-mapped':
          return handleMarkMapped(req, candidate)
        case 'resolve-spec-scope':
          return handleResolveSpecScope(req, candidate, form)
        case 'approve':
          return handleApprove(req, candidate)
        default:
          throw new Error(`Unsupported pilot review action: ${action}.`)
      }
    } catch (error) {
      req.payload.logger.error({ err: error }, 'Pilot review action failed')
      const message = error instanceof Error ? error.message : 'Pilot review action failed.'
      return htmlPage(
        'Review action failed',
        `<div class="error">${escapeHTML(message)}</div><p><a class="button secondary" href="/api/pilot-review">Retour au review workspace</a></p>`,
        400,
      )
    }
  },
}

export const pilotReviewEndpoints: Endpoint[] = [getEndpoint, postEndpoint]
