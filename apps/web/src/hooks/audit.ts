import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  PayloadRequest,
} from 'payload'

import { dealerOrganizationId, roleOf } from '../access/rbac.js'

const SENSITIVE_FIELDS = new Set([
  'password',
  'hash',
  'salt',
  'resetPasswordToken',
  'resetPasswordExpiration',
  'loginAttempts',
  'lockUntil',
  'sessions',
])

type AuditPayload = {
  create(args: {
    collection: string
    data: Record<string, unknown>
    overrideAccess: true
    req: PayloadRequest
  }): Promise<unknown>
}

function comparable(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function changedFields(doc: Record<string, unknown>, previousDoc?: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(doc || {}), ...Object.keys(previousDoc || {})])

  return [...keys]
    .filter((key) => !SENSITIVE_FIELDS.has(key))
    .filter((key) => comparable(doc?.[key]) !== comparable(previousDoc?.[key]))
    .sort()
}

async function writeAuditEntry({
  req,
  action,
  targetCollection,
  targetDocumentId,
  fields,
}: {
  req: PayloadRequest
  action: 'create' | 'update' | 'delete'
  targetCollection: string
  targetDocumentId: string
  fields: string[]
}) {
  const user = req.user as Record<string, unknown> | null | undefined
  const organizationId = dealerOrganizationId(user)
  const payload = req.payload as unknown as AuditPayload

  await payload.create({
    collection: 'audit-logs',
    overrideAccess: true,
    req,
    data: {
      actorId: user?.id === undefined ? null : String(user.id),
      actorEmail: typeof user?.email === 'string' ? user.email : null,
      actorRole: roleOf(user) || null,
      dealerOrganizationId:
        organizationId === undefined ? null : String(organizationId),
      action,
      targetCollection,
      targetDocumentId,
      changedFields: fields.map((field) => ({ field })),
      occurredAt: new Date().toISOString(),
    },
  })
}

export const auditAfterChange: CollectionAfterChangeHook = async ({
  collection,
  doc,
  previousDoc,
  operation,
  req,
}) => {
  await writeAuditEntry({
    req,
    action: operation,
    targetCollection: collection.slug,
    targetDocumentId: String(doc.id),
    fields: changedFields(
      doc as Record<string, unknown>,
      previousDoc as Record<string, unknown> | undefined,
    ),
  })

  return doc
}

export const auditAfterDelete: CollectionAfterDeleteHook = async ({
  collection,
  doc,
  id,
  req,
}) => {
  await writeAuditEntry({
    req,
    action: 'delete',
    targetCollection: collection.slug,
    targetDocumentId: String(id),
    fields: Object.keys((doc || {}) as Record<string, unknown>)
      .filter((field) => !SENSITIVE_FIELDS.has(field))
      .sort(),
  })

  return doc
}
