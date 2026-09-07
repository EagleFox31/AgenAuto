import type { Endpoint, PayloadRequest } from 'payload'

import { normalizeSlug } from '../lib/automotive/identity'

type Relation = number | string | { id?: number | string | null; name?: string | null } | null | undefined
type Variant = { name?: string | null }
type Mapping = { id?: string | null; sourceVariant?: string; proposedTrim?: Relation }
type Blocker = { id?: string | null; code?: string; note?: string | null }
type Candidate = {
  id: number
  displayName?: string | null
  brandName?: string | null
  modelName?: string | null
  distributor?: string | null
  sourceReference?: string | null
  sourceObservedAt?: string | null
  confidence?: string | null
  mappingStatus?: 'needs_review' | 'mapped' | 'approved' | 'rejected' | 'promoted' | null
  proposedBrand?: Relation
  proposedModel?: Relation
  proposedGeneration?: Relation
  variants?: Variant[] | null
  trimMappings?: Mapping[] | null
  promotionBlockers?: Blocker[] | null
  specifications?: unknown
  rawCandidate?: unknown
  reviewNotes?: string | null
}
type Canonical = { id: number; name?: string | null; model?: Relation; generation?: Relation }
type CleanMapping = { id?: string | null; sourceVariant: string; proposedTrim?: number }
type CleanBlocker = { id?: string | null; code: string; note?: string | null }

const LABELS: Record<string, string> = {
  needs_review: 'Needs review',
  mapped: 'Mapped',
  approved: 'Approved for promotion',
  rejected: 'Rejected',
  promoted: 'Promoted',
}

function admin(req: PayloadRequest): boolean {
  return (req.user as { role?: string } | null | undefined)?.role === 'admin'
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function idOf(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value)
  if (value && typeof value === 'object' && 'id' in value) return idOf((value as { id?: unknown }).id)
  return undefined
}

function needID(value: unknown, label: string): number {
  const id = idOf(value)
  if (id === undefined) throw new Error(`${label} id is invalid.`)
  return id
}

function page(title: string, body: string, status = 200): Response {
  return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — AgenAuto</title><style>
  :root{font-family:Inter,system-ui,sans-serif;color:#10242b;background:#f7f5ef}*{box-sizing:border-box}body{margin:0}main{max-width:1120px;margin:auto;padding:32px 22px 60px}.top{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:22px}.grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr);gap:16px}.stack{display:grid;gap:16px}.card{background:#fff;border:1px solid #dfe3e1;border-radius:12px;padding:18px}h1{margin:0;font-size:32px}h2{margin:0 0 12px;font-size:20px}p{line-height:1.5}.muted{color:#617071}.row{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.badge{display:inline-flex;padding:4px 8px;border:1px solid #cfd8d5;border-radius:999px;font-size:12px;font-weight:700}.ok{color:#176d64;background:#edf8f5;border-color:#acd7cf}.warn{color:#795516;background:#fff8e8;border-color:#e5c892}.button,button{display:inline-flex;border:0;border-radius:8px;background:#176d64;color:white;padding:9px 13px;font:inherit;font-weight:700;text-decoration:none;cursor:pointer}.secondary{background:#eef1ef!important;color:#10242b!important;border:1px solid #d8dfdc!important}form{display:grid;gap:9px}label{display:grid;gap:5px;font-size:13px;font-weight:700}input,textarea{width:100%;padding:9px;border:1px solid #ccd6d3;border-radius:7px;font:inherit}textarea{min-height:80px}.kv{display:grid;grid-template-columns:130px 1fr;gap:8px;padding:7px 0;border-bottom:1px solid #edf0ee}.trim,.blocker{padding-top:12px;margin-top:12px;border-top:1px solid #edf0ee}pre{margin:0;padding:12px;max-height:330px;overflow:auto;border-radius:8px;background:#10242b;color:#f7f5ef;font-size:12px}.table{overflow:auto;border:1px solid #dfe3e1;border-radius:12px;background:white}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #e8ecea;text-align:left}.notice,.error{padding:10px 12px;border-radius:8px;margin-bottom:14px;font-weight:700}.notice{background:#edf8f5;color:#176d64;border:1px solid #acd7cf}.error{background:#fff1f1;color:#8a2f2f;border:1px solid #e5b7b7}@media(max-width:820px){.grid{grid-template-columns:1fr}.top{flex-direction:column}.kv{grid-template-columns:1fr}}
  </style></head><body><main>${body}</main></body></html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

function variants(candidate: Candidate): string[] {
  return (candidate.variants || []).map((item) => String(item.name || '').trim()).filter(Boolean)
}

function blockers(candidate: Candidate): CleanBlocker[] {
  return (candidate.promotionBlockers || [])
    .map((item) => ({
      ...(item.id ? { id: item.id } : {}),
      code: String(item.code || '').trim(),
      ...(item.note !== undefined ? { note: item.note } : {}),
    }))
    .filter((item) => Boolean(item.code))
}

function mappings(candidate: Candidate): CleanMapping[] {
  return (candidate.trimMappings || [])
    .map((item) => {
      const sourceVariant = String(item.sourceVariant || '').trim()
      const proposedTrim = idOf(item.proposedTrim)
      return {
        ...(item.id ? { id: item.id } : {}),
        sourceVariant,
        ...(proposedTrim !== undefined ? { proposedTrim } : {}),
      }
    })
    .filter((item) => Boolean(item.sourceVariant))
}

function note(existing: string | null | undefined, text: string): string {
  return [String(existing || '').trim(), `[${new Date().toISOString()}] ${text}`].filter(Boolean).join('\n')
}

function href(id: number, notice?: string): string {
  const params = new URLSearchParams({ candidate: String(id) })
  if (notice) params.set('notice', notice)
  return `/api/pilot-review?${params.toString()}`
}

function redirect(id: number, notice: string): Response {
  return new Response(null, { status: 303, headers: { Location: href(id, notice) } })
}

async function candidateByID(req: PayloadRequest, id: number, depth = 1): Promise<Candidate> {
  return (await req.payload.findByID({
    collection: 'catalog-ingestion-candidates', id, depth, overrideAccess: false, user: req.user, req,
  })) as unknown as Candidate
}

async function canonicalByID(req: PayloadRequest, collection: 'generations' | 'trims', id: number): Promise<Canonical> {
  return (await req.payload.findByID({ collection, id, depth: 0, overrideAccess: false, user: req.user, req })) as unknown as Canonical
}

async function assertMapped(req: PayloadRequest, candidate: Candidate): Promise<void> {
  const modelId = needID(candidate.proposedModel, 'Model')
  const generationId = needID(candidate.proposedGeneration, 'Generation')
  const generation = await canonicalByID(req, 'generations', generationId)
  if (idOf(generation.model) !== modelId) throw new Error('Generation does not belong to the proposed Model.')

  const sourceVariants = variants(candidate)
  if (!sourceVariants.length) throw new Error('No source-backed Trim name is available.')
  const byVariant = new Map(mappings(candidate).map((item) => [item.sourceVariant, item.proposedTrim]))
  for (const sourceVariant of sourceVariants) {
    const trimId = byVariant.get(sourceVariant)
    if (trimId === undefined) throw new Error(`Trim mapping missing for “${sourceVariant}”.`)
    const trim = await canonicalByID(req, 'trims', trimId)
    if (idOf(trim.generation) !== generationId) throw new Error(`Trim “${sourceVariant}” is linked to another Generation.`)
  }
}

async function createGeneration(req: PayloadRequest, candidate: Candidate, form: FormData): Promise<Response> {
  const modelId = needID(candidate.proposedModel, 'Model')
  const name = String(form.get('generationName') || '').trim()
  if (!name) throw new Error('Generation name is required.')
  const slug = normalizeSlug(name)
  const identityKey = `${modelId}:${slug}`
  const found = await req.payload.find({ collection: 'generations', where: { identityKey: { equals: identityKey } }, limit: 1, depth: 0, overrideAccess: false, user: req.user, req })
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
      draft: true,
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
      overrideAccess: false, user: req.user, req,
    })
  }
  await req.payload.update({
    collection: 'catalog-ingestion-candidates', id: candidate.id,
    data: {
      proposedGeneration: generation.id,
      promotionBlockers: blockers(candidate).filter((item) => item.code !== 'missing_generation_identity'),
      reviewNotes: note(candidate.reviewNotes, `Generation linked: ${generation.name}.`),
    },
    overrideAccess: false, user: req.user, req,
  })
  return redirect(candidate.id, 'Generation linked successfully.')
}

async function createTrim(req: PayloadRequest, candidate: Candidate, form: FormData): Promise<Response> {
  const generationId = needID(candidate.proposedGeneration, 'Generation')
  const sourceVariant = String(form.get('sourceVariant') || '').trim()
  const trimName = String(form.get('trimName') || '').trim()
  if (!sourceVariant || !trimName) throw new Error('Source variant and Trim name are required.')
  if (!variants(candidate).includes(sourceVariant)) throw new Error('Unknown source variant.')
  const slug = normalizeSlug(trimName)
  const identityKey = `${generationId}:${slug}`
  const found = await req.payload.find({ collection: 'trims', where: { identityKey: { equals: identityKey } }, limit: 1, depth: 0, overrideAccess: false, user: req.user, req })
  let trim = found.docs[0]
  if (!trim) {
    trim = await req.payload.create({
      collection: 'trims',
      draft: true,
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
      overrideAccess: false, user: req.user, req,
    })
  }
  const next = mappings(candidate)
  const index = next.findIndex((item) => item.sourceVariant === sourceVariant)
  const mapped: CleanMapping = { sourceVariant, proposedTrim: trim.id }
  if (index >= 0) next[index] = { ...next[index], ...mapped }
  else next.push(mapped)
  await req.payload.update({
    collection: 'catalog-ingestion-candidates', id: candidate.id,
    data: { trimMappings: next, reviewNotes: note(candidate.reviewNotes, `Trim mapped: ${sourceVariant} → ${trim.name}.`) },
    overrideAccess: false, user: req.user, req,
  })
  return redirect(candidate.id, `Trim mapped for ${sourceVariant}.`)
}

async function markMapped(req: PayloadRequest, candidate: Candidate): Promise<Response> {
  await assertMapped(req, candidate)
  await req.payload.update({ collection: 'catalog-ingestion-candidates', id: candidate.id, data: { mappingStatus: 'mapped', reviewNotes: note(candidate.reviewNotes, 'Generation and Trim mappings validated.') }, overrideAccess: false, user: req.user, req })
  return redirect(candidate.id, 'Candidate mapping validated.')
}

async function resolveScope(req: PayloadRequest, candidate: Candidate, form: FormData): Promise<Response> {
  const resolution = String(form.get('resolutionNote') || '').trim()
  if (resolution.length < 12) throw new Error('Add a short verification note.')
  await req.payload.update({ collection: 'catalog-ingestion-candidates', id: candidate.id, data: { promotionBlockers: blockers(candidate).filter((item) => item.code !== 'specs_not_trim_scoped'), reviewNotes: note(candidate.reviewNotes, `Resolved specs_not_trim_scoped: ${resolution}`) }, overrideAccess: false, user: req.user, req })
  return redirect(candidate.id, 'Specification scope blocker resolved.')
}

async function approve(req: PayloadRequest, candidate: Candidate): Promise<Response> {
  if (candidate.mappingStatus !== 'mapped') throw new Error('Validate mapping before approval.')
  await assertMapped(req, candidate)
  const remaining = blockers(candidate)
  if (remaining.length) throw new Error(`Promotion blockers remain: ${remaining.map((item) => item.code).join(', ')}.`)
  await req.payload.update({ collection: 'catalog-ingestion-candidates', id: candidate.id, data: { mappingStatus: 'approved', reviewNotes: note(candidate.reviewNotes, 'Candidate approved for promotion.') }, overrideAccess: false, user: req.user, req })
  return redirect(candidate.id, 'Candidate approved for promotion.')
}

function renderTrims(candidate: Candidate): string {
  const sourceVariants = variants(candidate)
  if (!sourceVariants.length) return '<p class="muted">No reliable Trim names were extracted. Do not invent one.</p>'
  const byVariant = new Map(mappings(candidate).map((item) => [item.sourceVariant, item.proposedTrim]))
  return sourceVariants.map((sourceVariant) => {
    const trimId = byVariant.get(sourceVariant)
    if (trimId !== undefined) return `<div class="trim"><div class="row"><strong>${esc(sourceVariant)}</strong><span class="badge ok">Mapped</span><a class="button secondary" href="/admin/collections/trims/${trimId}">Open Trim</a></div></div>`
    return `<div class="trim"><div class="row"><strong>${esc(sourceVariant)}</strong><span class="badge warn">To map</span></div><form method="post" action="/api/pilot-review"><input type="hidden" name="action" value="create-trim"><input type="hidden" name="candidate" value="${candidate.id}"><input type="hidden" name="sourceVariant" value="${esc(sourceVariant)}"><label>Canonical Trim name<input name="trimName" value="${esc(sourceVariant)}" required></label><button type="submit">Create / link Trim</button></form></div>`
  }).join('')
}

function renderBlockers(candidate: Candidate): string {
  const remaining = blockers(candidate)
  if (!remaining.length) return '<p><span class="badge ok">No promotion blockers</span></p>'
  return remaining.map((item) => {
    const action = item.code === 'specs_not_trim_scoped'
      ? `<form method="post" action="/api/pilot-review"><input type="hidden" name="action" value="resolve-spec-scope"><input type="hidden" name="candidate" value="${candidate.id}"><label>Verification note<textarea name="resolutionNote" required></textarea></label><button class="secondary" type="submit">Confirm verification</button></form>`
      : item.code === 'missing_generation_identity' ? '<p class="muted">Resolved when a Generation is linked.</p>'
      : item.code === 'no_trim_names_extracted' ? '<p class="muted">Hard blocker: obtain an official source naming the Trim.</p>'
      : '<p class="muted">Review this blocker before promotion.</p>'
    return `<div class="blocker"><strong>${esc(item.code)}</strong><p class="muted">${esc(item.note || '')}</p>${action}</div>`
  }).join('')
}

function renderCandidate(candidate: Candidate, notice?: string): string {
  const generationId = idOf(candidate.proposedGeneration)
  const sourceVariants = variants(candidate)
  const byVariant = new Map(mappings(candidate).map((item) => [item.sourceVariant, item.proposedTrim]))
  const mappedCount = sourceVariants.filter((item) => byVariant.get(item) !== undefined).length
  const remaining = blockers(candidate)
  const status = candidate.mappingStatus || 'needs_review'
  const canMap = generationId !== undefined && sourceVariants.length > 0 && mappedCount === sourceVariants.length && status === 'needs_review'
  const canApprove = status === 'mapped' && remaining.length === 0
  const source = String(candidate.sourceReference || '')
  return `${notice ? `<div class="notice">${esc(notice)}</div>` : ''}<div class="top"><div><p class="muted">Pilot review workspace</p><h1>${esc(candidate.displayName || candidate.id)}</h1><p class="muted">${esc(candidate.distributor || '—')} · confidence ${esc(candidate.confidence || '—')}</p></div><div class="row"><a class="button secondary" href="/api/pilot-review">← Candidates</a><a class="button secondary" href="/admin/collections/catalog-ingestion-candidates/${candidate.id}">Payload record</a></div></div><div class="grid"><div class="stack">
<section class="card"><h2>1. Source identity</h2><div class="kv"><strong>Brand</strong><span>${esc(candidate.brandName || '—')}</span></div><div class="kv"><strong>Model</strong><span>${esc(candidate.modelName || '—')}</span></div><div class="kv"><strong>Source</strong><span>${/^https?:\/\//.test(source) ? `<a href="${esc(source)}" target="_blank" rel="noreferrer">Open source ↗</a>` : '—'}</span></div></section>
<section class="card"><h2>2. Generation</h2>${generationId !== undefined ? `<div class="row"><span class="badge ok">Linked</span><a class="button secondary" href="/admin/collections/generations/${generationId}">Open Generation</a></div>` : `<p class="muted">Enter only an identity verified from a reliable source.</p><form method="post" action="/api/pilot-review"><input type="hidden" name="action" value="create-generation"><input type="hidden" name="candidate" value="${candidate.id}"><label>Generation name<input name="generationName" required></label><label>Generation code<input name="generationCode"></label><label>Production start year<input name="productionStartYear" inputmode="numeric"></label><label>Production end year<input name="productionEndYear" inputmode="numeric"></label><button type="submit">Create / link Generation</button></form>`}</section>
<section class="card"><h2>3. Source Trims → canonical Trims</h2>${renderTrims(candidate)}</section>
<section class="card"><h2>4. Observed specifications</h2><pre>${esc(JSON.stringify(candidate.specifications ?? [], null, 2))}</pre></section></div>
<aside class="stack"><section class="card"><h2>Review state</h2><p><span class="badge ${status === 'approved' ? 'ok' : 'warn'}">${esc(LABELS[status] || status)}</span></p><p>${generationId !== undefined ? '✓' : '○'} Generation</p><p>${mappedCount === sourceVariants.length && sourceVariants.length ? '✓' : '○'} Trims ${mappedCount}/${sourceVariants.length}</p><p>${remaining.length === 0 ? '✓' : '○'} Blockers ${remaining.length}</p>${canMap ? `<form method="post" action="/api/pilot-review"><input type="hidden" name="action" value="mark-mapped"><input type="hidden" name="candidate" value="${candidate.id}"><button type="submit">Validate mapping</button></form>` : ''}${canApprove ? `<form method="post" action="/api/pilot-review"><input type="hidden" name="action" value="approve"><input type="hidden" name="candidate" value="${candidate.id}"><button type="submit">Approve for promotion</button></form>` : ''}</section><section class="card"><h2>Promotion blockers</h2>${renderBlockers(candidate)}</section><section class="card"><h2>Review notes</h2><p class="muted" style="white-space:pre-wrap">${esc(candidate.reviewNotes || 'No notes yet.')}</p></section><section class="card"><h2>Raw candidate</h2><pre>${esc(JSON.stringify(candidate.rawCandidate ?? {}, null, 2))}</pre></section></aside></div>`
}

async function list(req: PayloadRequest): Promise<Response> {
  const result = await req.payload.find({ collection: 'catalog-ingestion-candidates', limit: 100, depth: 0, sort: 'displayName', overrideAccess: false, user: req.user, req })
  const candidates = result.docs as unknown as Candidate[]
  const rows = candidates.map((candidate) => {
    const sourceVariants = variants(candidate)
    const byVariant = new Map(mappings(candidate).map((item) => [item.sourceVariant, item.proposedTrim]))
    const mapped = sourceVariants.filter((item) => byVariant.get(item) !== undefined).length
    return `<tr><td><strong>${esc(candidate.displayName || candidate.id)}</strong><br><span class="muted">${esc(candidate.distributor || '')}</span></td><td>${esc(LABELS[candidate.mappingStatus || 'needs_review'])}</td><td>${idOf(candidate.proposedGeneration) !== undefined ? '✓' : '—'}</td><td>${mapped}/${sourceVariants.length}</td><td>${blockers(candidate).length}</td><td><a class="button secondary" href="${href(candidate.id)}">Review</a></td></tr>`
  }).join('')
  return page('Pilot review', `<div class="top"><div><p class="muted">AgenAuto · Cameroon pilot</p><h1>Pilot review workspace</h1><p class="muted">${candidates.length} staging candidates.</p></div><a class="button secondary" href="/admin/collections/catalog-ingestion-candidates">Payload list</a></div><div class="table"><table><thead><tr><th>Candidate</th><th>Status</th><th>Generation</th><th>Trims</th><th>Blockers</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`)
}

const getEndpoint: Endpoint = {
  path: '/pilot-review', method: 'get',
  handler: async (req) => {
    if (!admin(req)) return page('Access denied', '<div class="error">Payload administrator required.</div>', 403)
    try {
      const url = new URL(req.url ?? 'http://localhost/api/pilot-review')
      const raw = url.searchParams.get('candidate')
      if (!raw) return list(req)
      const candidate = await candidateByID(req, needID(raw, 'Candidate'), 1)
      return page(candidate.displayName || 'Pilot review', renderCandidate(candidate, url.searchParams.get('notice') || undefined))
    } catch (error) {
      req.payload.logger.error({ err: error }, 'Pilot review page failed')
      return page('Review unavailable', `<div class="error">${esc(error instanceof Error ? error.message : 'Unable to load pilot review.')}</div>`, 500)
    }
  },
}

const postEndpoint: Endpoint = {
  path: '/pilot-review', method: 'post',
  handler: async (req) => {
    if (!admin(req)) return page('Access denied', '<div class="error">Payload administrator required.</div>', 403)
    try {
      if (typeof req.formData !== 'function') throw new Error('Form data is unavailable.')
      const form = await req.formData()
      const candidate = await candidateByID(req, needID(form.get('candidate'), 'Candidate'), 0)
      switch (String(form.get('action') || '')) {
        case 'create-generation': return createGeneration(req, candidate, form)
        case 'create-trim': return createTrim(req, candidate, form)
        case 'mark-mapped': return markMapped(req, candidate)
        case 'resolve-spec-scope': return resolveScope(req, candidate, form)
        case 'approve': return approve(req, candidate)
        default: throw new Error('Unsupported review action.')
      }
    } catch (error) {
      req.payload.logger.error({ err: error }, 'Pilot review action failed')
      return page('Review action failed', `<div class="error">${esc(error instanceof Error ? error.message : 'Pilot review action failed.')}</div><p><a class="button secondary" href="/api/pilot-review">Back to workspace</a></p>`, 400)
    }
  },
}

export const pilotReviewEndpoints: Endpoint[] = [getEndpoint, postEndpoint]
