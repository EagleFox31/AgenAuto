import { canManageCanonical } from './rbac.js'

export const CATALOG_STATUSES = Object.freeze([
  'draft',
  'in_review',
  'published',
  'rejected',
])

const ALLOWED_TRANSITIONS = Object.freeze({
  draft: new Set(['draft', 'in_review']),
  in_review: new Set(['in_review', 'draft', 'published', 'rejected']),
  published: new Set(['published', 'in_review']),
  rejected: new Set(['rejected', 'draft', 'in_review']),
})

/** @param {unknown} user */
export function canonicalReadAccess(user) {
  if (canManageCanonical(user)) return true

  return {
    catalogStatus: {
      equals: 'published',
    },
  }
}

/** @param {unknown} flags */
export function hasBlockingQualityFlags(flags) {
  return Array.isArray(flags) && flags.some((flag) => (
    flag && typeof flag === 'object' && flag.severity === 'blocking'
  ))
}

/**
 * Enforces the explicit editorial lifecycle used by canonical catalog records.
 * A published record must return to review before any content change.
 *
 * @param {object} args
 * @param {unknown} args.previousStatus
 * @param {unknown} args.nextStatus
 * @param {unknown} [args.data]
 */
export function validateCatalogTransition({ previousStatus, nextStatus, data = {} }) {
  const from = typeof previousStatus === 'string' ? previousStatus : 'draft'
  const to = typeof nextStatus === 'string' ? nextStatus : from

  if (!CATALOG_STATUSES.includes(from) || !CATALOG_STATUSES.includes(to)) {
    throw new Error('A valid catalogStatus is required.')
  }

  if (!ALLOWED_TRANSITIONS[from].has(to)) {
    throw new Error(`Catalog status transition ${from} -> ${to} is not allowed.`)
  }

  if (from === 'published' && to === 'published') {
    const changedKeys = data && typeof data === 'object'
      ? Object.keys(data).filter((key) => key !== 'catalogStatus')
      : []

    if (changedKeys.length > 0) {
      throw new Error('Published catalog records must return to in_review before content changes.')
    }
  }

  return true
}

/**
 * @param {object} args
 * @param {unknown} args.status
 * @param {unknown} args.sourceReference
 * @param {unknown} args.qualityFlags
 * @param {unknown} args.reviewNotes
 */
export function validateCatalogQuality({ status, sourceReference, qualityFlags, reviewNotes }) {
  if (status === 'in_review' || status === 'published') {
    if (typeof sourceReference !== 'string' || sourceReference.trim().length === 0) {
      throw new Error('A sourceReference is required before catalog review or publication.')
    }
  }

  if (status === 'published' && hasBlockingQualityFlags(qualityFlags)) {
    throw new Error('Catalog records with blocking quality flags cannot be published.')
  }

  if (status === 'rejected' && (typeof reviewNotes !== 'string' || reviewNotes.trim().length === 0)) {
    throw new Error('reviewNotes are required when a catalog record is rejected.')
  }

  return true
}

/**
 * @param {object} args
 * @param {unknown} args.previousStatus
 * @param {unknown} args.nextStatus
 * @param {unknown} args.userId
 * @param {string} [args.now]
 */
export function reviewMetadataForTransition({ previousStatus, nextStatus, userId, now }) {
  if (previousStatus !== 'published' && nextStatus === 'published') {
    return {
      reviewedAt: now || new Date().toISOString(),
      reviewedBy: userId ?? null,
    }
  }

  if (previousStatus === 'published' && nextStatus === 'in_review') {
    return {
      reviewedAt: null,
      reviewedBy: null,
    }
  }

  return {}
}
