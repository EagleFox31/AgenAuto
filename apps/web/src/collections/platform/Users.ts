import type { Access, CollectionConfig } from 'payload'

import {
  canUpdateOwnUser,
  isAdmin,
  validateRoleTenantPair,
} from '../../access/rbac.js'
import { auditAfterChange, auditAfterDelete } from '../../hooks/audit'

const createUser: Access = async ({ req }) => {
  if (isAdmin(req.user)) return true
  if (req.user) return false

  const result = await req.payload.count({
    collection: 'users',
    overrideAccess: true,
  })

  return result.totalDocs === 0
}

const readUser: Access = ({ req }) => {
  if (isAdmin(req.user)) return true
  if (!req.user) return false

  return {
    id: {
      equals: req.user.id,
    },
  }
}

const updateUser: Access = ({ req, id }) => canUpdateOwnUser(req.user, id)

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    group: 'Platform',
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role', 'dealerOrganization', 'status', 'updatedAt'],
  },
  auth: true,
  access: {
    admin: ({ req }) => Boolean(req.user),
    create: createUser,
    read: readUser,
    update: updateUser,
    delete: ({ req }) => isAdmin(req.user),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Data editor', value: 'data_editor' },
        { label: 'Dealer manager', value: 'dealer_manager' },
        { label: 'Dealer agent', value: 'dealer_agent' },
      ],
      access: {
        create: ({ req }) => isAdmin(req.user),
        update: ({ req }) => isAdmin(req.user),
      },
      index: true,
    },
    {
      name: 'dealerOrganization',
      type: 'relationship',
      relationTo: 'dealer-organizations',
      index: true,
      access: {
        create: ({ req }) => isAdmin(req.user),
        update: ({ req }) => isAdmin(req.user),
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
      ],
      access: {
        create: ({ req }) => isAdmin(req.user),
        update: ({ req }) => isAdmin(req.user),
      },
      index: true,
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, operation, req }) => {
        if (!data) return data

        if (operation === 'create' && !req.user) {
          const existing = await req.payload.count({
            collection: 'users',
            overrideAccess: true,
          })

          if (existing.totalDocs === 0) {
            data.role = 'admin'
            data.status = 'active'
            data.dealerOrganization = null
          }
        }

        if (operation === 'update' && !isAdmin(req.user)) {
          delete data.role
          delete data.dealerOrganization
          delete data.status
        }

        const role = data.role ?? originalDoc?.role
        const organization =
          'dealerOrganization' in data
            ? data.dealerOrganization
            : originalDoc?.dealerOrganization

        validateRoleTenantPair(role, organization)
        return data
      },
    ],
    beforeLogin: [
      ({ user }) => {
        if (user.status !== 'active') {
          throw new Error('This AgenAuto account is suspended.')
        }

        return user
      },
    ],
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
  },
  versions: false,
}
