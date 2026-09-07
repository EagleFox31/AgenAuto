import type { Access, CollectionConfig } from 'payload'

import { canManageCanonical } from '../../access/rbac.js'
import { auditAfterChange, auditAfterDelete } from '../../hooks/audit'

const canonicalOperator: Access = ({ req }) => canManageCanonical(req.user)

export const CatalogIngestionCandidates: CollectionConfig = {
  slug: 'catalog-ingestion-candidates',
  admin: {
    group: 'Automotive Review',
    useAsTitle: 'displayName',
    defaultColumns: [
      'displayName',
      'mappingStatus',
      'proposedBrand',
      'proposedModel',
      'proposedGeneration',
      'updatedAt',
    ],
  },
  access: {
    read: canonicalOperator,
    create: canonicalOperator,
    update: canonicalOperator,
    delete: canonicalOperator,
  },
  fields: [
    {
      name: 'candidateKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'displayName',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'brandName',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'modelName',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'distributor',
      type: 'text',
      required: true,
    },
    {
      name: 'sourceReference',
      type: 'text',
      required: true,
    },
    {
      name: 'sourceObservedAt',
      type: 'date',
      required: true,
    },
    {
      name: 'sourceType',
      type: 'text',
      required: true,
    },
    {
      name: 'confidence',
      type: 'select',
      required: true,
      options: [
        { label: 'A — official public', value: 'A' },
        { label: 'B — official direct', value: 'B' },
        { label: 'C — discovery only', value: 'C' },
      ],
    },
    {
      name: 'contentHash',
      type: 'text',
      index: true,
    },
    {
      name: 'variants',
      type: 'array',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'specifications',
      type: 'json',
      required: true,
    },
    {
      name: 'qualityFlags',
      type: 'array',
      fields: [
        {
          name: 'code',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'mappingStatus',
      type: 'select',
      required: true,
      defaultValue: 'needs_review',
      index: true,
      options: [
        { label: 'Needs review', value: 'needs_review' },
        { label: 'Mapped', value: 'mapped' },
        { label: 'Approved for promotion', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Promoted', value: 'promoted' },
      ],
    },
    {
      name: 'proposedBrand',
      type: 'relationship',
      relationTo: 'brands',
      index: true,
    },
    {
      name: 'proposedModel',
      type: 'relationship',
      relationTo: 'vehicle-models',
      index: true,
    },
    {
      name: 'proposedGeneration',
      type: 'relationship',
      relationTo: 'generations',
      index: true,
    },
    {
      name: 'trimMappings',
      type: 'array',
      fields: [
        {
          name: 'sourceVariant',
          type: 'text',
          required: true,
        },
        {
          name: 'proposedTrim',
          type: 'relationship',
          relationTo: 'trims',
        },
      ],
    },
    {
      name: 'promotionBlockers',
      type: 'array',
      fields: [
        {
          name: 'code',
          type: 'text',
          required: true,
        },
        {
          name: 'note',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'reviewNotes',
      type: 'textarea',
    },
    {
      name: 'rawCandidate',
      type: 'json',
      required: true,
      admin: {
        description: 'Immutable factual staging payload used to reproduce the mapping decision.',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        data.displayName = `${String(data.brandName || '').trim()} ${String(data.modelName || '').trim()}`.trim()
        return data
      },
    ],
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
  },
}
