import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_dealer_locations_status" AS ENUM('active', 'inactive');
  CREATE TYPE "public"."enum_dealer_brands_status" AS ENUM('active', 'inactive');
  CREATE TYPE "public"."enum_offers_status" AS ENUM('active', 'inactive', 'archived');
  CREATE TYPE "public"."enum_price_history_currency" AS ENUM('XAF');
  CREATE TYPE "public"."enum_price_history_price_type" AS ENUM('list', 'from', 'promotional');
  CREATE TYPE "public"."enum_availability_snapshots_availability" AS ENUM('in_stock', 'limited', 'order_only', 'out_of_stock', 'unknown');
  CREATE TYPE "public"."enum_promotions_status" AS ENUM('draft', 'active', 'expired');
  CREATE TYPE "public"."enum_warranty_terms_status" AS ENUM('active', 'inactive');
  CREATE TABLE "dealer_locations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dealer_organization_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"identity_key" varchar NOT NULL,
  	"city" varchar NOT NULL,
  	"address" varchar NOT NULL,
  	"phone" varchar,
  	"email" varchar,
  	"latitude" numeric,
  	"longitude" numeric,
  	"status" "enum_dealer_locations_status" DEFAULT 'active' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "dealer_brands" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dealer_organization_id" integer NOT NULL,
  	"brand_id" integer NOT NULL,
  	"identity_key" varchar NOT NULL,
  	"status" "enum_dealer_brands_status" DEFAULT 'active' NOT NULL,
  	"official_since" timestamp(3) with time zone,
  	"source_reference" varchar NOT NULL,
  	"observed_at" timestamp(3) with time zone NOT NULL,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "offers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dealer_organization_id" integer NOT NULL,
  	"location_id" integer,
  	"trim_id" integer NOT NULL,
  	"headline" varchar NOT NULL,
  	"external_reference" varchar,
  	"status" "enum_offers_status" DEFAULT 'active' NOT NULL,
  	"source_reference" varchar NOT NULL,
  	"observed_at" timestamp(3) with time zone NOT NULL,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "price_history" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dealer_organization_id" integer NOT NULL,
  	"offer_id" integer NOT NULL,
  	"amount" numeric NOT NULL,
  	"currency" "enum_price_history_currency" DEFAULT 'XAF' NOT NULL,
  	"price_type" "enum_price_history_price_type" DEFAULT 'list' NOT NULL,
  	"observed_at" timestamp(3) with time zone NOT NULL,
  	"source_reference" varchar NOT NULL,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "availability_snapshots" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dealer_organization_id" integer NOT NULL,
  	"offer_id" integer NOT NULL,
  	"availability" "enum_availability_snapshots_availability" NOT NULL,
  	"quantity" numeric,
  	"observed_at" timestamp(3) with time zone NOT NULL,
  	"source_reference" varchar NOT NULL,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "promotions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dealer_organization_id" integer NOT NULL,
  	"offer_id" integer NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"status" "enum_promotions_status" DEFAULT 'active' NOT NULL,
  	"source_reference" varchar NOT NULL,
  	"observed_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "warranty_terms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dealer_organization_id" integer NOT NULL,
  	"offer_id" integer NOT NULL,
  	"months" numeric,
  	"distance_km" numeric,
  	"coverage" varchar NOT NULL,
  	"status" "enum_warranty_terms_status" DEFAULT 'active' NOT NULL,
  	"source_reference" varchar NOT NULL,
  	"observed_at" timestamp(3) with time zone NOT NULL,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "dealer_organizations" ADD COLUMN "legal_name" varchar;
  ALTER TABLE "dealer_organizations" ADD COLUMN "website" varchar;
  ALTER TABLE "dealer_organizations" ADD COLUMN "phone" varchar;
  ALTER TABLE "dealer_organizations" ADD COLUMN "email" varchar;
  ALTER TABLE "dealer_organizations" ADD COLUMN "description" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "dealer_locations_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "dealer_brands_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "offers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "price_history_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "availability_snapshots_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "promotions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "warranty_terms_id" integer;
  ALTER TABLE "dealer_locations" ADD CONSTRAINT "dealer_locations_dealer_organization_id_dealer_organizations_id_fk" FOREIGN KEY ("dealer_organization_id") REFERENCES "public"."dealer_organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dealer_brands" ADD CONSTRAINT "dealer_brands_dealer_organization_id_dealer_organizations_id_fk" FOREIGN KEY ("dealer_organization_id") REFERENCES "public"."dealer_organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dealer_brands" ADD CONSTRAINT "dealer_brands_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "offers" ADD CONSTRAINT "offers_dealer_organization_id_dealer_organizations_id_fk" FOREIGN KEY ("dealer_organization_id") REFERENCES "public"."dealer_organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "offers" ADD CONSTRAINT "offers_location_id_dealer_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."dealer_locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "offers" ADD CONSTRAINT "offers_trim_id_trims_id_fk" FOREIGN KEY ("trim_id") REFERENCES "public"."trims"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "price_history" ADD CONSTRAINT "price_history_dealer_organization_id_dealer_organizations_id_fk" FOREIGN KEY ("dealer_organization_id") REFERENCES "public"."dealer_organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "price_history" ADD CONSTRAINT "price_history_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "availability_snapshots" ADD CONSTRAINT "availability_snapshots_dealer_organization_id_dealer_organizations_id_fk" FOREIGN KEY ("dealer_organization_id") REFERENCES "public"."dealer_organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "availability_snapshots" ADD CONSTRAINT "availability_snapshots_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "promotions" ADD CONSTRAINT "promotions_dealer_organization_id_dealer_organizations_id_fk" FOREIGN KEY ("dealer_organization_id") REFERENCES "public"."dealer_organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "promotions" ADD CONSTRAINT "promotions_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "warranty_terms" ADD CONSTRAINT "warranty_terms_dealer_organization_id_dealer_organizations_id_fk" FOREIGN KEY ("dealer_organization_id") REFERENCES "public"."dealer_organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "warranty_terms" ADD CONSTRAINT "warranty_terms_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "dealer_locations_dealer_organization_idx" ON "dealer_locations" USING btree ("dealer_organization_id");
  CREATE INDEX "dealer_locations_slug_idx" ON "dealer_locations" USING btree ("slug");
  CREATE UNIQUE INDEX "dealer_locations_identity_key_idx" ON "dealer_locations" USING btree ("identity_key");
  CREATE INDEX "dealer_locations_city_idx" ON "dealer_locations" USING btree ("city");
  CREATE INDEX "dealer_locations_status_idx" ON "dealer_locations" USING btree ("status");
  CREATE INDEX "dealer_locations_updated_at_idx" ON "dealer_locations" USING btree ("updated_at");
  CREATE INDEX "dealer_locations_created_at_idx" ON "dealer_locations" USING btree ("created_at");
  CREATE INDEX "dealer_brands_dealer_organization_idx" ON "dealer_brands" USING btree ("dealer_organization_id");
  CREATE INDEX "dealer_brands_brand_idx" ON "dealer_brands" USING btree ("brand_id");
  CREATE UNIQUE INDEX "dealer_brands_identity_key_idx" ON "dealer_brands" USING btree ("identity_key");
  CREATE INDEX "dealer_brands_status_idx" ON "dealer_brands" USING btree ("status");
  CREATE INDEX "dealer_brands_observed_at_idx" ON "dealer_brands" USING btree ("observed_at");
  CREATE INDEX "dealer_brands_updated_at_idx" ON "dealer_brands" USING btree ("updated_at");
  CREATE INDEX "dealer_brands_created_at_idx" ON "dealer_brands" USING btree ("created_at");
  CREATE INDEX "offers_dealer_organization_idx" ON "offers" USING btree ("dealer_organization_id");
  CREATE INDEX "offers_location_idx" ON "offers" USING btree ("location_id");
  CREATE INDEX "offers_trim_idx" ON "offers" USING btree ("trim_id");
  CREATE INDEX "offers_external_reference_idx" ON "offers" USING btree ("external_reference");
  CREATE INDEX "offers_status_idx" ON "offers" USING btree ("status");
  CREATE INDEX "offers_observed_at_idx" ON "offers" USING btree ("observed_at");
  CREATE INDEX "offers_updated_at_idx" ON "offers" USING btree ("updated_at");
  CREATE INDEX "offers_created_at_idx" ON "offers" USING btree ("created_at");
  CREATE INDEX "price_history_dealer_organization_idx" ON "price_history" USING btree ("dealer_organization_id");
  CREATE INDEX "price_history_offer_idx" ON "price_history" USING btree ("offer_id");
  CREATE INDEX "price_history_amount_idx" ON "price_history" USING btree ("amount");
  CREATE INDEX "price_history_observed_at_idx" ON "price_history" USING btree ("observed_at");
  CREATE INDEX "price_history_updated_at_idx" ON "price_history" USING btree ("updated_at");
  CREATE INDEX "price_history_created_at_idx" ON "price_history" USING btree ("created_at");
  CREATE INDEX "availability_snapshots_dealer_organization_idx" ON "availability_snapshots" USING btree ("dealer_organization_id");
  CREATE INDEX "availability_snapshots_offer_idx" ON "availability_snapshots" USING btree ("offer_id");
  CREATE INDEX "availability_snapshots_availability_idx" ON "availability_snapshots" USING btree ("availability");
  CREATE INDEX "availability_snapshots_observed_at_idx" ON "availability_snapshots" USING btree ("observed_at");
  CREATE INDEX "availability_snapshots_updated_at_idx" ON "availability_snapshots" USING btree ("updated_at");
  CREATE INDEX "availability_snapshots_created_at_idx" ON "availability_snapshots" USING btree ("created_at");
  CREATE INDEX "promotions_dealer_organization_idx" ON "promotions" USING btree ("dealer_organization_id");
  CREATE INDEX "promotions_offer_idx" ON "promotions" USING btree ("offer_id");
  CREATE INDEX "promotions_starts_at_idx" ON "promotions" USING btree ("starts_at");
  CREATE INDEX "promotions_ends_at_idx" ON "promotions" USING btree ("ends_at");
  CREATE INDEX "promotions_status_idx" ON "promotions" USING btree ("status");
  CREATE INDEX "promotions_observed_at_idx" ON "promotions" USING btree ("observed_at");
  CREATE INDEX "promotions_updated_at_idx" ON "promotions" USING btree ("updated_at");
  CREATE INDEX "promotions_created_at_idx" ON "promotions" USING btree ("created_at");
  CREATE INDEX "warranty_terms_dealer_organization_idx" ON "warranty_terms" USING btree ("dealer_organization_id");
  CREATE INDEX "warranty_terms_offer_idx" ON "warranty_terms" USING btree ("offer_id");
  CREATE INDEX "warranty_terms_status_idx" ON "warranty_terms" USING btree ("status");
  CREATE INDEX "warranty_terms_observed_at_idx" ON "warranty_terms" USING btree ("observed_at");
  CREATE INDEX "warranty_terms_updated_at_idx" ON "warranty_terms" USING btree ("updated_at");
  CREATE INDEX "warranty_terms_created_at_idx" ON "warranty_terms" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_dealer_locations_fk" FOREIGN KEY ("dealer_locations_id") REFERENCES "public"."dealer_locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_dealer_brands_fk" FOREIGN KEY ("dealer_brands_id") REFERENCES "public"."dealer_brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_offers_fk" FOREIGN KEY ("offers_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_price_history_fk" FOREIGN KEY ("price_history_id") REFERENCES "public"."price_history"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_availability_snapshots_fk" FOREIGN KEY ("availability_snapshots_id") REFERENCES "public"."availability_snapshots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_promotions_fk" FOREIGN KEY ("promotions_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_warranty_terms_fk" FOREIGN KEY ("warranty_terms_id") REFERENCES "public"."warranty_terms"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_dealer_locations_id_idx" ON "payload_locked_documents_rels" USING btree ("dealer_locations_id");
  CREATE INDEX "payload_locked_documents_rels_dealer_brands_id_idx" ON "payload_locked_documents_rels" USING btree ("dealer_brands_id");
  CREATE INDEX "payload_locked_documents_rels_offers_id_idx" ON "payload_locked_documents_rels" USING btree ("offers_id");
  CREATE INDEX "payload_locked_documents_rels_price_history_id_idx" ON "payload_locked_documents_rels" USING btree ("price_history_id");
  CREATE INDEX "payload_locked_documents_rels_availability_snapshots_id_idx" ON "payload_locked_documents_rels" USING btree ("availability_snapshots_id");
  CREATE INDEX "payload_locked_documents_rels_promotions_id_idx" ON "payload_locked_documents_rels" USING btree ("promotions_id");
  CREATE INDEX "payload_locked_documents_rels_warranty_terms_id_idx" ON "payload_locked_documents_rels" USING btree ("warranty_terms_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "dealer_locations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dealer_brands" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "offers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "price_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "availability_snapshots" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "promotions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "warranty_terms" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "dealer_locations" CASCADE;
  DROP TABLE "dealer_brands" CASCADE;
  DROP TABLE "offers" CASCADE;
  DROP TABLE "price_history" CASCADE;
  DROP TABLE "availability_snapshots" CASCADE;
  DROP TABLE "promotions" CASCADE;
  DROP TABLE "warranty_terms" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_dealer_locations_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_dealer_brands_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_offers_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_price_history_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_availability_snapshots_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_promotions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_warranty_terms_fk";
  
  DROP INDEX "payload_locked_documents_rels_dealer_locations_id_idx";
  DROP INDEX "payload_locked_documents_rels_dealer_brands_id_idx";
  DROP INDEX "payload_locked_documents_rels_offers_id_idx";
  DROP INDEX "payload_locked_documents_rels_price_history_id_idx";
  DROP INDEX "payload_locked_documents_rels_availability_snapshots_id_idx";
  DROP INDEX "payload_locked_documents_rels_promotions_id_idx";
  DROP INDEX "payload_locked_documents_rels_warranty_terms_id_idx";
  ALTER TABLE "dealer_organizations" DROP COLUMN "legal_name";
  ALTER TABLE "dealer_organizations" DROP COLUMN "website";
  ALTER TABLE "dealer_organizations" DROP COLUMN "phone";
  ALTER TABLE "dealer_organizations" DROP COLUMN "email";
  ALTER TABLE "dealer_organizations" DROP COLUMN "description";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "dealer_locations_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "dealer_brands_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "offers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "price_history_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "availability_snapshots_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "promotions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "warranty_terms_id";
  DROP TYPE "public"."enum_dealer_locations_status";
  DROP TYPE "public"."enum_dealer_brands_status";
  DROP TYPE "public"."enum_offers_status";
  DROP TYPE "public"."enum_price_history_currency";
  DROP TYPE "public"."enum_price_history_price_type";
  DROP TYPE "public"."enum_availability_snapshots_availability";
  DROP TYPE "public"."enum_promotions_status";
  DROP TYPE "public"."enum_warranty_terms_status";`)
}
