export const USER_ROLES = Object.freeze([
  'admin',
  'data_editor',
  'dealer_manager',
  'dealer_agent',
])

const DEALER_ROLES = new Set(['dealer_manager', 'dealer_agent'])
const CANONICAL_EDITOR_ROLES = new Set(['admin', 'data_editor'])

/** @param {unknown} value */
export function relationshipId(value) {
  if (typeof value === 'string' || typeof value === 'number') return value

  if (value && typeof value === 'object' && 'id' in value) {
    const id = value.id
    if (typeof id === 'string' || typeof id === 'number') return id
  }

  return undefined
}

/** @param {unknown} user */
export function roleOf(user) {
  if (!user || typeof user !== 'object' || !('role' in user)) return undefined
  return typeof user.role === 'string' ? user.role : undefined
}

/** @param {unknown} user */
export function isAdmin(user) {
  return roleOf(user) === 'admin'
}

/** @param {unknown} user */
export function isDealerUser(user) {
  const role = roleOf(user)
  return Boolean(role && DEALER_ROLES.has(role))
}

/** @param {unknown} user */
export function canManageCanonical(user) {
  const role = roleOf(user)
  return Boolean(role && CANONICAL_EDITOR_ROLES.has(role))
}

/** @param {unknown} user */
export function dealerOrganizationId(user) {
  if (!user || typeof user !== 'object' || !('dealerOrganization' in user)) return undefined
  return relationshipId(user.dealerOrganization)
}

/**
 * Returns a Payload access result that scopes dealer users to their own tenant.
 * Admins and data editors are unrestricted because they operate platform-wide.
 *
 * @param {unknown} user
 * @param {string} [field]
 */
export function dealerScopeForUser(user, field = 'dealerOrganization') {
  const role = roleOf(user)
  if (role === 'admin' || role === 'data_editor') return true
  if (!isDealerUser(user)) return false

  const organizationId = dealerOrganizationId(user)
  if (organizationId === undefined) return false

  return {
    [field]: {
      equals: organizationId,
    },
  }
}

/** @param {unknown} user @param {unknown} documentId */
export function canUpdateOwnUser(user, documentId) {
  if (isAdmin(user)) return true
  if (!user || typeof user !== 'object' || !('id' in user)) return false

  const userId = relationshipId(user.id)
  const targetId = relationshipId(documentId)
  return userId !== undefined && targetId !== undefined && String(userId) === String(targetId)
}

/** @param {unknown} role */
export function isKnownRole(role) {
  return typeof role === 'string' && USER_ROLES.includes(role)
}

/** @param {unknown} role @param {unknown} organization */
export function validateRoleTenantPair(role, organization) {
  if (!isKnownRole(role)) {
    throw new Error('A valid AgenAuto user role is required.')
  }

  const organizationId = relationshipId(organization)
  if (DEALER_ROLES.has(role) && organizationId === undefined) {
    throw new Error('Dealer users must belong to a dealer organization.')
  }

  if (!DEALER_ROLES.has(role) && organizationId !== undefined) {
    throw new Error('Platform roles cannot be attached to a dealer organization.')
  }

  return true
}
