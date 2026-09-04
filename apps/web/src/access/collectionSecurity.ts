import type { Access, CollectionConfig } from 'payload'

import { auditAfterChange, auditAfterDelete } from '../hooks/audit'
import { canManageCanonical } from './rbac.js'

const publicRead: Access = () => true
const canonicalWrite: Access = ({ req }) => canManageCanonical(req.user)

export function secureCanonicalCollection(collection: CollectionConfig): CollectionConfig {
  return {
    ...collection,
    access: {
      ...collection.access,
      read: collection.access?.read || publicRead,
      create: canonicalWrite,
      update: canonicalWrite,
      delete: canonicalWrite,
    },
    hooks: {
      ...collection.hooks,
      afterChange: [...(collection.hooks?.afterChange || []), auditAfterChange],
      afterDelete: [...(collection.hooks?.afterDelete || []), auditAfterDelete],
    },
  }
}
