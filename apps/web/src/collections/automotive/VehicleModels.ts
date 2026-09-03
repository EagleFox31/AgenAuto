import type { CollectionConfig } from 'payload'

import { compoundIdentity, normalizeSlug } from '../../lib/automotive/identity'

export const VehicleModels: CollectionConfig = {
  slug: 'vehicle-models',
  admin: {
    group: 'Automotive',
    useAsTitle: 'name',
    defaultColumns: ['brand', 'name', 'slug', 'updatedAt'],
  },
  fields: [
    {
      name: 'brand',
      type: 'relationship',
      relationTo: 'brands',
      required: true,
      index: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
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
      name: 'modelCode',
      type: 'text',
    },
    {
      name: 'heroImage',
      type: 'relationship',
      relationTo: 'media',
    },
    {
      name: 'gallery',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        data.slug = normalizeSlug(data.slug || data.name)
        data.identityKey = compoundIdentity(data.brand, data.slug)
        return data
      },
    ],
  },
}
