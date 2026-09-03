import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    group: 'Platform',
    useAsTitle: 'email',
  },
  auth: true,
  fields: [],
  versions: false,
}
