import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const payloadConfig = fs.readFileSync('apps/web/src/payload.config.ts', 'utf8')
const offers = fs.readFileSync('apps/web/src/collections/market/Offers.ts', 'utf8')
const priceHistory = fs.readFileSync('apps/web/src/collections/market/PriceHistory.ts', 'utf8')
const availability = fs.readFileSync('apps/web/src/collections/market/AvailabilitySnapshots.ts', 'utf8')
const trims = fs.readFileSync('apps/web/src/collections/automotive/Trims.ts', 'utf8')

test('Payload registers the complete dealer market model', () => {
  for (const collection of [
    'DealerLocations',
    'DealerBrands',
    'Offers',
    'PriceHistory',
    'AvailabilitySnapshots',
    'Promotions',
    'WarrantyTerms',
  ]) {
    assert.match(payloadConfig, new RegExp(`\\b${collection}\\b`))
  }
})

test('offers link to canonical trims without owning price, stock, promotion or warranty fields', () => {
  assert.match(offers, /relationTo: 'trims'/)

  for (const forbiddenField of ['price', 'stock', 'promotion', 'warranty']) {
    assert.doesNotMatch(offers, new RegExp(`name: ['\"]${forbiddenField}['\"]`))
    assert.doesNotMatch(trims, new RegExp(`name: ['\"]${forbiddenField}['\"]`))
  }
})

test('market observations are timestamped, sourced and dealer-history safe', () => {
  for (const source of [priceHistory, availability]) {
    assert.match(source, /name: 'observedAt'/)
    assert.match(source, /name: 'sourceReference'/)
    assert.match(source, /update: \(\{ req \}\) => canRepairMarketHistory\(req\.user\)/)
    assert.match(source, /delete: \(\{ req \}\) => canRepairMarketHistory\(req\.user\)/)
  }
})

test('price lives in history and availability lives in snapshots', () => {
  assert.match(priceHistory, /name: 'amount'/)
  assert.match(priceHistory, /relationTo: 'offers'/)
  assert.match(availability, /name: 'availability'/)
  assert.match(availability, /relationTo: 'offers'/)
})
