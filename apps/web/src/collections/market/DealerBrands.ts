import type { CollectionConfig } from 'payload'

import {
  canManageDealerStructure,
  enforceDealerTenant,
  publicActiveOrDealerRead,
  scopedDealerMutation,
} from '../../access/marketAccess.js'
import { auditAfterChange, auditAfterDelete } from '../../hooks/audit'
import { marketIdentity } from './common'

export const DealerBrands: CollectionConfig = {
  slug: 'dealer-brands',
  admin: {
    group: 'Market',
    useAsTitle: 'identityKey',
    defaultColumns: ['dealerOrganization', 'brand', 'status', 'observedAt', 'updatedAt'],
  },
  access: {
    read: ({ req }) => publicActiveOrDealerRead(req.user),
    create: ({ req }) => canManageDealerStructure(req.user),
    update: ({ req }) => scopedDealerMutation(req.user, 'structure'),
    delete: ({ req }) => scopedDealerMutation(req.user, 'structure'),
  },
  fields: [
    {
      name: 'dealerOrganization',
      type: 'relationship',
      relationTo: 'dealer-organizations',
      required: true,
      index: true,
    },
    {
      name: 'brand',
      type: 'relationship',
      relationTo: 'brands',
      required: true,
      index: true,
    },
    {
      name: 'identityKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { hidden: true },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      index: true,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
    { name: 'officialSince', type: 'date' },
    { name: 'sourceReference', type: 'text', required: true },
    { name: 'observedAt', type: 'date', required: true, index: true },
    { name: 'notes', type: 'textarea' },
  ],
  hooks: {
    beforeValidate: [
      ({ data, originalDoc, req }) => {
        if (!data) return data
        enforceDealerTenant({ user: req.user, data, originalDoc })
        data.identityKey = marketIdentity(
          data.dealerOrganization ?? originalDoc?.dealerOrganization,
          data.brand ?? originalDoc?.brand,
        )
        return data
      },
    ],
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
  },
}
