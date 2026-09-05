import type { PayloadRequest } from 'payload'

import { relationshipId } from '../../access/rbac.js'

type MarketPayload = {
  findByID(args: {
    collection: string
    id: string | number
    overrideAccess: true
    req: PayloadRequest
  }): Promise<Record<string, unknown>>
}

export function normalizeMarketSlug(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function marketIdentity(...values: unknown[]): string {
  return values
    .map((value) => relationshipId(value) ?? normalizeMarketSlug(value))
    .map(String)
    .join(':')
}

export async function assertRelatedDealer(
  req: PayloadRequest,
  collection: string,
  relation: unknown,
  expectedDealerOrganization: unknown,
): Promise<void> {
  const relationId = relationshipId(relation)
  const expectedId = relationshipId(expectedDealerOrganization)

  if (relationId === undefined || expectedId === undefined) {
    throw new Error('A valid dealer relationship is required.')
  }

  const payload = req.payload as unknown as MarketPayload
  const related = await payload.findByID({
    collection,
    id: relationId,
    overrideAccess: true,
    req,
  })

  const relatedDealerId = relationshipId(related.dealerOrganization)
  if (relatedDealerId === undefined || String(relatedDealerId) !== String(expectedId)) {
    throw new Error(`${collection} must belong to the same dealer organization.`)
  }
}

export async function assertPublishedTrim(
  req: PayloadRequest,
  trim: unknown,
): Promise<void> {
  const trimId = relationshipId(trim)
  if (trimId === undefined) throw new Error('A canonical trim is required for an offer.')

  const payload = req.payload as unknown as MarketPayload
  const related = await payload.findByID({
    collection: 'trims',
    id: trimId,
    overrideAccess: true,
    req,
  })

  if (related.catalogStatus !== 'published') {
    throw new Error('Active dealer offers can only reference published canonical trims.')
  }
}
