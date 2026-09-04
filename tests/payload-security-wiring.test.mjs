import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const payloadConfig = fs.readFileSync('apps/web/src/payload.config.ts', 'utf8')
const usersConfig = fs.readFileSync('apps/web/src/collections/platform/Users.ts', 'utf8')
const auditConfig = fs.readFileSync('apps/web/src/collections/platform/AuditLogs.ts', 'utf8')
const securityWrapper = fs.readFileSync('apps/web/src/access/collectionSecurity.ts', 'utf8')

test('canonical collections are wrapped by server-side write authorization', () => {
  for (const collection of [
    'Brands',
    'VehicleModels',
    'Generations',
    'Trims',
    'SpecificationDefinitions',
    'TrimSpecifications',
  ]) {
    assert.match(payloadConfig, new RegExp(`secureCanonicalCollection\\(${collection}\\)`))
  }

  assert.match(payloadConfig, /secureCanonicalAssetCollection\(Media\)/)
  assert.match(securityWrapper, /create: canonicalWrite/)
  assert.match(securityWrapper, /update: canonicalWrite/)
  assert.match(securityWrapper, /delete: canonicalWrite/)
})

test('canonical catalog uses review status, provenance and publish-only public reads', () => {
  assert.match(securityWrapper, /name: 'catalogStatus'/)
  assert.match(securityWrapper, /name: 'sourceReference'/)
  assert.match(securityWrapper, /name: 'qualityFlags'/)
  assert.match(securityWrapper, /read: canonicalRead/)
  assert.match(securityWrapper, /qualityWorkflowHook\(collection\.slug\)/)
  assert.match(securityWrapper, /parent\.catalogStatus !== 'published'/)
})

test('self-service user updates strip privilege-bearing fields', () => {
  assert.match(usersConfig, /if \(operation === 'update' && !isAdmin\(req\.user\)\)/)
  assert.match(usersConfig, /delete data\.role/)
  assert.match(usersConfig, /delete data\.dealerOrganization/)
  assert.match(usersConfig, /delete data\.status/)
})

test('suspended users are blocked at login', () => {
  assert.match(usersConfig, /beforeLogin/)
  assert.match(usersConfig, /user\.status !== 'active'/)
})

test('audit logs cannot be mutated through normal collection access', () => {
  assert.match(auditConfig, /create: \(\) => false/)
  assert.match(auditConfig, /update: \(\) => false/)
  assert.match(auditConfig, /delete: \(\) => false/)
})
