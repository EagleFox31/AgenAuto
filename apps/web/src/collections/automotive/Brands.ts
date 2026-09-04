import type { CollectionConfig } from 'payload'

import { normalizeSlug } from '../../lib/automotive/identity'

export const Brands: CollectionConfig = {
  slug: 'brands',
  admin: {
    group: 'Automotive',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'countryOfOrigin', 'updatedAt'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'countryOfOrigin',
      type: 'text',
    },
    {
      name: 'website',
      type: 'text',
    },
    {
      name: 'logo',
      type: 'relationship',
      relationTo: 'media',
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
        return data
      },
    ],
  },
}
