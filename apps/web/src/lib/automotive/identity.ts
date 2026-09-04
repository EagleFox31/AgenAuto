export type RelationshipIdentifier = string | number

type RelationshipObject = {
  id?: RelationshipIdentifier | null
}

export function relationshipId(value: unknown): RelationshipIdentifier | undefined {
  if (typeof value === 'string' || typeof value === 'number') return value

  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as RelationshipObject).id
    if (typeof id === 'string' || typeof id === 'number') return id
  }

  return undefined
}

export function normalizeSlug(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeSpecificationKey(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
}

export function compoundIdentity(parent: unknown, slug: unknown): string | undefined {
  const parentId = relationshipId(parent)
  const normalizedSlug = normalizeSlug(slug)

  if (parentId === undefined || !normalizedSlug) return undefined
  return `${parentId}:${normalizedSlug}`
}
