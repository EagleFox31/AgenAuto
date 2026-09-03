import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Platform',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'kind', 'alt', 'updatedAt'],
  },
  upload: {
    mimeTypes: ['image/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'vehicle',
      options: [
        { label: 'Brand logo', value: 'brand-logo' },
        { label: 'Vehicle', value: 'vehicle' },
        { label: 'Interior', value: 'interior' },
        { label: 'Technical', value: 'technical' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'sourceUrl',
      type: 'text',
    },
    {
      name: 'attribution',
      type: 'text',
    },
    {
      name: 'licenseNote',
      type: 'text',
    },
  ],
}
