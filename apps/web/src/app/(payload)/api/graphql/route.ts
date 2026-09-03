/* THIS FILE FOLLOWS THE OFFICIAL PAYLOAD APP ROUTER PATTERN. */
import config from '@payload-config'
import '@payloadcms/next/css'
import { GRAPHQL_POST, REST_OPTIONS } from '@payloadcms/next/routes'

export const POST = GRAPHQL_POST(config)
export const OPTIONS = REST_OPTIONS(config)
