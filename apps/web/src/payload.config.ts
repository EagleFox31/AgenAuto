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
  CatalogIngestionCandidates,
  Generations,
  SpecificationDefinitions,
  Trims,
  TrimSpecifications,
  VehicleModels,
} from './collections/automotive'
import {
  AvailabilitySnapshots,
  DealerBrands,
  DealerLocations,
  Offers,
  PriceHistory,
  Promotions,
  WarrantyTerms,
} from './collections/market'
import { AuditLogs } from './collections/platform/AuditLogs'
import { DealerOrganizations } from './collections/platform/DealerOrganizations'
import { Media } from './collections/platform/Media'
import { Users } from './collections/platform/Users'
import { pilotImportEndpoints } from './endpoints/pilotImport'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const vercelBranchURL = process.env.VERCEL_BRANCH_URL
const serverURL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (vercelBranchURL ? `https://${vercelBranchURL}` : 'http://localhost:3000')

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
  endpoints: pilotImportEndpoints,
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
    CatalogIngestionCandidates,
    DealerLocations,
    DealerBrands,
    Offers,
    PriceHistory,
    AvailabilitySnapshots,
    Promotions,
    WarrantyTerms,
  ],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
