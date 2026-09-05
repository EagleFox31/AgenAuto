import type { CollectionConfig } from 'payload'

import {
  canManageDealerOperations,
  enforceDealerTenant,
  publicActiveOrDealerRead,
  scopedDealerMutation,
} from '../../access/marketAccess.js'
import { relationshipId } from '../../access/rbac.js'
import { auditAfterChange, auditAfterDelete } from '../../hooks/audit'
import { assertPublishedTrim, assertRelatedDealer } from './common'

export const Offers: CollectionConfig = {
  slug: 'offers',
  admin: {
    group: 'Market',
    useAsTitle: 'headline',
    defaultColumns: ['dealerOrganization', 'trim', 'location', 'status', 'observedAt', 'updatedAt'],
  },
  access: {
    read: ({ req }) => publicActiveOrDealerRead(req.user),
    create: ({ req }) => canManageDealerOperations(req.user),
    update: ({ req }) => scopedDealerMutation(req.user, 'operations'),
    delete: ({ req }) => scopedDealerMutation(req.user, 'operations'),
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
      name: 'location',
      type: 'relationship',
      relationTo: 'dealer-locations',
      index: true,
    },
    {
      name: 'trim',
      type: 'relationship',
      relationTo: 'trims',
      required: true,
      index: true,
    },
    { name: 'headline', type: 'text', required: true },
    { name: 'externalReference', type: 'text', index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      index: true,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Archived', value: 'archived' },
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
        const dealerOrganization = data.dealerOrganization ?? originalDoc?.dealerOrganization
        const location = data.location ?? originalDoc?.location
        const trim = data.trim ?? originalDoc?.trim
        const status = data.status ?? originalDoc?.status ?? 'active'

        if (location && relationshipId(location) !== undefined) {
          await assertRelatedDealer(req, 'dealer-locations', location, dealerOrganization)
        }

        if (status === 'active') {
          await assertPublishedTrim(req, trim)
        }

        return data
      },
    ],
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
  },
}
