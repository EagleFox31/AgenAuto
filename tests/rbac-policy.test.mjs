import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canManageCanonical,
  canUpdateOwnUser,
  dealerScopeForUser,
  validateRoleTenantPair,
} from '../apps/web/src/access/rbac.js'

const admin = { id: 1, role: 'admin' }
const dataEditor = { id: 2, role: 'data_editor' }
const dealerManager = { id: 3, role: 'dealer_manager', dealerOrganization: 41 }
const dealerAgent = { id: 4, role: 'dealer_agent', dealerOrganization: { id: 41 } }

test('only platform editors can mutate canonical vehicle data', () => {
  assert.equal(canManageCanonical(admin), true)
  assert.equal(canManageCanonical(dataEditor), true)
  assert.equal(canManageCanonical(dealerManager), false)
  assert.equal(canManageCanonical(dealerAgent), false)
  assert.equal(canManageCanonical(null), false)
})

test('dealer scope is restricted to the authenticated dealer organization', () => {
  assert.deepEqual(dealerScopeForUser(dealerManager), {
    dealerOrganization: { equals: 41 },
  })

  assert.deepEqual(dealerScopeForUser(dealerAgent, 'dealer'), {
    dealer: { equals: 41 },
  })

  assert.equal(dealerScopeForUser(admin), true)
  assert.equal(dealerScopeForUser({ id: 9, role: 'dealer_agent' }), false)
})

test('non-admin users cannot target another user document', () => {
  assert.equal(canUpdateOwnUser(admin, 999), true)
  assert.equal(canUpdateOwnUser(dealerManager, 3), true)
  assert.equal(canUpdateOwnUser(dealerManager, 4), false)
  assert.equal(canUpdateOwnUser(dataEditor, 3), false)
})

test('dealer roles require tenancy and platform roles reject dealer tenancy', () => {
  assert.equal(validateRoleTenantPair('dealer_manager', 41), true)
  assert.equal(validateRoleTenantPair('dealer_agent', { id: 41 }), true)
  assert.equal(validateRoleTenantPair('admin', null), true)
  assert.equal(validateRoleTenantPair('data_editor', undefined), true)

  assert.throws(
    () => validateRoleTenantPair('dealer_agent', null),
    /must belong to a dealer organization/,
  )
  assert.throws(
    () => validateRoleTenantPair('admin', 41),
    /Platform roles cannot be attached/,
  )
  assert.throws(
    () => validateRoleTenantPair('super_admin', null),
    /valid AgenAuto user role/,
  )
})
