import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_catalog_ingestion_candidates_confidence" AS ENUM('A', 'B', 'C');
  CREATE TYPE "public"."enum_catalog_ingestion_candidates_mapping_status" AS ENUM('needs_review', 'mapped', 'approved', 'rejected', 'promoted');
  CREATE TABLE "catalog_ingestion_candidates_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL
  );
  
  CREATE TABLE "catalog_ingestion_candidates_quality_flags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL
  );
  
  CREATE TABLE "catalog_ingestion_candidates_trim_mappings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_variant" varchar NOT NULL,
  	"proposed_trim_id" integer
  );
  
  CREATE TABLE "catalog_ingestion_candidates_promotion_blockers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"note" varchar
  );
  
  CREATE TABLE "catalog_ingestion_candidates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"candidate_key" varchar NOT NULL,
  	"display_name" varchar NOT NULL,
  	"brand_name" varchar NOT NULL,
  	"model_name" varchar NOT NULL,
  	"distributor" varchar NOT NULL,
  	"source_reference" varchar NOT NULL,
  	"source_observed_at" timestamp(3) with time zone NOT NULL,
  	"source_type" varchar NOT NULL,
  	"confidence" "enum_catalog_ingestion_candidates_confidence" NOT NULL,
  	"content_hash" varchar,
  	"specifications" jsonb NOT NULL,
  	"mapping_status" "enum_catalog_ingestion_candidates_mapping_status" DEFAULT 'needs_review' NOT NULL,
  	"proposed_brand_id" integer,
  	"proposed_model_id" integer,
  	"proposed_generation_id" integer,
  	"review_notes" varchar,
  	"raw_candidate" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "catalog_ingestion_candidates_id" integer;
  ALTER TABLE "catalog_ingestion_candidates_variants" ADD CONSTRAINT "catalog_ingestion_candidates_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."catalog_ingestion_candidates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "catalog_ingestion_candidates_quality_flags" ADD CONSTRAINT "catalog_ingestion_candidates_quality_flags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."catalog_ingestion_candidates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "catalog_ingestion_candidates_trim_mappings" ADD CONSTRAINT "catalog_ingestion_candidates_trim_mappings_proposed_trim_id_trims_id_fk" FOREIGN KEY ("proposed_trim_id") REFERENCES "public"."trims"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "catalog_ingestion_candidates_trim_mappings" ADD CONSTRAINT "catalog_ingestion_candidates_trim_mappings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."catalog_ingestion_candidates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "catalog_ingestion_candidates_promotion_blockers" ADD CONSTRAINT "catalog_ingestion_candidates_promotion_blockers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."catalog_ingestion_candidates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "catalog_ingestion_candidates" ADD CONSTRAINT "catalog_ingestion_candidates_proposed_brand_id_brands_id_fk" FOREIGN KEY ("proposed_brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "catalog_ingestion_candidates" ADD CONSTRAINT "catalog_ingestion_candidates_proposed_model_id_vehicle_models_id_fk" FOREIGN KEY ("proposed_model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "catalog_ingestion_candidates" ADD CONSTRAINT "catalog_ingestion_candidates_proposed_generation_id_generations_id_fk" FOREIGN KEY ("proposed_generation_id") REFERENCES "public"."generations"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "catalog_ingestion_candidates_variants_order_idx" ON "catalog_ingestion_candidates_variants" USING btree ("_order");
  CREATE INDEX "catalog_ingestion_candidates_variants_parent_id_idx" ON "catalog_ingestion_candidates_variants" USING btree ("_parent_id");
  CREATE INDEX "catalog_ingestion_candidates_quality_flags_order_idx" ON "catalog_ingestion_candidates_quality_flags" USING btree ("_order");
  CREATE INDEX "catalog_ingestion_candidates_quality_flags_parent_id_idx" ON "catalog_ingestion_candidates_quality_flags" USING btree ("_parent_id");
  CREATE INDEX "catalog_ingestion_candidates_trim_mappings_order_idx" ON "catalog_ingestion_candidates_trim_mappings" USING btree ("_order");
  CREATE INDEX "catalog_ingestion_candidates_trim_mappings_parent_id_idx" ON "catalog_ingestion_candidates_trim_mappings" USING btree ("_parent_id");
  CREATE INDEX "catalog_ingestion_candidates_trim_mappings_proposed_trim_idx" ON "catalog_ingestion_candidates_trim_mappings" USING btree ("proposed_trim_id");
  CREATE INDEX "catalog_ingestion_candidates_promotion_blockers_order_idx" ON "catalog_ingestion_candidates_promotion_blockers" USING btree ("_order");
  CREATE INDEX "catalog_ingestion_candidates_promotion_blockers_parent_id_idx" ON "catalog_ingestion_candidates_promotion_blockers" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "catalog_ingestion_candidates_candidate_key_idx" ON "catalog_ingestion_candidates" USING btree ("candidate_key");
  CREATE INDEX "catalog_ingestion_candidates_display_name_idx" ON "catalog_ingestion_candidates" USING btree ("display_name");
  CREATE INDEX "catalog_ingestion_candidates_brand_name_idx" ON "catalog_ingestion_candidates" USING btree ("brand_name");
  CREATE INDEX "catalog_ingestion_candidates_model_name_idx" ON "catalog_ingestion_candidates" USING btree ("model_name");
  CREATE INDEX "catalog_ingestion_candidates_content_hash_idx" ON "catalog_ingestion_candidates" USING btree ("content_hash");
  CREATE INDEX "catalog_ingestion_candidates_mapping_status_idx" ON "catalog_ingestion_candidates" USING btree ("mapping_status");
  CREATE INDEX "catalog_ingestion_candidates_proposed_brand_idx" ON "catalog_ingestion_candidates" USING btree ("proposed_brand_id");
  CREATE INDEX "catalog_ingestion_candidates_proposed_model_idx" ON "catalog_ingestion_candidates" USING btree ("proposed_model_id");
  CREATE INDEX "catalog_ingestion_candidates_proposed_generation_idx" ON "catalog_ingestion_candidates" USING btree ("proposed_generation_id");
  CREATE INDEX "catalog_ingestion_candidates_updated_at_idx" ON "catalog_ingestion_candidates" USING btree ("updated_at");
  CREATE INDEX "catalog_ingestion_candidates_created_at_idx" ON "catalog_ingestion_candidates" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_catalog_ingestion_candidate_fk" FOREIGN KEY ("catalog_ingestion_candidates_id") REFERENCES "public"."catalog_ingestion_candidates"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_catalog_ingestion_candidat_idx" ON "payload_locked_documents_rels" USING btree ("catalog_ingestion_candidates_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "catalog_ingestion_candidates_variants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "catalog_ingestion_candidates_quality_flags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "catalog_ingestion_candidates_trim_mappings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "catalog_ingestion_candidates_promotion_blockers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "catalog_ingestion_candidates" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "catalog_ingestion_candidates_variants" CASCADE;
  DROP TABLE "catalog_ingestion_candidates_quality_flags" CASCADE;
  DROP TABLE "catalog_ingestion_candidates_trim_mappings" CASCADE;
  DROP TABLE "catalog_ingestion_candidates_promotion_blockers" CASCADE;
  DROP TABLE "catalog_ingestion_candidates" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_catalog_ingestion_candidate_fk";
  
  DROP INDEX "payload_locked_documents_rels_catalog_ingestion_candidat_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "catalog_ingestion_candidates_id";
  DROP TYPE "public"."enum_catalog_ingestion_candidates_confidence";
  DROP TYPE "public"."enum_catalog_ingestion_candidates_mapping_status";`)
}
