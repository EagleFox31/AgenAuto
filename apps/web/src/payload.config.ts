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
import { pilotReviewEndpoints } from './endpoints/pilotReview'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

function absoluteURL(value?: string): string | undefined {
  if (!value) return undefined
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

const explicitAppURL = absoluteURL(process.env.NEXT_PUBLIC_APP_URL)
const vercelBranchURL = absoluteURL(process.env.VERCEL_BRANCH_URL)
const vercelDeploymentURL = absoluteURL(process.env.VERCEL_URL)
const vercelProductionURL = absoluteURL(process.env.VERCEL_PROJECT_PRODUCTION_URL)
const serverURL =
  explicitAppURL || vercelBranchURL || vercelDeploymentURL || 'http://localhost:3000'
const csrf = Array.from(
  new Set(
    [serverURL, vercelBranchURL, vercelDeploymentURL, vercelProductionURL].filter(
      (value): value is string => Boolean(value),
    ),
  ),
)

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
  endpoints: [...pilotImportEndpoints, ...pilotReviewEndpoints],
  csrf,
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
