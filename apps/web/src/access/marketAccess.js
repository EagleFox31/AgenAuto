import {
  dealerOrganizationId,
  dealerScopeForUser,
  isDealerUser,
  roleOf,
  relationshipId,
} from './rbac.js'

const PLATFORM_ROLES = new Set(['admin', 'data_editor'])

/** @param {unknown} user */
export function isPlatformMarketUser(user) {
  const role = roleOf(user)
  return Boolean(role && PLATFORM_ROLES.has(role))
}

/** @param {unknown} user */
export function canManageDealerStructure(user) {
  const role = roleOf(user)
  return isPlatformMarketUser(user) || role === 'dealer_manager'
}

/** @param {unknown} user */
export function canManageDealerOperations(user) {
  return isPlatformMarketUser(user) || isDealerUser(user)
}

/**
 * Public callers see active commercial records. Dealer users see every record in
 * their tenant. Platform users see the whole market dataset.
 *
 * @param {unknown} user
 * @param {string} [tenantField]
 * @param {string} [statusField]
 */
export function publicActiveOrDealerRead(user, tenantField = 'dealerOrganization', statusField = 'status') {
  if (isPlatformMarketUser(user)) return true
  if (isDealerUser(user)) return dealerScopeForUser(user, tenantField)

  return {
    [statusField]: {
      equals: 'active',
    },
  }
}

/** @param {unknown} user @param {string} [tenantField] */
export function privateDealerRead(user, tenantField = 'dealerOrganization') {
  if (isPlatformMarketUser(user)) return true
  if (isDealerUser(user)) return dealerScopeForUser(user, tenantField)
  return false
}

/**
 * Payload update/delete access result for mutable dealer structures.
 *
 * @param {unknown} user
 * @param {'structure'|'operations'} capability
 * @param {string} [tenantField]
 */
export function scopedDealerMutation(user, capability, tenantField = 'dealerOrganization') {
  const allowed = capability === 'structure'
    ? canManageDealerStructure(user)
    : canManageDealerOperations(user)

  if (!allowed) return false
  if (isPlatformMarketUser(user)) return true
  return dealerScopeForUser(user, tenantField)
}

/**
 * Price and availability rows are observations. Dealer users may append them but
 * cannot rewrite or delete history. Platform users may repair data when needed.
 *
 * @param {unknown} user
 */
export function canRepairMarketHistory(user) {
  return isPlatformMarketUser(user)
}

/**
 * Forces dealer-authored data into the authenticated tenant and rejects attempts
 * to cross tenant boundaries. Platform users must still provide a tenant.
 *
 * @param {object} args
 * @param {unknown} args.user
 * @param {Record<string, any>} args.data
 * @param {Record<string, any>|undefined|null} [args.originalDoc]
 * @param {string} [args.field]
 */
export function enforceDealerTenant({ user, data, originalDoc, field = 'dealerOrganization' }) {
  const current = relationshipId(data?.[field] ?? originalDoc?.[field])

  if (isDealerUser(user)) {
    const tenantId = dealerOrganizationId(user)
    if (tenantId === undefined) {
      throw new Error('Dealer user is missing a dealer organization.')
    }

    if (current !== undefined && String(current) !== String(tenantId)) {
      throw new Error('Dealer users cannot write commercial data for another organization.')
    }

    data[field] = tenantId
    return data
  }

  if (isPlatformMarketUser(user)) {
    if (current === undefined) {
      throw new Error(`${field} is required for commercial market data.`)
    }
    return data
  }

  throw new Error('Authentication is required to mutate commercial market data.')
}
