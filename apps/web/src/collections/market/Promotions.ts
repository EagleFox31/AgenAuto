import type { CollectionConfig } from 'payload'

import {
  canManageDealerStructure,
  enforceDealerTenant,
  publicActiveOrDealerRead,
  scopedDealerMutation,
} from '../../access/marketAccess.js'
import { auditAfterChange, auditAfterDelete } from '../../hooks/audit'
import { assertRelatedDealer } from './common'

export const Promotions: CollectionConfig = {
  slug: 'promotions',
  admin: {
    group: 'Market',
    useAsTitle: 'title',
    defaultColumns: ['dealerOrganization', 'offer', 'title', 'status', 'startsAt', 'endsAt'],
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
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'startsAt', type: 'date', index: true },
    { name: 'endsAt', type: 'date', index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      index: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Active', value: 'active' },
        { label: 'Expired', value: 'expired' },
      ],
    },
    { name: 'sourceReference', type: 'text', required: true },
    { name: 'observedAt', type: 'date', required: true, index: true },
  ],
  hooks: {
    beforeValidate: [
      ({ data, originalDoc, req }) => {
        if (!data) return data
        enforceDealerTenant({ user: req.user, data, originalDoc })

        const startsAt = data.startsAt ?? originalDoc?.startsAt
        const endsAt = data.endsAt ?? originalDoc?.endsAt
        if (startsAt && endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
          throw new Error('Promotion endsAt cannot be before startsAt.')
        }

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
