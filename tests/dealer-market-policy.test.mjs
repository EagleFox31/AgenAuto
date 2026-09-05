import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canManageDealerOperations,
  canManageDealerStructure,
  canRepairMarketHistory,
  enforceDealerTenant,
  privateDealerRead,
  publicActiveOrDealerRead,
  scopedDealerMutation,
} from '../apps/web/src/access/marketAccess.js'

const admin = { id: 1, role: 'admin' }
const dataEditor = { id: 2, role: 'data_editor' }
const dealerManager = { id: 3, role: 'dealer_manager', dealerOrganization: 41 }
const dealerAgent = { id: 4, role: 'dealer_agent', dealerOrganization: { id: 41 } }

test('public market reads expose active rows while dealer users remain tenant scoped', () => {
  assert.deepEqual(publicActiveOrDealerRead(null), {
    status: { equals: 'active' },
  })
  assert.deepEqual(publicActiveOrDealerRead(dealerManager), {
    dealerOrganization: { equals: 41 },
  })
  assert.equal(publicActiveOrDealerRead(admin), true)
})

test('dealer managers own structure while agents can operate offers and observations', () => {
  assert.equal(canManageDealerStructure(admin), true)
  assert.equal(canManageDealerStructure(dataEditor), true)
  assert.equal(canManageDealerStructure(dealerManager), true)
  assert.equal(canManageDealerStructure(dealerAgent), false)

  assert.equal(canManageDealerOperations(dealerManager), true)
  assert.equal(canManageDealerOperations(dealerAgent), true)
  assert.equal(canManageDealerOperations(null), false)
})

test('dealer mutations are always scoped to the authenticated organization', () => {
  assert.deepEqual(scopedDealerMutation(dealerManager, 'structure'), {
    dealerOrganization: { equals: 41 },
  })
  assert.deepEqual(scopedDealerMutation(dealerAgent, 'operations'), {
    dealerOrganization: { equals: 41 },
  })
  assert.equal(scopedDealerMutation(dealerAgent, 'structure'), false)
})

test('server tenant enforcement prevents cross-dealer writes', () => {
  const ownData = {}
  enforceDealerTenant({ user: dealerAgent, data: ownData })
  assert.equal(ownData.dealerOrganization, 41)

  assert.throws(
    () => enforceDealerTenant({
      user: dealerManager,
      data: { dealerOrganization: 99 },
    }),
    /another organization/,
  )

  assert.throws(
    () => enforceDealerTenant({ user: admin, data: {} }),
    /dealerOrganization is required/,
  )
})

test('price and availability history is append-only for dealer accounts', () => {
  assert.equal(canRepairMarketHistory(admin), true)
  assert.equal(canRepairMarketHistory(dataEditor), true)
  assert.equal(canRepairMarketHistory(dealerManager), false)
  assert.equal(canRepairMarketHistory(dealerAgent), false)

  assert.deepEqual(privateDealerRead(dealerAgent), {
    dealerOrganization: { equals: 41 },
  })
  assert.equal(privateDealerRead(null), false)
})
