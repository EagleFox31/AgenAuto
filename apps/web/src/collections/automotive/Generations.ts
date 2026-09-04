import type { CollectionConfig } from 'payload'

import { compoundIdentity, normalizeSlug } from '../../lib/automotive/identity'

export const Generations: CollectionConfig = {
  slug: 'generations',
  admin: {
    group: 'Automotive',
    useAsTitle: 'name',
    defaultColumns: ['model', 'name', 'productionStartYear', 'productionEndYear', 'updatedAt'],
  },
  fields: [
    {
      name: 'model',
      type: 'relationship',
      relationTo: 'vehicle-models',
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
      name: 'generationCode',
      type: 'text',
    },
    {
      name: 'productionStartYear',
      type: 'number',
      min: 1886,
      max: 2200,
    },
    {
      name: 'productionEndYear',
      type: 'number',
      min: 1886,
      max: 2200,
    },
    {
      name: 'gallery',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data

        data.slug = normalizeSlug(data.slug || data.name)
        data.identityKey = compoundIdentity(data.model, data.slug)

        if (
          typeof data.productionStartYear === 'number' &&
          typeof data.productionEndYear === 'number' &&
          data.productionEndYear < data.productionStartYear
        ) {
          throw new Error('productionEndYear cannot be before productionStartYear.')
        }

        return data
      },
    ],
  },
}
