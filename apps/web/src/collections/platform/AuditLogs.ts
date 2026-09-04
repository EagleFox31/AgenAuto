import type { CollectionConfig } from 'payload'

import { isAdmin } from '../../access/rbac.js'

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  admin: {
    group: 'Platform',
    useAsTitle: 'targetCollection',
    defaultColumns: ['occurredAt', 'actorEmail', 'action', 'targetCollection', 'targetDocumentId'],
  },
  access: {
    read: ({ req }) => isAdmin(req.user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'actorId',
      type: 'text',
    },
    {
      name: 'actorEmail',
      type: 'email',
    },
    {
      name: 'actorRole',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Data editor', value: 'data_editor' },
        { label: 'Dealer manager', value: 'dealer_manager' },
        { label: 'Dealer agent', value: 'dealer_agent' },
      ],
    },
    {
      name: 'dealerOrganizationId',
      type: 'text',
    },
    {
      name: 'action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create', value: 'create' },
        { label: 'Update', value: 'update' },
        { label: 'Delete', value: 'delete' },
      ],
      index: true,
    },
    {
      name: 'targetCollection',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'targetDocumentId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'changedFields',
      type: 'array',
      fields: [
        {
          name: 'field',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'occurredAt',
      type: 'date',
      required: true,
      index: true,
    },
  ],
  timestamps: false,
  versions: false,
}
