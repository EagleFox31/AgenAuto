import type {
  Access,
  CollectionBeforeChangeHook,
  CollectionConfig,
  Field,
  PayloadRequest,
} from 'payload'

import { auditAfterChange, auditAfterDelete } from '../hooks/audit'
import {
  canonicalReadAccess,
  reviewMetadataForTransition,
  validateCatalogQuality,
  validateCatalogTransition,
} from './catalogQuality.js'
import { canManageCanonical, relationshipId } from './rbac.js'

const canonicalRead: Access = ({ req }) => canonicalReadAccess(req.user)
const publicRead: Access = () => true
const canonicalWrite: Access = ({ req }) => canManageCanonical(req.user)
const internalQualityRead = ({ req }: { req: PayloadRequest }) => canManageCanonical(req.user)

const PUBLISH_DEPENDENCIES: Record<string, Array<{ field: string; collection: string }>> = {
  'vehicle-models': [{ field: 'brand', collection: 'brands' }],
  generations: [{ field: 'model', collection: 'vehicle-models' }],
  trims: [{ field: 'generation', collection: 'generations' }],
  'trim-specifications': [
    { field: 'trim', collection: 'trims' },
    { field: 'definition', collection: 'specification-definitions' },
  ],
}

type CanonicalPayload = {
  findByID(args: {
    collection: string
    id: string | number
    overrideAccess: true
    req: PayloadRequest
  }): Promise<Record<string, unknown>>
}

const QUALITY_FIELDS: Field[] = [
  {
    name: 'catalogStatus',
    type: 'select',
    required: true,
    defaultValue: 'draft',
    index: true,
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'In review', value: 'in_review' },
      { label: 'Published', value: 'published' },
      { label: 'Rejected', value: 'rejected' },
    ],
    admin: {
      position: 'sidebar',
    },
  },
  {
    name: 'sourceType',
    type: 'select',
    options: [
      { label: 'Manufacturer', value: 'manufacturer' },
      { label: 'Official distributor / dealer', value: 'official-dealer' },
      { label: 'Homologation / regulatory', value: 'regulatory' },
      { label: 'Manual verification', value: 'manual-verification' },
      { label: 'Other', value: 'other' },
    ],
    admin: {
      position: 'sidebar',
    },
  },
  {
    name: 'sourceReference',
    type: 'text',
    admin: {
      description: 'URL, document reference, brochure reference or other traceable source.',
      position: 'sidebar',
    },
  },
  {
    name: 'sourceObservedAt',
    type: 'date',
    admin: {
      position: 'sidebar',
    },
  },
  {
    name: 'sourceNotes',
    type: 'textarea',
    access: {
      read: internalQualityRead,
    },
    admin: {
      description: 'Internal provenance notes; never part of the public catalog projection.',
    },
  },
  {
    name: 'qualityFlags',
    type: 'array',
    access: {
      read: internalQualityRead,
    },
    fields: [
      {
        name: 'code',
        type: 'text',
        required: true,
      },
      {
        name: 'severity',
        type: 'select',
        required: true,
        options: [
          { label: 'Warning', value: 'warning' },
          { label: 'Blocking', value: 'blocking' },
        ],
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
    access: {
      read: internalQualityRead,
    },
  },
  {
    name: 'reviewedBy',
    type: 'relationship',
    relationTo: 'users',
    access: {
      read: internalQualityRead,
    },
    admin: {
      readOnly: true,
      position: 'sidebar',
    },
  },
  {
    name: 'reviewedAt',
    type: 'date',
    access: {
      read: internalQualityRead,
    },
    admin: {
      readOnly: true,
      position: 'sidebar',
    },
  },
]

function withCanonicalMutationSecurity(collection: CollectionConfig, read: Access): CollectionConfig {
  return {
    ...collection,
    access: {
      ...collection.access,
      read,
      create: canonicalWrite,
      update: canonicalWrite,
      delete: canonicalWrite,
    },
    hooks: {
      ...collection.hooks,
      afterChange: [...(collection.hooks?.afterChange || []), auditAfterChange],
      afterDelete: [...(collection.hooks?.afterDelete || []), auditAfterDelete],
    },
  }
}

function qualityWorkflowHook(collectionSlug: string): CollectionBeforeChangeHook {
  return async ({ data, originalDoc, operation, req }) => {
    if (!data) return data

    const previousStatus = operation === 'create'
      ? 'draft'
      : (originalDoc?.catalogStatus || 'draft')
    const nextStatus = data.catalogStatus ?? previousStatus

    validateCatalogTransition({
      previousStatus,
      nextStatus,
      data,
    })

    validateCatalogQuality({
      status: nextStatus,
      sourceReference: data.sourceReference ?? originalDoc?.sourceReference,
      qualityFlags: data.qualityFlags ?? originalDoc?.qualityFlags,
      reviewNotes: data.reviewNotes ?? originalDoc?.reviewNotes,
    })

    if (nextStatus === 'published') {
      const payload = req.payload as unknown as CanonicalPayload
      const dependencies = PUBLISH_DEPENDENCIES[collectionSlug] || []

      for (const dependency of dependencies) {
        const relationValue = data[dependency.field] ?? originalDoc?.[dependency.field]
        const relationId = relationshipId(relationValue)

        if (relationId === undefined) {
          throw new Error(`${dependency.field} is required before publication.`)
        }

        const parent = await payload.findByID({
          collection: dependency.collection,
          id: relationId,
          overrideAccess: true,
          req,
        })

        if (parent.catalogStatus !== 'published') {
          throw new Error(
            `${collectionSlug} cannot be published until ${dependency.collection} ${relationId} is published.`,
          )
        }
      }
    }

    Object.assign(
      data,
      reviewMetadataForTransition({
        previousStatus,
        nextStatus,
        userId: req.user?.id,
      }),
    )

    return data
  }
}

export function secureCanonicalAssetCollection(collection: CollectionConfig): CollectionConfig {
  return withCanonicalMutationSecurity(collection, publicRead)
}

export function secureCanonicalCollection(collection: CollectionConfig): CollectionConfig {
  const secured = withCanonicalMutationSecurity(collection, canonicalRead)

  return {
    ...secured,
    admin: {
      ...secured.admin,
      defaultColumns: Array.from(new Set([
        ...(secured.admin?.defaultColumns || []),
        'catalogStatus',
      ])),
    },
    fields: [
      ...secured.fields,
      ...QUALITY_FIELDS,
    ],
    hooks: {
      ...secured.hooks,
      beforeChange: [
        ...(secured.hooks?.beforeChange || []),
        qualityWorkflowHook(collection.slug),
      ],
    },
  }
}
