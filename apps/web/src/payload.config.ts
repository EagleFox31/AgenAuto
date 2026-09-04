import { postgresAdapter } from '@payloadcms/db-postgres'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'

import {
  secureCanonicalAssetCollection,
  secureCanonicalCollection,
} from './access/collectionSecurity'
import {
  Brands,
  Generations,
  SpecificationDefinitions,
  Trims,
  TrimSpecifications,
  VehicleModels,
} from './collections/automotive'
import { AuditLogs } from './collections/platform/AuditLogs'
import { DealerOrganizations } from './collections/platform/DealerOrganizations'
import { Media } from './collections/platform/Media'
import { Users } from './collections/platform/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — AgenAuto',
    },
  },
  collections: [
    Users,
    DealerOrganizations,
    AuditLogs,
    secureCanonicalAssetCollection(Media),
    secureCanonicalCollection(Brands),
    secureCanonicalCollection(VehicleModels),
    secureCanonicalCollection(Generations),
    secureCanonicalCollection(Trims),
    secureCanonicalCollection(SpecificationDefinitions),
    secureCanonicalCollection(TrimSpecifications),
  ],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
