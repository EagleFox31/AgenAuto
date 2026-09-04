import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canonicalReadAccess,
  hasBlockingQualityFlags,
  reviewMetadataForTransition,
  validateCatalogQuality,
  validateCatalogTransition,
} from '../apps/web/src/access/catalogQuality.js'

const admin = { id: 1, role: 'admin' }
const dataEditor = { id: 2, role: 'data_editor' }
const dealerAgent = { id: 3, role: 'dealer_agent', dealerOrganization: 9 }

test('platform editors see the full canonical catalog while public and dealer reads are publish-only', () => {
  assert.equal(canonicalReadAccess(admin), true)
  assert.equal(canonicalReadAccess(dataEditor), true)
  assert.deepEqual(canonicalReadAccess(dealerAgent), {
    catalogStatus: { equals: 'published' },
  })
  assert.deepEqual(canonicalReadAccess(null), {
    catalogStatus: { equals: 'published' },
  })
})

test('catalog publication requires the review lifecycle', () => {
  assert.equal(validateCatalogTransition({ previousStatus: 'draft', nextStatus: 'in_review' }), true)
  assert.equal(validateCatalogTransition({ previousStatus: 'in_review', nextStatus: 'published' }), true)
  assert.equal(validateCatalogTransition({ previousStatus: 'published', nextStatus: 'in_review' }), true)
  assert.equal(validateCatalogTransition({ previousStatus: 'rejected', nextStatus: 'in_review' }), true)

  assert.throws(
    () => validateCatalogTransition({ previousStatus: 'draft', nextStatus: 'published' }),
    /not allowed/,
  )
})

test('published catalog records must return to review before content changes', () => {
  assert.equal(
    validateCatalogTransition({
      previousStatus: 'published',
      nextStatus: 'published',
      data: { catalogStatus: 'published' },
    }),
    true,
  )

  assert.throws(
    () => validateCatalogTransition({
      previousStatus: 'published',
      nextStatus: 'published',
      data: { name: 'Changed name' },
    }),
    /return to in_review/,
  )
})

test('review and publication require provenance and publication rejects blocking quality flags', () => {
  assert.throws(
    () => validateCatalogQuality({ status: 'in_review', sourceReference: '' }),
    /sourceReference is required/,
  )

  assert.equal(
    validateCatalogQuality({
      status: 'published',
      sourceReference: 'Toyota Cameroon brochure 2026',
      qualityFlags: [{ code: 'UNIT-CHECK', severity: 'warning' }],
    }),
    true,
  )

  assert.equal(hasBlockingQualityFlags([{ severity: 'blocking' }]), true)
  assert.throws(
    () => validateCatalogQuality({
      status: 'published',
      sourceReference: 'Official source',
      qualityFlags: [{ code: 'CONFLICT', severity: 'blocking' }],
    }),
    /blocking quality flags/,
  )
})

test('rejected records require review notes and publication records reviewer metadata', () => {
  assert.throws(
    () => validateCatalogQuality({ status: 'rejected', reviewNotes: '' }),
    /reviewNotes are required/,
  )

  assert.deepEqual(
    reviewMetadataForTransition({
      previousStatus: 'in_review',
      nextStatus: 'published',
      userId: 7,
      now: '2026-09-04T14:00:00.000Z',
    }),
    {
      reviewedAt: '2026-09-04T14:00:00.000Z',
      reviewedBy: 7,
    },
  )

  assert.deepEqual(
    reviewMetadataForTransition({
      previousStatus: 'published',
      nextStatus: 'in_review',
      userId: 7,
    }),
    { reviewedAt: null, reviewedBy: null },
  )
})
