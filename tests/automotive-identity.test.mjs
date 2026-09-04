import assert from 'node:assert/strict'
import test from 'node:test'

import {
  compoundIdentity,
  normalizeSlug,
  normalizeSpecificationKey,
  relationshipId,
} from '../apps/web/src/lib/automotive/identity.ts'

test('normalizeSlug produces stable URL-safe identities', () => {
  assert.equal(normalizeSlug('  Toyota Land Cruiser 300  '), 'toyota-land-cruiser-300')
  assert.equal(normalizeSlug('Citroën C5 Aircross'), 'citroen-c5-aircross')
})

test('normalizeSpecificationKey produces stable dot notation keys', () => {
  assert.equal(normalizeSpecificationKey('Engine Power (kW)'), 'engine.power.kw')
  assert.equal(normalizeSpecificationKey('Dimensions / Length'), 'dimensions.length')
})

test('relationshipId accepts Payload relationship ids and populated objects', () => {
  assert.equal(relationshipId(42), 42)
  assert.equal(relationshipId('abc'), 'abc')
  assert.equal(relationshipId({ id: 7 }), 7)
  assert.equal(relationshipId({ id: 'trim-1' }), 'trim-1')
  assert.equal(relationshipId({}), undefined)
})

test('compoundIdentity combines parent identity and normalized slug', () => {
  assert.equal(compoundIdentity(12, ' Land Cruiser '), '12:land-cruiser')
  assert.equal(compoundIdentity({ id: 'gen-1' }, 'GR Sport'), 'gen-1:gr-sport')
  assert.equal(compoundIdentity(undefined, 'GR Sport'), undefined)
})
