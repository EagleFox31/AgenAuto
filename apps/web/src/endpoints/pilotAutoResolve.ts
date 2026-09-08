import type { Endpoint, PayloadRequest } from 'payload'

import {
  normalizeSlug,
  normalizeSpecificationKey,
  relationshipId,
} from '../lib/automotive/identity'

const PILOT_BRANCH = 'feat/cameroon-pilot-ingestion'

type Evidence = { kind?: string; url?: string; note?: string }
type GenerationHint = {
  name?: string
  code?: string
  production_start_year?: number
  production_end_year?: number
  confidence?: string
  evidence?: Evidence[]
}
type ScopedSpec = {
  raw_label?: string
  raw_value?: unknown
  canonical_key?: string
  unit?: string | null
}
type PlanCandidate = {
  candidateKey: string
  displayName: string
  sourceReference: string
  sourceObservedAt: string
  variants: string[]
  promotionBlockers: Array<{ code: string; note?: string }>
  rawCandidate: Record<string, unknown>
}
type PilotPlan = { schema_version: number; mode: string; reviewCandidates: PlanCandidate[] }
type StagingCandidate = {
  id: number | string
  proposedModel?: unknown
  reviewNotes?: string | null
}
type CanonicalDoc = { id: number | string; name?: string | null }
type DefinitionDoc = {
  id: number | string
  key?: string | null
  valueType?: 'number' | 'text' | 'boolean' | 'option' | null
  allowedOptions?: Array<{ value?: string | null }> | null
}

function isAdmin(req: PayloadRequest): boolean {
  const user = req.user as { role?: string } | null | undefined
  return user?.role === 'admin'
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function page(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(title)} — AgenAuto</title><style>
    :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#10242b;background:#f7f5ef}*{box-sizing:border-box}body{margin:0}main{max-width:1000px;margin:0 auto;padding:48px 24px 72px}h1{font-size:34px;margin:0 0 10px}h2{margin:0 0 12px;font-size:20px}p{line-height:1.55}.muted{color:#667576}.card{background:#fff;border:1px solid #dfe3e1;border-radius:12px;padding:22px;margin:16px 0}.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.badge{border:1px solid #acd7cf;background:#edf8f5;color:#176d64;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:700}.button,button{display:inline-flex;border:0;border-radius:8px;background:#176d64;color:white;padding:11px 15px;font:inherit;font-weight:700;text-decoration:none;cursor:pointer}.secondary{background:#eef1ef;color:#10242b;border:1px solid #d8dfdc}.error{background:#fff1f1;border:1px solid #e5b7b7;color:#8a2f2f;padding:12px 14px;border-radius:8px}.ok{background:#edf8f5;border:1px solid #acd7cf;color:#176d64;padding:12px 14px;border-radius:8px}table{width:100%;border-collapse:collapse;background:#fff}th,td{padding:12px 10px;border-bottom:1px solid #e8ecea;text-align:left;vertical-align:top}th{font-size:12px;text-transform:uppercase;color:#6b7778}.table{overflow:auto;border:1px solid #dfe3e1;border-radius:12px}</style></head><body><main>${body}</main></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

function pilotSha(): string {
  if (process.env.VERCEL_GIT_COMMIT_REF !== PILOT_BRANCH) {
    throw new Error(`Auto-resolution is locked to ${PILOT_BRANCH}.`)
  }
  const sha = process.env.VERCEL_GIT_COMMIT_SHA
  if (!sha || !/^[0-9a-f]{40}$/i.test(sha)) throw new Error('Pinned Vercel commit SHA is unavailable.')
  return sha
}

async function loadPlan(): Promise<PilotPlan> {
  const response = await fetch(
    `https://raw.githubusercontent.com/EagleFox31/AgenAuto/${pilotSha()}/data/pilot/payload-import-plan.json`,
    { cache: 'no-store' },
  )
  if (!response.ok) throw new Error(`Unable to load pinned pilot plan (${response.status}).`)
  const plan = (await response.json()) as PilotPlan
  if (plan.schema_version !== 1 || plan.mode !== 'draft_review_only') throw new Error('Unexpected pilot plan schema.')
  return plan
}

function generationHint(candidate: PlanCandidate): GenerationHint | null {
  const raw = candidate.rawCandidate.generation_hint
  if (!raw || typeof raw !== 'object') return null
  const hint = raw as GenerationHint
  const evidence = (Array.isArray(hint.evidence) ? hint.evidence : []).filter((item) => {
    try {
      const url = new URL(String(item.url || ''))
      return url.protocol === 'https:' || url.protocol === 'http:'
    } catch {
      return false
    }
  })
  if (hint.confidence !== 'A' || !hint.name || evidence.length < 2) return null
  return { ...hint, evidence }
}

function scopedSpecs(candidate: PlanCandidate): Record<string, ScopedSpec[]> | null {
  const raw = candidate.rawCandidate.variant_specs
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const result: Record<string, ScopedSpec[]> = {}
  for (const [variant, values] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(values)) return null
    result[variant] = values.filter(
      (value): value is ScopedSpec => Boolean(value && typeof value === 'object'),
    ) as ScopedSpec[]
  }
  if (!candidate.variants.every((variant) => result[variant]?.length)) return null
  return result
}

function numericID(value: unknown, label: string): number {
  const numeric = Number(relationshipId(value))
  if (!Number.isFinite(numeric) || numeric <= 0) throw new Error(`${label} id is unavailable.`)
  return numeric
}

function addNote(existing: string | null | undefined, message: string): string {
  return [String(existing || '').trim(), `[${new Date().toISOString()}] ${message}`]
    .filter(Boolean)
    .join('\n')
}

async function ensureGeneration(
  req: PayloadRequest,
  modelId: number,
  hint: GenerationHint,
  candidate: PlanCandidate,
): Promise<CanonicalDoc> {
  const slug = normalizeSlug(hint.name)
  const identityKey = `${modelId}:${slug}`
  const found = await req.payload.find({ collection: 'generations', where: { identityKey: { equals: identityKey } }, limit: 1, depth: 0, overrideAccess: false, user: req.user, req })
  if (found.docs[0]) return found.docs[0] as CanonicalDoc
  const evidence = hint.evidence || []
  return (await req.payload.create({
    collection: 'generations', draft: true,
    data: {
      model: modelId, name: hint.name || 'Unknown generation', slug,
      generationCode: hint.code || undefined,
      productionStartYear: hint.production_start_year,
      productionEndYear: hint.production_end_year,
      catalogStatus: 'draft', sourceType: 'regulatory',
      sourceReference: evidence[0]?.url || candidate.sourceReference,
      sourceObservedAt: candidate.sourceObservedAt,
      sourceNotes: evidence.map((item) => `${item.kind || 'evidence'}: ${item.url}${item.note ? ` — ${item.note}` : ''}`).join('\n'),
      qualityFlags: [{ code: 'auto_resolved_a_grade_generation', severity: 'warning', note: 'Auto-created from multiple traceable A-grade sources.' }],
      reviewNotes: 'Automatically resolved from evidence; remains draft until publication review.',
    },
    overrideAccess: false, user: req.user, req,
  })) as CanonicalDoc
}

async function ensureTrim(
  req: PayloadRequest,
  generationId: number,
  trimName: string,
  candidate: PlanCandidate,
): Promise<CanonicalDoc> {
  const slug = normalizeSlug(trimName)
  const identityKey = `${generationId}:${slug}`
  const found = await req.payload.find({ collection: 'trims', where: { identityKey: { equals: identityKey } }, limit: 1, depth: 0, overrideAccess: false, user: req.user, req })
  if (found.docs[0]) return found.docs[0] as CanonicalDoc
  return (await req.payload.create({
    collection: 'trims', draft: true,
    data: {
      generation: generationId, name: trimName, slug,
      catalogStatus: 'draft', sourceType: 'official-dealer',
      sourceReference: candidate.sourceReference, sourceObservedAt: candidate.sourceObservedAt,
      sourceNotes: `Source-backed trim extracted from the official distributor brochure for ${candidate.displayName}.`,
      qualityFlags: [{ code: 'auto_mapped_source_trim', severity: 'warning', note: 'Auto-created from an official brochure trim name.' }],
      reviewNotes: 'Automatically linked from the official brochure; remains draft.',
    },
    overrideAccess: false, user: req.user, req,
  })) as CanonicalDoc
}

async function definitionFor(req: PayloadRequest, canonicalKey: string): Promise<DefinitionDoc> {
  const key = normalizeSpecificationKey(canonicalKey)
  const found = await req.payload.find({ collection: 'specification-definitions', where: { key: { equals: key } }, limit: 1, depth: 0, overrideAccess: false, user: req.user, req })
  const definition = found.docs[0] as DefinitionDoc | undefined
  if (!definition) throw new Error(`Specification definition ${canonicalKey} is missing.`)
  return definition
}

function typedValue(definition: DefinitionDoc, rawValue: unknown): Record<string, unknown> {
  const value = String(rawValue ?? '').trim()
  if (!value) throw new Error(`Empty value for ${definition.key || definition.id}.`)
  if (definition.valueType === 'number') {
    const normalized = value.replace(',', '.')
    const match = normalized.match(/-?\d+(?:\.\d+)?/)
    if (!match) throw new Error(`Expected a numeric value for ${definition.key}.`)
    return { numberValue: Number(match[0]) }
  }
  if (definition.valueType === 'text') return { textValue: value }
  if (definition.valueType === 'boolean') {
    const lowered = value.toLowerCase()
    const truthy = new Set(['true', 'yes', 'oui', '1', '✔', '✓'])
    const falsy = new Set(['false', 'no', 'non', '0', 'x', '-', '—'])
    if (truthy.has(lowered)) return { booleanValue: 'true' }
    if (falsy.has(lowered)) return { booleanValue: 'false' }
    throw new Error(`Unsupported boolean value ${value}.`)
  }
  if (definition.valueType === 'option') {
    const option = normalizeSlug(value)
    const allowed = new Set((definition.allowedOptions || []).map((item) => item.value).filter(Boolean))
    if (allowed.size && !allowed.has(option)) throw new Error(`Option ${value} is not registered for ${definition.key}.`)
    return { optionValue: option }
  }
  throw new Error(`Unsupported value type for ${definition.key || definition.id}.`)
}

async function ensureTrimSpecification(
  req: PayloadRequest,
  trimId: number,
  spec: ScopedSpec,
  candidate: PlanCandidate,
): Promise<boolean> {
  const canonicalKey = String(spec.canonical_key || '').trim()
  if (!canonicalKey) return false
  const definition = await definitionFor(req, canonicalKey)
  const definitionId = numericID(definition.id, 'Specification definition')
  const identityKey = `${trimId}:${definitionId}`
  const found = await req.payload.find({ collection: 'trim-specifications', where: { identityKey: { equals: identityKey } }, limit: 1, depth: 0, overrideAccess: false, user: req.user, req })
  if (found.docs[0]) return false

  await req.payload.create({
    collection: 'trim-specifications', draft: true,
    data: {
      trim: trimId, definition: definitionId, valueStatus: 'known',
      ...typedValue(definition, spec.raw_value),
      sourceNote: `${spec.raw_label || canonicalKey}: ${String(spec.raw_value ?? '')}`,
      catalogStatus: 'draft', sourceType: 'official-dealer',
      sourceReference: candidate.sourceReference, sourceObservedAt: candidate.sourceObservedAt,
      sourceNotes: `Automatically extracted from the official distributor brochure for ${candidate.displayName}.`,
      qualityFlags: [{ code: 'auto_extracted_trim_spec', severity: 'warning', note: 'Trim-scoped value extracted from the official brochure table.' }],
      reviewNotes: 'Automatically created from trim-scoped brochure data; remains draft.',
    },
    overrideAccess: false, user: req.user, req,
  })
  return true
}

async function resolveCandidate(
  req: PayloadRequest,
  planned: PlanCandidate,
): Promise<{ name: string; generation: string; trims: number; specs: number; blockers: number }> {
  const hint = generationHint(planned)
  if (!hint) throw new Error(`${planned.displayName}: no A-grade generation hint.`)
  if (!planned.variants.length) throw new Error(`${planned.displayName}: no source-backed trims.`)

  const staged = await req.payload.find({ collection: 'catalog-ingestion-candidates', where: { candidateKey: { equals: planned.candidateKey } }, limit: 1, depth: 0, overrideAccess: false, user: req.user, req })
  const candidate = staged.docs[0] as StagingCandidate | undefined
  if (!candidate) throw new Error(`${planned.displayName}: staging candidate not found.`)

  const generation = await ensureGeneration(req, numericID(candidate.proposedModel, 'Model'), hint, planned)
  const generationId = numericID(generation.id, 'Generation')
  const trimMappings: Array<{ sourceVariant: string; proposedTrim: number }> = []
  const trimsByName = new Map<string, number>()
  for (const variant of planned.variants) {
    const trim = await ensureTrim(req, generationId, variant, planned)
    const trimId = numericID(trim.id, 'Trim')
    trimMappings.push({ sourceVariant: variant, proposedTrim: trimId })
    trimsByName.set(variant, trimId)
  }

  let specCount = 0
  const scoped = scopedSpecs(planned)
  if (scoped) {
    for (const variant of planned.variants) {
      const trimId = trimsByName.get(variant)
      if (!trimId) throw new Error(`${planned.displayName}: trim ${variant} was not created.`)
      for (const spec of scoped[variant] || []) {
        if (await ensureTrimSpecification(req, trimId, spec, planned)) specCount += 1
      }
    }
  }

  const remainingBlockers = planned.promotionBlockers.filter(
    (blocker) => !['missing_generation_identity', 'no_trim_names_extracted', 'specs_not_trim_scoped'].includes(blocker.code),
  )
  if (!scoped) {
    remainingBlockers.push({ code: 'auto_specs_not_ready', note: 'No validated trim-scoped specification matrix is available yet.' })
  }
  const mappingStatus = remainingBlockers.length === 0 ? 'approved' : 'mapped'

  await req.payload.update({
    collection: 'catalog-ingestion-candidates', id: candidate.id,
    data: {
      variants: planned.variants.map((name) => ({ name })),
      proposedGeneration: generationId, trimMappings,
      promotionBlockers: remainingBlockers, mappingStatus,
      reviewNotes: addNote(candidate.reviewNotes, `Auto-resolved ${hint.name}${hint.code ? ` (${hint.code})` : ''}, ${trimMappings.length} trim(s) and ${specCount} new trim specification(s).`),
    },
    overrideAccess: false, user: req.user, req,
  })

  return { name: planned.displayName, generation: String(hint.name), trims: trimMappings.length, specs: specCount, blockers: remainingBlockers.length }
}

function eligibleCandidate(candidate: PlanCandidate): boolean {
  return Boolean(generationHint(candidate) && candidate.variants.length)
}

async function renderOverview(req: PayloadRequest, message?: string): Promise<Response> {
  const plan = await loadPlan()
  const eligible = plan.reviewCandidates.filter(eligibleCandidate)
  const rows = eligible.map((candidate) => {
    const hint = generationHint(candidate)
    const scoped = scopedSpecs(candidate)
    const specCount = scoped ? Object.values(scoped).reduce((sum, specs) => sum + specs.length, 0) : 0
    return `<tr><td><strong>${esc(candidate.displayName)}</strong></td><td>${esc(hint?.name)}</td><td>${esc(hint?.code || '—')}</td><td>${candidate.variants.map(esc).join(', ')}</td><td>${specCount}</td><td><span class="badge">A-grade</span></td></tr>`
  }).join('')
  return page('Pilot auto-resolver', `${message ? `<div class="ok">${esc(message)}</div>` : ''}<div class="row" style="justify-content:space-between"><div><p class="muted">AgenAuto · Cameroon pilot</p><h1>Evidence auto-resolver</h1><p class="muted">No manual Generation, Trim or specification typing. Only traceable source-backed data is automated.</p></div><a class="button secondary" href="/api/pilot-review">← Review workspace</a></div><div class="card"><h2>${eligible.length} candidate(s) eligible now</h2><p>Generation evidence must be A-grade, Trim names come from official brochures, and trim specifications are created only from a validated brochure matrix. Everything remains <strong>draft</strong>.</p><form method="post" action="/api/pilot-auto-resolve"><input type="hidden" name="action" value="resolve-all"/><button type="submit">Auto-resolve all eligible candidates</button></form></div><div class="table"><table><thead><tr><th>Candidate</th><th>Generation</th><th>Code</th><th>Source trims</th><th>Scoped specs</th><th>Confidence</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No eligible candidate yet.</td></tr>'}</tbody></table></div>`) 
}

const getEndpoint: Endpoint = {
  path: '/pilot-auto-resolve', method: 'get',
  handler: async (req) => {
    if (!isAdmin(req)) return page('Accès refusé', '<div class="error">Administrateur Payload requis.</div>', 403)
    try { return await renderOverview(req) }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Auto-resolver unavailable.'
      req.payload.logger.error({ err: error }, 'Pilot auto-resolver overview failed')
      return page('Auto-resolver indisponible', `<div class="error">${esc(message)}</div>`, 500)
    }
  },
}

const postEndpoint: Endpoint = {
  path: '/pilot-auto-resolve', method: 'post',
  handler: async (req) => {
    if (!isAdmin(req)) return page('Accès refusé', '<div class="error">Administrateur Payload requis.</div>', 403)
    try {
      const readFormData = req.formData
      if (typeof readFormData !== 'function') throw new Error('Form data is unavailable.')
      const form = await readFormData.call(req)
      if (form.get('action') !== 'resolve-all') throw new Error('Unsupported auto-resolver action.')
      const plan = await loadPlan()
      const results = []
      for (const candidate of plan.reviewCandidates.filter(eligibleCandidate)) results.push(await resolveCandidate(req, candidate))
      const summary = results.map((item) => `${item.name}: ${item.generation}, ${item.trims} trim(s), ${item.specs} new spec(s), ${item.blockers} blocker(s)`).join(' · ')
      return await renderOverview(req, summary || 'Nothing eligible to resolve yet.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Auto-resolution failed.'
      req.payload.logger.error({ err: error }, 'Pilot auto-resolution failed')
      return page('Auto-resolution failed', `<div class="error">${esc(message)}</div><p><a class="button secondary" href="/api/pilot-auto-resolve">Retour</a></p>`, 400)
    }
  },
}

export const pilotAutoResolveEndpoints: Endpoint[] = [getEndpoint, postEndpoint]
