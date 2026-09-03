import type { CollectionConfig } from 'payload'

import { relationshipId } from '../../lib/automotive/identity'

type RuntimeSpecificationDefinition = {
  valueType?: 'number' | 'text' | 'boolean' | 'option' | null
  allowedOptions?: Array<{ value?: string | null }> | null
}

const hasValue = (value: unknown): boolean => value !== undefined && value !== null && value !== ''

export const TrimSpecifications: CollectionConfig = {
  slug: 'trim-specifications',
  admin: {
    group: 'Automotive',
    useAsTitle: 'identityKey',
    defaultColumns: ['trim', 'definition', 'valueStatus', 'updatedAt'],
  },
  fields: [
    {
      name: 'trim',
      type: 'relationship',
      relationTo: 'trims',
      required: true,
      index: true,
    },
    {
      name: 'definition',
      type: 'relationship',
      relationTo: 'specification-definitions',
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
      name: 'valueStatus',
      type: 'select',
      required: true,
      defaultValue: 'known',
      options: [
        { label: 'Known', value: 'known' },
        { label: 'Unknown / not published', value: 'unknown' },
        { label: 'Not applicable', value: 'not-applicable' },
      ],
      index: true,
    },
    {
      name: 'numberValue',
      type: 'number',
    },
    {
      name: 'textValue',
      type: 'text',
    },
    {
      name: 'booleanValue',
      type: 'select',
      options: [
        { label: 'True', value: 'true' },
        { label: 'False', value: 'false' },
      ],
    },
    {
      name: 'optionValue',
      type: 'text',
    },
    {
      name: 'sourceNote',
      type: 'textarea',
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        if (!data) return data

        const trimId = relationshipId(data.trim)
        const definitionId = relationshipId(data.definition)

        if (trimId !== undefined && definitionId !== undefined) {
          data.identityKey = `${trimId}:${definitionId}`
        }

        const status = data.valueStatus || 'known'
        if (status !== 'known') {
          data.numberValue = null
          data.textValue = null
          data.booleanValue = null
          data.optionValue = null
          return data
        }

        if (definitionId === undefined) return data

        const definition = (await req.payload.findByID({
          collection: 'specification-definitions',
          id: definitionId,
          depth: 0,
          req,
        })) as RuntimeSpecificationDefinition

        const fieldsByType = {
          number: 'numberValue',
          text: 'textValue',
          boolean: 'booleanValue',
          option: 'optionValue',
        } as const

        const valueType = definition.valueType
        if (!valueType || !(valueType in fieldsByType)) {
          throw new Error('Specification definition has an unsupported value type.')
        }

        const expectedField = fieldsByType[valueType]
        const candidateFields = ['numberValue', 'textValue', 'booleanValue', 'optionValue'] as const

        if (!hasValue(data[expectedField])) {
          throw new Error(`A known ${valueType} specification requires ${expectedField}.`)
        }

        for (const field of candidateFields) {
          if (field !== expectedField && hasValue(data[field])) {
            throw new Error(`${field} must be empty for a ${valueType} specification.`)
          }
        }

        if (valueType === 'option') {
          const allowed = new Set(
            (definition.allowedOptions || [])
              .map((option) => option.value)
              .filter((value): value is string => Boolean(value)),
          )

          if (allowed.size > 0 && !allowed.has(String(data.optionValue))) {
            throw new Error(`optionValue must match one of the specification definition's allowed options.`)
          }
        }

        return data
      },
    ],
  },
}
