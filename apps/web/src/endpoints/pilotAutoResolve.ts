import type { Endpoint, PayloadRequest } from 'payload'

import { normalizeSlug, relationshipId } from '../lib/automotive/identity'

const PILOT_BRANCH = 'feat/cameroon-pilot-ingestion'

type Evidence = {
  kind?: string
  url?: string
  note?: string
}

type GenerationHint = {
  name?: string
  code?: string
  production_start_year?: number
  production_end_year?: number
  confidence?: string
  evidence?: Evidence[]
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

type PilotPlan = {
  schema_version: number
  mode: string
  reviewCandidates: PlanCandidate[]
}

type StagingCandidate = {
  id: number | string
  candidateKey?: string | null
  displayName?: string | null
  proposedModel?: unknown
  proposedGeneration?: unknown
  reviewNotes?: string | null
}

type CanonicalDoc = {
  id: number | string
  name?: string | null
}

function isAdmin(req: PayloadRequest): boolean {
  const user = req.user as { role?: string } | null | undefined
  return user?.role === 'admin'
}

function htmlEscape(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function page(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${htmlEscape(title)} — AgenAuto</title><style>
      :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#10242b;background:#f7f5ef}*{box-sizing:border-box}body{margin:0}main{max-width:980px;margin:0 auto;padding:48px 24px 72px}h1{font-size:34px;margin:0 0 10px}h2{margin:0 0 12px;font-size:20px}p{line-height:1.55}.muted{color:#667576}.card{background:#fff;border:1px solid #dfe3e1;border-radius:12px;padding:22px;margin:16px 0}.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.badge{border:1px solid #acd7cf;background:#edf8f5;color:#176d64;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:700}.warn{border-color:#e5c892;background:#fff8e8;color:#795516}.button,button{display:inline-flex;border:0;border-radius:8px;background:#176d64;color:white;padding:11px 15px;font:inherit;font-weight:700;text-decoration:none;cursor:pointer}.secondary{background:#eef1ef;color:#10242b;border:1px solid #d8dfdc}.error{background:#fff1f1;border:1px solid #e5b7b7;color:#8a2f2f;padding:12px 14px;border-radius:8px}.ok{background:#edf8f5;border:1px solid #acd7cf;color:#176d64;padding:12px 14px;border-radius:8px}table{width:100%;border-collapse:collapse;background:#fff}th,td{padding:12px 10px;border-bottom:1px solid #e8ecea;text-align:left}th{font-size:12px;text-transform:uppercase;color:#6b7778}.table{overflow:auto;border:1px solid #dfe3e1;border-radius:12px}</style></head><body><main>${body}</main></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

function pilotSha(): string {
  const branch = process.env.VERCEL_GIT_COMMIT_REF
  const sha = process.env.VERCEL_GIT_COMMIT_SHA
  if (branch !== PILOT_BRANCH) {
    throw new Error(`Auto-resolution is locked to ${PILOT_BRANCH}.`)
  }
  if (!sha || !/^[0-9a-f]{40}$/i.test(sha)) {
    throw new Error('Pinned Vercel commit SHA is unavailable.')
  }
  return sha
}

async function loadPlan(): Promise<PilotPlan> {
  const sha = pilotSha()
  const url = `https://raw.githubusercontent.com/EagleFox31/AgenAuto/${sha}/data/pilot/payload-import-plan.json`
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Unable to load pinned pilot plan (${response.status}).`)
  const plan = (await response.json()) as PilotPlan
  if (plan.schema_version !== 1 || plan.mode !== 'draft_review_only') {
    throw new Error('Unexpected pilot plan schema.')
  }
  return plan
}

function generationHint(candidate: PlanCandidate): GenerationHint | null {
  const raw = candidate.rawCandidate.generation_hint
  if (!raw || typeof raw !== 'object') return null
  const hint = raw as GenerationHint
  const evidence = Array.isArray(hint.evidence) ? hint.evidence : []
  const traceable = evidence.filter((item) => {
    try {
      const url = new URL(String(item.url || ''))
      return url.protocol === 'https:' || url.protocol === 'http:'
    } catch {
      return false
    }
  })
  if (hint.confidence !== 'A' || !hint.name || traceable.length < 2) return null
  return { ...hint, evidence: traceable }
}

function asNumericID(value: unknown, label: string): number {
  const id = relationshipId(value)
  const numeric = Number(id)
  if (!Number.isFinite(numeric) || numeric <= 0) throw new Error(`${label} id is unavailable.`)
  return numeric
}

function note(existing: string | null | undefined, message: string): string {
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
  const found = await req.payload.find({
    collection: 'generations',
    where: { identityKey: { equals: identityKey } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  })
  if (found.docs[0]) return found.docs[0] as CanonicalDoc

  const evidence = hint.evidence || []
  return (await req.payload.create({
    collection: 'generations',
    draft: true,
    data: {
      model: modelId,
      name: hint.name || 'Unknown generation',
      slug,
      generationCode: hint.code || undefined,
      productionStartYear: hint.production_start_year,
      productionEndYear: hint.production_end_year,
      catalogStatus: 'draft',
      sourceType: 'regulatory',
      sourceReference: evidence[0]?.url || candidate.sourceReference,
      sourceObservedAt: candidate.sourceObservedAt,
      sourceNotes: evidence
        .map((item) => `${item.kind || 'evidence'}: ${item.url}${item.note ? ` — ${item.note}` : ''}`)
        .join('\n'),
      qualityFlags: [
        {
          code: 'auto_resolved_a_grade_generation',
          severity: 'warning',
          note: 'Generation was created automatically from multiple traceable A-grade sources.',
        },
      ],
      reviewNotes: 'Auto-resolved by the pilot evidence resolver; remains draft until canonical publication review.',
    },
    overrideAccess: false,
    user: req.user,
    req,
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
  const found = await req.payload.find({
    collection: 'trims',
    where: { identityKey: { equals: identityKey } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  })
  if (found.docs[0]) return found.docs[0] as CanonicalDoc

  return (await req.payload.create({
    collection: 'trims',
    draft: true,
    data: {
      generation: generationId,
      name: trimName,
      slug,
      catalogStatus: 'draft',
      sourceType: 'official-dealer',
      sourceReference: candidate.sourceReference,
      sourceObservedAt: candidate.sourceObservedAt,
      sourceNotes: `Source-backed trim extracted from the official distributor brochure for ${candidate.displayName}.`,
      qualityFlags: [
        {
          code: 'auto_mapped_source_trim',
          severity: 'warning',
          note: 'Trim identity was auto-created from a source-backed brochure variant name.',
        },
      ],
      reviewNotes: 'Automatically linked from the pilot candidate; remains draft until canonical publication review.',
    },
    overrideAccess: false,
    user: req.user,
    req,
  })) as CanonicalDoc
}

async function resolveCandidate(
  req: PayloadRequest,
  planned: PlanCandidate,
): Promise<{ name: string; generation: string; trims: number; blockers: number }> {
  const hint = generationHint(planned)
  if (!hint) throw new Error(`${planned.displayName}: no A-grade generation hint.`)
  if (!planned.variants.length) throw new Error(`${planned.displayName}: no source-backed trims.`)

  const found = await req.payload.find({
    collection: 'catalog-ingestion-candidates',
    where: { candidateKey: { equals: planned.candidateKey } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  })
  const candidate = found.docs[0] as StagingCandidate | undefined
  if (!candidate) throw new Error(`${planned.displayName}: staging candidate not found.`)

  const modelId = asNumericID(candidate.proposedModel, 'Model')
  const generation = await ensureGeneration(req, modelId, hint, planned)
  const generationId = asNumericID(generation.id, 'Generation')

  const trimMappings: Array<{ sourceVariant: string; proposedTrim: number }> = []
  for (const variant of planned.variants) {
    const trim = await ensureTrim(req, generationId, variant, planned)
    trimMappings.push({ sourceVariant: variant, proposedTrim: asNumericID(trim.id, 'Trim') })
  }

  const remainingBlockers = planned.promotionBlockers.filter(
    (blocker) => !['missing_generation_identity', 'no_trim_names_extracted'].includes(blocker.code),
  )
  const mappingStatus = remainingBlockers.length === 0 ? 'approved' : 'mapped'

  await req.payload.update({
    collection: 'catalog-ingestion-candidates',
    id: candidate.id,
    data: {
      variants: planned.variants.map((name) => ({ name })),
      proposedGeneration: generationId,
      trimMappings,
      promotionBlockers: remainingBlockers,
      mappingStatus,
      reviewNotes: note(
        candidate.reviewNotes,
        `Auto-resolved ${hint.name}${hint.code ? ` (${hint.code})` : ''} and ${trimMappings.length} source-backed trim(s) from A-grade evidence.`,
      ),
    },
    overrideAccess: false,
    user: req.user,
    req,
  })

  return {
    name: planned.displayName,
    generation: String(hint.name),
    trims: trimMappings.length,
    blockers: remainingBlockers.length,
  }
}

async function renderOverview(req: PayloadRequest, message?: string): Promise<Response> {
  const plan = await loadPlan()
  const eligible = plan.reviewCandidates.filter((candidate) => generationHint(candidate) && candidate.variants.length)
  const rows = eligible
    .map((candidate) => {
      const hint = generationHint(candidate)
      return `<tr><td><strong>${htmlEscape(candidate.displayName)}</strong></td><td>${htmlEscape(hint?.name)}</td><td>${htmlEscape(hint?.code || '—')}</td><td>${candidate.variants.map(htmlEscape).join(', ')}</td><td><span class="badge">A-grade</span></td></tr>`
    })
    .join('')

  return page(
    'Pilot auto-resolver',
    `${message ? `<div class="ok">${htmlEscape(message)}</div>` : ''}<div class="row" style="justify-content:space-between"><div><p class="muted">AgenAuto · Cameroon pilot</p><h1>Evidence auto-resolver</h1><p class="muted">No manual Generation/Trim typing. Only candidates with multiple traceable A-grade sources are eligible.</p></div><a class="button secondary" href="/api/pilot-review">← Review workspace</a></div><div class="card"><h2>${eligible.length} candidate(s) eligible now</h2><p>Generation identities come from evidence; Trim names must come from the official vehicle source. Canonical records remain <strong>draft</strong>.</p><form method="post" action="/api/pilot-auto-resolve"><input type="hidden" name="action" value="resolve-all"/><button type="submit">Auto-resolve all eligible candidates</button></form></div><div class="table"><table><thead><tr><th>Candidate</th><th>Generation</th><th>Code</th><th>Source trims</th><th>Confidence</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No eligible candidate yet.</td></tr>'}</tbody></table></div>`,
  )
}

const getEndpoint: Endpoint = {
  path: '/pilot-auto-resolve',
  method: 'get',
  handler: async (req) => {
    if (!isAdmin(req)) return page('Accès refusé', '<div class="error">Administrateur Payload requis.</div>', 403)
    try {
      return await renderOverview(req)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Auto-resolver unavailable.'
      req.payload.logger.error({ err: error }, 'Pilot auto-resolver overview failed')
      return page('Auto-resolver indisponible', `<div class="error">${htmlEscape(message)}</div>`, 500)
    }
  },
}

const postEndpoint: Endpoint = {
  path: '/pilot-auto-resolve',
  method: 'post',
  handler: async (req) => {
    if (!isAdmin(req)) return page('Accès refusé', '<div class="error">Administrateur Payload requis.</div>', 403)
    try {
      const readFormData = req.formData
      if (typeof readFormData !== 'function') throw new Error('Form data is unavailable.')
      const form = await readFormData.call(req)
      if (form.get('action') !== 'resolve-all') throw new Error('Unsupported auto-resolver action.')

      const plan = await loadPlan()
      const eligible = plan.reviewCandidates.filter((candidate) => generationHint(candidate) && candidate.variants.length)
      const results = []
      for (const candidate of eligible) results.push(await resolveCandidate(req, candidate))

      const summary = results
        .map((item) => `${item.name}: ${item.generation}, ${item.trims} trim(s), ${item.blockers} blocker(s) remaining`)
        .join(' · ')
      return await renderOverview(req, summary || 'Nothing eligible to resolve yet.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Auto-resolution failed.'
      req.payload.logger.error({ err: error }, 'Pilot auto-resolution failed')
      return page('Auto-resolution failed', `<div class="error">${htmlEscape(message)}</div><p><a class="button secondary" href="/api/pilot-auto-resolve">Retour</a></p>`, 400)
    }
  },
}

export const pilotAutoResolveEndpoints: Endpoint[] = [getEndpoint, postEndpoint]
