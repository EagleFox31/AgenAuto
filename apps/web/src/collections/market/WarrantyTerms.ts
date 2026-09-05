import type { CollectionConfig } from 'payload'

import {
  canManageDealerStructure,
  enforceDealerTenant,
  publicActiveOrDealerRead,
  scopedDealerMutation,
} from '../../access/marketAccess.js'
import { auditAfterChange, auditAfterDelete } from '../../hooks/audit'
import { assertRelatedDealer } from './common'

export const WarrantyTerms: CollectionConfig = {
  slug: 'warranty-terms',
  admin: {
    group: 'Market',
    useAsTitle: 'coverage',
    defaultColumns: ['dealerOrganization', 'offer', 'months', 'distanceKm', 'status', 'observedAt'],
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
      name: 'offer',
      type: 'relationship',
      relationTo: 'offers',
      required: true,
      index: true,
    },
    { name: 'months', type: 'number', min: 0 },
    { name: 'distanceKm', type: 'number', min: 0 },
    { name: 'coverage', type: 'textarea', required: true },
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
    { name: 'sourceReference', type: 'text', required: true },
    { name: 'observedAt', type: 'date', required: true, index: true },
    { name: 'notes', type: 'textarea' },
  ],
  hooks: {
    beforeValidate: [
      ({ data, originalDoc, req }) => {
        if (!data) return data
        enforceDealerTenant({ user: req.user, data, originalDoc })
        return data
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        await assertRelatedDealer(
          req,
          'offers',
          data.offer ?? originalDoc?.offer,
          data.dealerOrganization ?? originalDoc?.dealerOrganization,
        )
        return data
      },
    ],
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
  },
}
