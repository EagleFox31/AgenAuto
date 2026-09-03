import type { CollectionConfig } from 'payload'

import { compoundIdentity, normalizeSlug } from '../../lib/automotive/identity'
import {
  BODY_STYLE_OPTIONS,
  DRIVE_TYPE_OPTIONS,
  FUEL_TYPE_OPTIONS,
  TRANSMISSION_OPTIONS,
} from './constants'

export const Trims: CollectionConfig = {
  slug: 'trims',
  admin: {
    group: 'Automotive',
    useAsTitle: 'name',
    defaultColumns: ['generation', 'name', 'fuelType', 'transmission', 'updatedAt'],
  },
  fields: [
    {
      name: 'generation',
      type: 'relationship',
      relationTo: 'generations',
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
      name: 'modelYearStart',
      type: 'number',
      min: 1886,
      max: 2200,
    },
    {
      name: 'modelYearEnd',
      type: 'number',
      min: 1886,
      max: 2200,
    },
    {
      name: 'bodyStyle',
      type: 'select',
      options: BODY_STYLE_OPTIONS,
      index: true,
    },
    {
      name: 'fuelType',
      type: 'select',
      options: FUEL_TYPE_OPTIONS,
      index: true,
    },
    {
      name: 'transmission',
      type: 'select',
      options: TRANSMISSION_OPTIONS,
      index: true,
    },
    {
      name: 'driveType',
      type: 'select',
      options: DRIVE_TYPE_OPTIONS,
      index: true,
    },
    {
      name: 'seats',
      type: 'number',
      min: 1,
      max: 100,
    },
    {
      name: 'doors',
      type: 'number',
      min: 1,
      max: 20,
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
        data.identityKey = compoundIdentity(data.generation, data.slug)

        if (
          typeof data.modelYearStart === 'number' &&
          typeof data.modelYearEnd === 'number' &&
          data.modelYearEnd < data.modelYearStart
        ) {
          throw new Error('modelYearEnd cannot be before modelYearStart.')
        }

        return data
      },
    ],
  },
}
