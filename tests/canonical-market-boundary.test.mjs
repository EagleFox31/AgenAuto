import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const trimCollectionPath = new URL(
  '../apps/web/src/collections/automotive/Trims.ts',
  import.meta.url,
)

test('canonical trims do not own dealer commercial fields', async () => {
  const source = await readFile(trimCollectionPath, 'utf8')
  const forbiddenFields = ['price', 'stock', 'availability', 'promotion', 'warranty']

  for (const field of forbiddenFields) {
    assert.doesNotMatch(
      source,
      new RegExp(`name:\\s*['\"]${field}['\"]`, 'i'),
      `Canonical Trim must not contain a ${field} field`,
    )
  }
})
