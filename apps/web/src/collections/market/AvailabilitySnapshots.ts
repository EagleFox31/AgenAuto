import type { CollectionConfig } from 'payload'

import {
  canManageDealerOperations,
  canRepairMarketHistory,
  enforceDealerTenant,
  privateDealerRead,
} from '../../access/marketAccess.js'
import { auditAfterChange, auditAfterDelete } from '../../hooks/audit'
import { assertRelatedDealer } from './common'

export const AvailabilitySnapshots: CollectionConfig = {
  slug: 'availability-snapshots',
  admin: {
    group: 'Market',
    useAsTitle: 'availability',
    defaultColumns: ['dealerOrganization', 'offer', 'availability', 'quantity', 'observedAt', 'createdAt'],
  },
  access: {
    read: ({ req }) => privateDealerRead(req.user),
    create: ({ req }) => canManageDealerOperations(req.user),
    update: ({ req }) => canRepairMarketHistory(req.user),
    delete: ({ req }) => canRepairMarketHistory(req.user),
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
    {
      name: 'availability',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'In stock', value: 'in_stock' },
        { label: 'Limited', value: 'limited' },
        { label: 'Order only', value: 'order_only' },
        { label: 'Out of stock', value: 'out_of_stock' },
        { label: 'Unknown', value: 'unknown' },
      ],
    },
    { name: 'quantity', type: 'number', min: 0 },
    { name: 'observedAt', type: 'date', required: true, index: true },
    { name: 'sourceReference', type: 'text', required: true },
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
