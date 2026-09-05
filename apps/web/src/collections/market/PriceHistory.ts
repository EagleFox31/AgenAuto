import type { CollectionConfig } from 'payload'

import {
  canManageDealerOperations,
  canRepairMarketHistory,
  enforceDealerTenant,
  privateDealerRead,
} from '../../access/marketAccess.js'
import { auditAfterChange, auditAfterDelete } from '../../hooks/audit'
import { assertRelatedDealer } from './common'

export const PriceHistory: CollectionConfig = {
  slug: 'price-history',
  admin: {
    group: 'Market',
    useAsTitle: 'amount',
    defaultColumns: ['dealerOrganization', 'offer', 'amount', 'priceType', 'observedAt', 'createdAt'],
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
    { name: 'amount', type: 'number', required: true, min: 0, index: true },
    {
      name: 'currency',
      type: 'select',
      required: true,
      defaultValue: 'XAF',
      options: [{ label: 'XAF', value: 'XAF' }],
    },
    {
      name: 'priceType',
      type: 'select',
      required: true,
      defaultValue: 'list',
      options: [
        { label: 'List price', value: 'list' },
        { label: 'From price', value: 'from' },
        { label: 'Promotional price', value: 'promotional' },
      ],
    },
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
