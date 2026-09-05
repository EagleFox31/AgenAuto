import type { CollectionConfig } from 'payload'

import {
  canManageDealerStructure,
  enforceDealerTenant,
  publicActiveOrDealerRead,
  scopedDealerMutation,
} from '../../access/marketAccess.js'
import { auditAfterChange, auditAfterDelete } from '../../hooks/audit'
import { marketIdentity, normalizeMarketSlug } from './common'

export const DealerLocations: CollectionConfig = {
  slug: 'dealer-locations',
  admin: {
    group: 'Market',
    useAsTitle: 'name',
    defaultColumns: ['dealerOrganization', 'name', 'city', 'status', 'updatedAt'],
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
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, index: true },
    {
      name: 'identityKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { hidden: true },
    },
    { name: 'city', type: 'text', required: true, index: true },
    { name: 'address', type: 'textarea', required: true },
    { name: 'phone', type: 'text' },
    { name: 'email', type: 'email' },
    { name: 'latitude', type: 'number', min: -90, max: 90 },
    { name: 'longitude', type: 'number', min: -180, max: 180 },
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
  ],
  hooks: {
    beforeValidate: [
      ({ data, originalDoc, req }) => {
        if (!data) return data
        enforceDealerTenant({ user: req.user, data, originalDoc })
        data.slug = normalizeMarketSlug(data.slug || data.name || originalDoc?.slug)
        data.identityKey = marketIdentity(
          data.dealerOrganization ?? originalDoc?.dealerOrganization,
          data.slug,
        )
        return data
      },
    ],
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
  },
}
