import type { Endpoint, PayloadRequest } from 'payload'

import { normalizeSlug } from '../lib/automotive/identity'

type RelationValue =
  | number
  | string
  | { id?: number | string | null; name?: string | null; label?: string | null }
  | null
  | undefined

type CandidateVariant = { name?: string | null }
type CandidateTrimMapping = {
  id?: string | null
  sourceVariant?: string
  proposedTrim?: RelationValue
}
type PromotionBlocker = {
  id?: string | null
  code?: string
  note?: string | null
}
type CandidateDoc = {
  id: number
  displayName?: string | null
  brandName?: string | null
  modelName?: string | null
  distributor?: string | null
  sourceReference?: string | null
  sourceObservedAt?: string | null
  confidence?: string | null
  mappingStatus?: 'needs_review' | 'mapped' | 'approved' | 'rejected' | 'promoted' | null
  proposedBrand?: RelationValue
  proposedModel?: RelationValue
  proposedGeneration?: RelationValue
  variants?: CandidateVariant[] | null
  trimMappings?: CandidateTrimMapping[] | null
  promotionBlockers?: PromotionBlocker[] | null
  specifications?: unknown
  rawCandidate?: unknown
  reviewNotes?: string | null
}
type CanonicalDoc = {
  id: number
  name?: string | null
  model?: RelationValue
  generation?: RelationValue
}
type PersistedTrimMapping = {
  id?: string | null
  sourceVariant: string
  proposedTrim?: number
}
type PersistedBlocker = {
  id?: string | null
  code: string
  note?: string | null
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

function numericID(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value)
  if (value && typeof value === 'object' && 'id' in value) {
    return numericID((value as { id?: unknown }).id)
  }
  return undefined
}

function requiredNumericID(value: unknown, label: string): number {
  const id = numericID(value)
  if (id === undefined) throw new Error(`${label} id is invalid.`)
  return id
}

function relationLabel(value: RelationValue): string {
  if (value && typeof value === 'object') {
    return String(value.name || value.label || value.id || '—')
  }
  return value === null || value === undefined ? '—' : String(value)
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
    `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHTML(title)} — AgenAuto</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#10242b;background:#f7f5ef}*{box-sizing:border-box}body{margin:0}main{max-width:1180px;margin:auto;padding:36px 24px 64px}h1{margin:0;font-size:34px}h2{margin:0 0 14px;font-size:20px}p{line-height:1.5}.top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:24px}.grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);gap:18px}.stack{display:grid;gap:18px}.card{background:#fff;border:1px solid #dfe3e1;border-radius:12px;padding:20px}.muted{color:#607071}.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.badge{display:inline-flex;padding:5px 9px;border:1px solid #cfd8d5;border-radius:999px;font-size:12px;font-weight:700;background:#f5f8f7}.ok{color:#176d64;background:#edf8f5;border-color:#acd7cf}.warn{color:#795516;background:#fff8e8;border-color:#e5c892}.danger{color:#8a2f2f;background:#fff1f1;border-color:#e5b7b7}.button,button{display:inline-flex;border:0;border-radius:8px;background:#176d64;color:#fff;padding:10px 14px;font:inherit;font-weight:700;text-decoration:none;cursor:pointer}.secondary{background:#eef1ef!important;color:#10242b!important;border:1px solid #d8dfdc!important}form{display:grid;gap:10px}label{display:grid;gap:5px;font-size:13px;font-weight:700}input,textarea{width:100%;padding:9px 10px;border:1px solid #ccd6d3;border-radius:7px;font:inherit}textarea{min-height:84px}.kv{display:grid;grid-template-columns:140px 1fr;gap:10px;padding:7px 0;border-bottom:1px solid #edf0ee}.blocker{border-left:3px solid #d5a23a;padding:7px 0 7px 12px;margin:9px 0}.check{display:flex;gap:8px;margin:8px 0}pre{margin:0;padding:14px;max-height:360px;overflow:auto;border-radius:8px;background:#10242b;color:#f7f5ef;font-size:12px}.table{overflow:auto;border:1px solid #dfe3e1;border-radius:12px;background:#fff}table{width:100%;border-collapse:collapse}th,td{padding:11px 10px;border-bottom:1px solid #e8ecea;text-align:left}.notice,.error{padding:11px 13px;border-radius:8px;margin-bottom:16px;font-weight:700}.notice{background:#edf8f5;border:1px solid #acd7cf;color:#176d64}.error{background:#fff1f1;border:1px solid #e5b7b7;color:#8a2f2f}.trim{padding-top:14px;margin-top:14px;border-top:1px solid #edf0ee}@media(max-width:840px){.grid{grid-template-columns:1fr}.top{flex-direction:column}.kv{grid-template-columns:1fr}}
</style></head><body><main>${body}</main></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

function variantNames(candidate: CandidateDoc): string[] {
  return (candidate.variants || [])
    .map((variant) => String(variant.name || '').trim())
    .filter(Boolean)
}

function cleanBlockers(candidate: CandidateDoc): PersistedBlocker[] {
  return (candidate.promotionBlockers || [])
    .map((blocker) => ({
      ...(blocker.id ? { id: blocker.id } : {}),
      code: String(blocker.code || '').trim(),
      ...(blocker.note !== undefined ? { note: blocker.note } : {}),
    }))
    .filter((blocker) => Boolean(blocker.code))
}

function cleanTrimMappings(candidate: CandidateDoc): PersistedTrimMapping[] {
  return (candidate.trimMappings || [])
    .map((mapping) => {
      const sourceVariant = String(mapping.sourceVariant || '').trim()
      const proposedTrim = numericID(mapping.proposedTrim)
      return {
        ...(mapping.id ? { id: mapping.id } : {}),
        sourceVariant,
        ...(proposedTrim !== undefined ? { proposedTrim } : {}),
      }
    })
    .filter((mapping) => Boolean(mapping.sourceVariant))
}

function blockerCodes(candidate: CandidateDoc): string[] {
  return cleanBlockers(candidate).map((blocker) => blocker.code)
}

function trimProgress(candidate: CandidateDoc): { mapped: number; total: number } {
  const variants = variantNames(candidate)
  const mappings = new Map(
    cleanTrimMappings(candidate).map((mapping) => [mapping.sourceVariant, mapping.proposedTrim]),
  )
  return {
    total: variants.length,
    mapped: variants.filter((variant) => mappings.get(variant) !== undefined).length,
  }
}

function appendReviewNote(existing: string | null | undefined, note: string): string {
  return [String(existing || '').trim(), `[${new Date().toISOString()}] ${note}`]
    .filter(Boolean)
    .join('\n')
}

function candidateHref(id: number, notice?: string): string {
  const params = new URLSearchParams({ candidate: String(id) })
  if (notice) params.set('notice', notice)
  return `/api/pilot-review?${params.toString()}`
}

function redirectCandidate(id: number, notice: string): Response {
  return new Response(null, { status: 303, headers: { Location: candidateHref(id, notice) } })
}

async function getCandidate(req: PayloadRequest, id: number, depth = 1): Promise<CandidateDoc> {
  return (await req.payload.findByID({
    collection: 'catalog-ingestion-candidates',
    id,
    depth,
    overrideAccess: false,
    user: req.user,
    req,
  })) as unknown as CandidateDoc
}

async function getCanonicalDoc(
  req: PayloadRequest,
  collection: 'generations' | 'trims',
  id: number,
): Promise<CanonicalDoc> {
  return (await req.payload.findByID({
    collection,
    id,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  })) as unknown as CanonicalDoc
}

async function assertMappingIntegrity(req: PayloadRequest, candidate: CandidateDoc): Promise<void> {
  const modelId = requiredNumericID(candidate.proposedModel, 'Model')
  const generationId = requiredNumericID(candidate.proposedGeneration, 'Generation')
  const generation = await getCanonicalDoc(req, 'generations', generationId)
  if (numericID(generation.model) !== modelId) {
    throw new Error('The selected Generation does not belong to the proposed Model.')
  }

  const variants = variantNames(candidate)
  if (variants.length === 0) throw new Error('No source-backed Trim name is available.')

  const mappings = new Map(
    cleanTrimMappings(candidate).map((mapping) => [mapping.sourceVariant, mapping.proposedTrim]),
  )
  for (const variant of variants) {
    const trimId = mappings.get(variant)
    if (trimId === undefined) throw new Error(`Trim mapping is missing for “${variant}”.`)
    const trim = await getCanonicalDoc(req, 'trims', trimId)
    if (numericID(trim.generation) !== generationId) {
      throw new Error(`Trim “${variant}” does not belong to the selected Generation.`)
    }
  }
}

async function createGeneration(req: PayloadRequest, candidate: CandidateDoc, form: FormData): Promise<Response> {
  const modelId = requiredNumericID(candidate.proposedModel, 'Model')
  const name = String(form.get('generationName') || '').trim()
  if (!name) throw new Error('Generation name is required.')
  const slug = normalizeSlug(name)
  const identityKey = `${modelId}:${slug}`

  const found = await req.payload.find({
    collection: 'generations',
    where: { identityKey: { equals: identityKey } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  })

  let generation = found.docs[0]
  if (!generation) {
    const startRaw = String(form.get('productionStartYear') || '').trim()
    const endRaw = String(form.get('productionEndYear') || '').trim()
    const start = startRaw ? Number(startRaw) : undefined
    const end = endRaw ? Number(endRaw) : undefined
    if (start !== undefined && !Number.isInteger(start)) throw new Error('Invalid production start year.')
    if (end !== undefined && !Number.isInteger(end)) throw new Error('Invalid production end year.')

    generation = await req.payload.create({
      collection: 'generations',
      data: {
        model: modelId,
        name,
        slug,
        generationCode: String(form.get('generationCode') || '').trim() || undefined,
        productionStartYear: start,
        productionEndYear: end,
        catalogStatus: 'draft',
        sourceType: 'manual-verification',
        sourceReference: candidate.sourceReference || undefined,
        sourceObservedAt: candidate.sourceObservedAt || undefined,
        sourceNotes: `Created during pilot review for ${candidate.displayName || candidate.id}.`,
        reviewNotes: 'Generation identity confirmed during pilot review.',
      },
      overrideAccess: false,
      user: req.user,
      req,
    })
  }

  const remaining = cleanBlockers(candidate).filter(
    (blocker) => blocker.code !== 'missing_generation_identity',
  )
  await req.payload.update({
    collection: 'catalog-ingestion-candidates',
    id: candidate.id,
    data: {
      proposedGeneration: generation.id,
      promotionBlockers: remaining,
      reviewNotes: appendReviewNote(candidate.reviewNotes, `Generation linked: ${generation.name}.`),
    },
    overrideAccess: false,
    user: req.user,
    req,
  })
  return redirectCandidate(candidate.id, 'Generation linked successfully.')
}

async function createTrim(req: PayloadRequest, candidate: CandidateDoc, form: FormData): Promise<Response> {
  const generationId = requiredNumericID(candidate.proposedGeneration, 'Generation')
  const sourceVariant = String(form.get('sourceVariant') || '').trim()
  const trimName = String(form.get('trimName') || '').trim()
  if (!sourceVariant || !trimName) throw new Error('Source variant and Trim name are required.')
  if (!variantNames(candidate).includes(sourceVariant)) throw new Error('Unknown source variant.')

  const slug = normalizeSlug(trimName)
  const identityKey = `${generationId}:${slug}`
  const found = await req.payload.find({
    collection: 'trims',
    where: { identityKey: { equals: identityKey } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  })

  let trim = found.docs[0]
  if (!trim) {
    trim = await req.payload.create({
      collection: 'trims',
      data: {
        generation: generationId,
        name: trimName,
        slug,
        catalogStatus: 'draft',
        sourceType: 'manual-verification',
        sourceReference: candidate.sourceReference || undefined,
        sourceObservedAt: candidate.sourceObservedAt || undefined,
        sourceNotes: `Created from source-backed variant “${sourceVariant}” during pilot review.`,
        reviewNotes: 'Trim identity mapped during pilot review.',
      },
      overrideAccess: false,
      user: req.user,
      req,
    })
  }

  const mappings = cleanTrimMappings(candidate)
  const existingIndex = mappings.findIndex((mapping) => mapping.sourceVariant === sourceVariant)
  const nextMapping: PersistedTrimMapping = { sourceVariant, proposedTrim: trim.id }
  if (existingIndex >= 0) {
    mappings[existingIndex] = { ...mappings[existingIndex], ...nextMapping }
  } else {
    mappings.push(nextMapping)
  }

  await req.payload.update({
    collection: 'catalog-ingestion-candidates',
    id: candidate.id,
    data: {
      trimMappings: mappings,
      reviewNotes: appendReviewNote(candidate.reviewNotes, `Trim mapped: ${sourceVariant} → ${trim.name}.`),
    },
    overrideAccess: false,
    user: req.user,
    req,
  })
  return redirectCandidate(candidate.id, `Trim mapped for ${sourceVariant}.`)
}

async function markMapped(req: PayloadRequest, candidate: CandidateDoc): Promise<Response> {
  await assertMappingIntegrity(req, candidate)
  await req.payload.update({
    collection: 'catalog-ingestion-candidates',
    id: candidate.id,
    data: {
      mappingStatus: 'mapped',
      reviewNotes: appendReviewNote(candidate.reviewNotes, 'Generation and Trim mappings validated.'),
    },
    overrideAccess: false,
    user: req.user,
    req,
  })
  return redirectCandidate(candidate.id, 'Candidate mapping validated.')
}

async function resolveSpecScope(req: PayloadRequest, candidate: CandidateDoc, form: FormData): Promise<Response> {
  const note = String(form.get('resolutionNote') || '').trim()
  if (note.length < 12) throw new Error('Add a short verification note.')
  const blockers = cleanBlockers(candidate).filter(
    (blocker) => blocker.code !== 'specs_not_trim_scoped',
  )
  await req.payload.update({
    collection: 'catalog-ingestion-candidates',
    id: candidate.id,
    data: {
      promotionBlockers: blockers,
      reviewNotes: appendReviewNote(candidate.reviewNotes, `Resolved specs_not_trim_scoped: ${note}`),
    },
    overrideAccess: false,
    user: req.user,
    req,
  })
  return redirectCandidate(candidate.id, 'Specification scope blocker resolved.')
}

async function approveCandidate(req: PayloadRequest, candidate: CandidateDoc): Promise<Response> {
  if (candidate.mappingStatus !== 'mapped') throw new Error('Validate mapping before approval.')
  await assertMappingIntegrity(req, candidate)
  const blockers = blockerCodes(candidate)
  if (blockers.length) throw new Error(`Promotion blockers remain: ${blockers.join(', ')}.`)
  await req.payload.update({
    collection: 'catalog-ingestion-candidates',
    id: candidate.id,
    data: {
      mappingStatus: 'approved',
      reviewNotes: appendReviewNote(candidate.reviewNotes, 'Candidate approved for promotion.'),
    },
    overrideAccess: false,
    user: req.user,
    req,
  })
  return redirectCandidate(candidate.id, 'Candidate approved for promotion.')
}

function renderTrims(candidate: CandidateDoc): string {
  const variants = variantNames(candidate)
  if (!variants.length) return '<p class="muted">No reliable Trim names were extracted. Do not invent one.</p>'
  const mappings = new Map(cleanTrimMappings(candidate).map((mapping) => [mapping.sourceVariant, mapping.proposedTrim]))
  return variants.map((variant) => {
    const trimId = mappings.get(variant)
    if (trimId !== undefined) {
      return `<div class="trim"><div class="row"><strong>${escapeHTML(variant)}</strong><span class="badge ok">Mapped</span></div><p><a class="button secondary" href="/admin/collections/trims/${trimId}">Open Trim</a></p></div>`
    }
    return `<div class="trim"><div class="row"><strong>${escapeHTML(variant)}</strong><span class="badge warn">To map</span></div>
<form method="post" action="/api/pilot-review"><input type="hidden" name="action" value="create-trim"/><input type="hidden" name="candidate" value="${candidate.id}"/><input type="hidden" name="sourceVariant" value="${escapeHTML(variant)}"/><label>Canonical Trim name<input name="trimName" value="${escapeHTML(variant)}" required/></label><button type="submit">Create / link Trim</button></form></div>`
  }).join('')
}

function renderBlockers(candidate: CandidateDoc): string {
  const blockers = cleanBlockers(candidate)
  if (!blockers.length) return '<p><span class="badge ok">No promotion blockers</span></p>'
  return blockers.map((blocker) => {
    const resolution = blocker.code === 'specs_not_trim_scoped'
      ? `<form method="post" action="/api/pilot-review"><input type="hidden" name="action" value="resolve-spec-scope"/><input type="hidden" name="candidate" value="${candidate.id}"/><label>Verification note<textarea name="resolutionNote" required></textarea></label><button class="secondary" type="submit">Confirm verification</button></form>`
      : blocker.code === 'missing_generation_identity'
        ? '<p class="muted">Resolved automatically when a Generation is linked.</p>'
        : blocker.code === 'no_trim_names_extracted'
          ? '<p class="muted">Hard blocker: obtain an official source naming the Trim.</p>'
          : '<p class="muted">Review this blocker in Payload before promotion.</p>'
    return `<div class="blocker"><strong>${escapeHTML(blocker.code)}</strong><div class="muted">${escapeHTML(blocker.note || '')}</div>${resolution}</div>`
  }).join('')
}

function renderCandidate(candidate: CandidateDoc, notice?: string): string {
  const source = safeExternalURL(candidate.sourceReference)
  const generationId = numericID(candidate.proposedGeneration)
  const progress = trimProgress(candidate)
  const blockers = blockerCodes(candidate)
  const status = candidate.mappingStatus || 'needs_review'
  const canMap = generationId !== undefined && progress.total > 0 && progress.mapped === progress.total && status === 'needs_review'
  const canApprove = status === 'mapped' && blockers.length === 0

  return `${notice ? `<div class="notice">${escapeHTML(notice)}</div>` : ''}
<div class="top"><div><p class="muted">Pilot review workspace</p><h1>${escapeHTML(candidate.displayName || candidate.id)}</h1><p class="muted">${escapeHTML(candidate.distributor || '—')} · confidence ${escapeHTML(candidate.confidence || '—')}</p></div><div class="row"><a class="button secondary" href="/api/pilot-review">← Candidates</a><a class="button secondary" href="/admin/collections/catalog-ingestion-candidates/${candidate.id}">Payload record</a></div></div>
<div class="grid"><div class="stack">
<section class="card"><h2>1. Source identity</h2><div class="kv"><strong>Brand</strong><span>${escapeHTML(candidate.brandName || relationLabel(candidate.proposedBrand))}</span></div><div class="kv"><strong>Model</strong><span>${escapeHTML(candidate.modelName || relationLabel(candidate.proposedModel))}</span></div><div class="kv"><strong>Source</strong><span>${source ? `<a href="${escapeHTML(source)}" target="_blank" rel="noreferrer">Open official source ↗</a>` : '—'}</span></div></section>
<section class="card"><h2>2. Generation</h2>${generationId !== undefined ? `<div class="row"><span class="badge ok">Linked</span><strong>${escapeHTML(relationLabel(candidate.proposedGeneration))}</strong></div><p><a class="button secondary" href="/admin/collections/generations/${generationId}">Open Generation</a></p>` : `<p class="muted">Enter only a generation identity you verified from a reliable source.</p><form method="post" action="/api/pilot-review"><input type="hidden" name="action" value="create-generation"/><input type="hidden" name="candidate" value="${candidate.id}"/><label>Generation name<input name="generationName" required/></label><label>Generation code<input name="generationCode"/></label><label>Production start year<input name="productionStartYear" inputmode="numeric"/></label><label>Production end year<input name="productionEndYear" inputmode="numeric"/></label><button type="submit">Create / link Generation</button></form>`}</section>
<section class="card"><h2>3. Source Trims → canonical Trims</h2>${renderTrims(candidate)}</section>
<section class="card"><h2>4. Observed specifications</h2><pre>${escapeHTML(JSON.stringify(candidate.specifications ?? [], null, 2))}</pre></section>
</div><aside class="stack"><section class="card"><h2>Review state</h2><p><span class="badge ${status === 'approved' ? 'ok' : 'warn'}">${escapeHTML(STATUS_LABELS[status] || status)}</span></p><div class="check">${generationId !== undefined ? '✓' : '○'} Generation linked</div><div class="check">${progress.total > 0 && progress.mapped === progress.total ? '✓' : '○'} Trims ${progress.mapped}/${progress.total}</div><div class="check">${blockers.length === 0 ? '✓' : '○'} Blockers ${blockers.length}</div>${canMap ? `<form method="post" action="/api/pilot-review"><input type="hidden" name="action" value="mark-mapped"/><input type="hidden" name="candidate" value="${candidate.id}"/><button type="submit">Validate Generation / Trim mapping</button></form>` : ''}${canApprove ? `<form method="post" action="/api/pilot-review"><input type="hidden" name="action" value="approve"/><input type="hidden" name="candidate" value="${candidate.id}"/><button type="submit">Approve for promotion</button></form>` : ''}</section>
<section class="card"><h2>Promotion blockers</h2>${renderBlockers(candidate)}</section>
<section class="card"><h2>Review notes</h2><p class="muted" style="white-space:pre-wrap">${escapeHTML(candidate.reviewNotes || 'No notes yet.')}</p></section>
<section class="card"><h2>Raw candidate</h2><pre>${escapeHTML(JSON.stringify(candidate.rawCandidate ?? {}, null, 2))}</pre></section></aside></div>`
}

async function renderList(req: PayloadRequest): Promise<Response> {
  const result = await req.payload.find({
    collection: 'catalog-ingestion-candidates',
    limit: 100,
    depth: 0,
    sort: 'displayName',
    overrideAccess: false,
    user: req.user,
    req,
  })
  const candidates = result.docs as unknown as CandidateDoc[]
  const rows = candidates.map((candidate) => {
    const progress = trimProgress(candidate)
    return `<tr><td><strong>${escapeHTML(candidate.displayName || candidate.id)}</strong><br/><span class="muted">${escapeHTML(candidate.distributor || '')}</span></td><td>${escapeHTML(STATUS_LABELS[candidate.mappingStatus || 'needs_review'])}</td><td>${numericID(candidate.proposedGeneration) !== undefined ? '✓' : '—'}</td><td>${progress.mapped}/${progress.total}</td><td>${blockerCodes(candidate).length}</td><td><a class="button secondary" href="${candidateHref(candidate.id)}">Review</a></td></tr>`
  }).join('')
  return htmlPage('Pilot review', `<div class="top"><div><p class="muted">AgenAuto · Cameroon pilot</p><h1>Pilot review workspace</h1><p class="muted">${candidates.length} staging candidates.</p></div><a class="button secondary" href="/admin/collections/catalog-ingestion-candidates">Payload list</a></div><div class="table"><table><thead><tr><th>Candidate</th><th>Status</th><th>Generation</th><th>Trims</th><th>Blockers</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`)
}

const getEndpoint: Endpoint = {
  path: '/pilot-review',
  method: 'get',
  handler: async (req) => {
    if (!isAdminRequest(req)) return htmlPage('Access denied', '<div class="error">Payload administrator required.</div>', 403)
    try {
      const url = new URL(req.url ?? 'http://localhost/api/pilot-review')
      const rawCandidate = url.searchParams.get('candidate')
      if (!rawCandidate) return renderList(req)
      const candidateId = requiredNumericID(rawCandidate, 'Candidate')
      const candidate = await getCandidate(req, candidateId, 1)
      return htmlPage(candidate.displayName || 'Pilot review', renderCandidate(candidate, url.searchParams.get('notice') || undefined))
    } catch (error) {
      req.payload.logger.error({ err: error }, 'Pilot review page failed')
      const message = error instanceof Error ? error.message : 'Unable to load pilot review.'
      return htmlPage('Review unavailable', `<div class="error">${escapeHTML(message)}</div>`, 500)
    }
  },
}

const postEndpoint: Endpoint = {
  path: '/pilot-review',
  method: 'post',
  handler: async (req) => {
    if (!isAdminRequest(req)) return htmlPage('Access denied', '<div class="error">Payload administrator required.</div>', 403)
    try {
      if (typeof req.formData !== 'function') throw new Error('Form data is unavailable.')
      const form = await req.formData()
      const candidateId = requiredNumericID(form.get('candidate'), 'Candidate')
      const candidate = await getCandidate(req, candidateId, 0)
      switch (String(form.get('action') || '')) {
        case 'create-generation': return createGeneration(req, candidate, form)
        case 'create-trim': return createTrim(req, candidate, form)
        case 'mark-mapped': return markMapped(req, candidate)
        case 'resolve-spec-scope': return resolveSpecScope(req, candidate, form)
        case 'approve': return approveCandidate(req, candidate)
        default: throw new Error('Unsupported review action.')
      }
    } catch (error) {
      req.payload.logger.error({ err: error }, 'Pilot review action failed')
      const message = error instanceof Error ? error.message : 'Pilot review action failed.'
      return htmlPage('Review action failed', `<div class="error">${escapeHTML(message)}</div><p><a class="button secondary" href="/api/pilot-review">Back to workspace</a></p>`, 400)
    }
  },
}

export const pilotReviewEndpoints: Endpoint[] = [getEndpoint, postEndpoint]
