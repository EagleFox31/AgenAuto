import type { CollectionConfig } from 'payload'

import { normalizeSlug, normalizeSpecificationKey } from '../../lib/automotive/identity'
import {
  SPEC_CATEGORY_OPTIONS,
  SPEC_UNIT_OPTIONS,
  SPEC_VALUE_TYPE_OPTIONS,
} from './constants'

type AllowedOption = {
  label?: unknown
  value?: unknown
}

export const SpecificationDefinitions: CollectionConfig = {
  slug: 'specification-definitions',
  admin: {
    group: 'Automotive',
    useAsTitle: 'label',
    defaultColumns: ['label', 'key', 'category', 'valueType', 'unit', 'updatedAt'],
  },
  fields: [
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'label',
      type: 'text',
      required: true,
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: SPEC_CATEGORY_OPTIONS,
      index: true,
    },
    {
      name: 'valueType',
      type: 'select',
      required: true,
      options: SPEC_VALUE_TYPE_OPTIONS,
    },
    {
      name: 'unit',
      type: 'select',
      options: SPEC_UNIT_OPTIONS,
    },
    {
      name: 'allowedOptions',
      type: 'array',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'value',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'comparable',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'filterable',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 100,
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

        data.key = normalizeSpecificationKey(data.key || data.label)

        if (data.valueType !== 'number') {
          data.unit = null
        }

        if (data.valueType === 'option') {
          const options = Array.isArray(data.allowedOptions)
            ? (data.allowedOptions as AllowedOption[])
            : []

          if (options.length === 0) {
            throw new Error('Controlled option specifications require at least one allowed option.')
          }

          data.allowedOptions = options.map((option) => ({
            ...option,
            value: normalizeSlug(option.value || option.label),
          }))
        } else {
          data.allowedOptions = []
        }

        return data
      },
    ],
  },
}
