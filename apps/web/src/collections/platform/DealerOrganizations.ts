import type { CollectionConfig } from 'payload'

import {
  isPlatformMarketUser,
  publicActiveOrDealerRead,
  scopedDealerMutation,
} from '../../access/marketAccess.js'
import { isAdmin } from '../../access/rbac.js'
import { auditAfterChange, auditAfterDelete } from '../../hooks/audit'

function normalizeSlug(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const DealerOrganizations: CollectionConfig = {
  slug: 'dealer-organizations',
  admin: {
    group: 'Market',
    useAsTitle: 'name',
    defaultColumns: ['name', 'legalName', 'slug', 'status', 'updatedAt'],
  },
  access: {
    read: ({ req }) => publicActiveOrDealerRead(req.user, 'id'),
    create: ({ req }) => isPlatformMarketUser(req.user),
    update: ({ req }) => scopedDealerMutation(req.user, 'structure', 'id'),
    delete: ({ req }) => isAdmin(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'legalName', type: 'text' },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: {
        update: ({ req }) => isPlatformMarketUser(req.user),
      },
    },
    { name: 'website', type: 'text' },
    { name: 'phone', type: 'text' },
    { name: 'email', type: 'email' },
    { name: 'description', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
      ],
      index: true,
      access: {
        update: ({ req }) => isPlatformMarketUser(req.user),
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, originalDoc, req }) => {
        if (!data) return data

        if (isPlatformMarketUser(req.user)) {
          data.slug = normalizeSlug(data.slug || data.name || originalDoc?.slug)
        } else if (originalDoc?.slug) {
          data.slug = originalDoc.slug
        }

        return data
      },
    ],
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
  },
}
