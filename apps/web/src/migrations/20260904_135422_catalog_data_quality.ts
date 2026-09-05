import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_brands_quality_flags_severity" AS ENUM('warning', 'blocking');
  CREATE TYPE "public"."enum_brands_catalog_status" AS ENUM('draft', 'in_review', 'published', 'rejected');
  CREATE TYPE "public"."enum_brands_source_type" AS ENUM('manufacturer', 'official-dealer', 'regulatory', 'manual-verification', 'other');
  CREATE TYPE "public"."enum_vehicle_models_quality_flags_severity" AS ENUM('warning', 'blocking');
  CREATE TYPE "public"."enum_vehicle_models_catalog_status" AS ENUM('draft', 'in_review', 'published', 'rejected');
  CREATE TYPE "public"."enum_vehicle_models_source_type" AS ENUM('manufacturer', 'official-dealer', 'regulatory', 'manual-verification', 'other');
  CREATE TYPE "public"."enum_generations_quality_flags_severity" AS ENUM('warning', 'blocking');
  CREATE TYPE "public"."enum_generations_catalog_status" AS ENUM('draft', 'in_review', 'published', 'rejected');
  CREATE TYPE "public"."enum_generations_source_type" AS ENUM('manufacturer', 'official-dealer', 'regulatory', 'manual-verification', 'other');
  CREATE TYPE "public"."enum_trims_quality_flags_severity" AS ENUM('warning', 'blocking');
  CREATE TYPE "public"."enum_trims_catalog_status" AS ENUM('draft', 'in_review', 'published', 'rejected');
  CREATE TYPE "public"."enum_trims_source_type" AS ENUM('manufacturer', 'official-dealer', 'regulatory', 'manual-verification', 'other');
  CREATE TYPE "public"."enum_specification_definitions_quality_flags_severity" AS ENUM('warning', 'blocking');
  CREATE TYPE "public"."enum_specification_definitions_catalog_status" AS ENUM('draft', 'in_review', 'published', 'rejected');
  CREATE TYPE "public"."enum_specification_definitions_source_type" AS ENUM('manufacturer', 'official-dealer', 'regulatory', 'manual-verification', 'other');
  CREATE TYPE "public"."enum_trim_specifications_quality_flags_severity" AS ENUM('warning', 'blocking');
  CREATE TYPE "public"."enum_trim_specifications_catalog_status" AS ENUM('draft', 'in_review', 'published', 'rejected');
  CREATE TYPE "public"."enum_trim_specifications_source_type" AS ENUM('manufacturer', 'official-dealer', 'regulatory', 'manual-verification', 'other');
  CREATE TABLE "brands_quality_flags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"severity" "enum_brands_quality_flags_severity" NOT NULL,
  	"note" varchar
  );
  
  CREATE TABLE "vehicle_models_quality_flags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"severity" "enum_vehicle_models_quality_flags_severity" NOT NULL,
  	"note" varchar
  );
  
  CREATE TABLE "generations_quality_flags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"severity" "enum_generations_quality_flags_severity" NOT NULL,
  	"note" varchar
  );
  
  CREATE TABLE "trims_quality_flags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"severity" "enum_trims_quality_flags_severity" NOT NULL,
  	"note" varchar
  );
  
  CREATE TABLE "specification_definitions_quality_flags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"severity" "enum_specification_definitions_quality_flags_severity" NOT NULL,
  	"note" varchar
  );
  
  CREATE TABLE "trim_specifications_quality_flags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"severity" "enum_trim_specifications_quality_flags_severity" NOT NULL,
  	"note" varchar
  );
  
  ALTER TABLE "brands" ADD COLUMN "catalog_status" "enum_brands_catalog_status" DEFAULT 'draft' NOT NULL;
  ALTER TABLE "brands" ADD COLUMN "source_type" "enum_brands_source_type";
  ALTER TABLE "brands" ADD COLUMN "source_reference" varchar;
  ALTER TABLE "brands" ADD COLUMN "source_observed_at" timestamp(3) with time zone;
  ALTER TABLE "brands" ADD COLUMN "source_notes" varchar;
  ALTER TABLE "brands" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "brands" ADD COLUMN "reviewed_by_id" integer;
  ALTER TABLE "brands" ADD COLUMN "reviewed_at" timestamp(3) with time zone;
  ALTER TABLE "vehicle_models" ADD COLUMN "catalog_status" "enum_vehicle_models_catalog_status" DEFAULT 'draft' NOT NULL;
  ALTER TABLE "vehicle_models" ADD COLUMN "source_type" "enum_vehicle_models_source_type";
  ALTER TABLE "vehicle_models" ADD COLUMN "source_reference" varchar;
  ALTER TABLE "vehicle_models" ADD COLUMN "source_observed_at" timestamp(3) with time zone;
  ALTER TABLE "vehicle_models" ADD COLUMN "source_notes" varchar;
  ALTER TABLE "vehicle_models" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "vehicle_models" ADD COLUMN "reviewed_by_id" integer;
  ALTER TABLE "vehicle_models" ADD COLUMN "reviewed_at" timestamp(3) with time zone;
  ALTER TABLE "generations" ADD COLUMN "catalog_status" "enum_generations_catalog_status" DEFAULT 'draft' NOT NULL;
  ALTER TABLE "generations" ADD COLUMN "source_type" "enum_generations_source_type";
  ALTER TABLE "generations" ADD COLUMN "source_reference" varchar;
  ALTER TABLE "generations" ADD COLUMN "source_observed_at" timestamp(3) with time zone;
  ALTER TABLE "generations" ADD COLUMN "source_notes" varchar;
  ALTER TABLE "generations" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "generations" ADD COLUMN "reviewed_by_id" integer;
  ALTER TABLE "generations" ADD COLUMN "reviewed_at" timestamp(3) with time zone;
  ALTER TABLE "trims" ADD COLUMN "catalog_status" "enum_trims_catalog_status" DEFAULT 'draft' NOT NULL;
  ALTER TABLE "trims" ADD COLUMN "source_type" "enum_trims_source_type";
  ALTER TABLE "trims" ADD COLUMN "source_reference" varchar;
  ALTER TABLE "trims" ADD COLUMN "source_observed_at" timestamp(3) with time zone;
  ALTER TABLE "trims" ADD COLUMN "source_notes" varchar;
  ALTER TABLE "trims" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "trims" ADD COLUMN "reviewed_by_id" integer;
  ALTER TABLE "trims" ADD COLUMN "reviewed_at" timestamp(3) with time zone;
  ALTER TABLE "specification_definitions" ADD COLUMN "catalog_status" "enum_specification_definitions_catalog_status" DEFAULT 'draft' NOT NULL;
  ALTER TABLE "specification_definitions" ADD COLUMN "source_type" "enum_specification_definitions_source_type";
  ALTER TABLE "specification_definitions" ADD COLUMN "source_reference" varchar;
  ALTER TABLE "specification_definitions" ADD COLUMN "source_observed_at" timestamp(3) with time zone;
  ALTER TABLE "specification_definitions" ADD COLUMN "source_notes" varchar;
  ALTER TABLE "specification_definitions" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "specification_definitions" ADD COLUMN "reviewed_by_id" integer;
  ALTER TABLE "specification_definitions" ADD COLUMN "reviewed_at" timestamp(3) with time zone;
  ALTER TABLE "trim_specifications" ADD COLUMN "catalog_status" "enum_trim_specifications_catalog_status" DEFAULT 'draft' NOT NULL;
  ALTER TABLE "trim_specifications" ADD COLUMN "source_type" "enum_trim_specifications_source_type";
  ALTER TABLE "trim_specifications" ADD COLUMN "source_reference" varchar;
  ALTER TABLE "trim_specifications" ADD COLUMN "source_observed_at" timestamp(3) with time zone;
  ALTER TABLE "trim_specifications" ADD COLUMN "source_notes" varchar;
  ALTER TABLE "trim_specifications" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "trim_specifications" ADD COLUMN "reviewed_by_id" integer;
  ALTER TABLE "trim_specifications" ADD COLUMN "reviewed_at" timestamp(3) with time zone;
  ALTER TABLE "brands_quality_flags" ADD CONSTRAINT "brands_quality_flags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vehicle_models_quality_flags" ADD CONSTRAINT "vehicle_models_quality_flags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vehicle_models"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "generations_quality_flags" ADD CONSTRAINT "generations_quality_flags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "trims_quality_flags" ADD CONSTRAINT "trims_quality_flags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."trims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "specification_definitions_quality_flags" ADD CONSTRAINT "specification_definitions_quality_flags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."specification_definitions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "trim_specifications_quality_flags" ADD CONSTRAINT "trim_specifications_quality_flags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."trim_specifications"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "brands_quality_flags_order_idx" ON "brands_quality_flags" USING btree ("_order");
  CREATE INDEX "brands_quality_flags_parent_id_idx" ON "brands_quality_flags" USING btree ("_parent_id");
  CREATE INDEX "vehicle_models_quality_flags_order_idx" ON "vehicle_models_quality_flags" USING btree ("_order");
  CREATE INDEX "vehicle_models_quality_flags_parent_id_idx" ON "vehicle_models_quality_flags" USING btree ("_parent_id");
  CREATE INDEX "generations_quality_flags_order_idx" ON "generations_quality_flags" USING btree ("_order");
  CREATE INDEX "generations_quality_flags_parent_id_idx" ON "generations_quality_flags" USING btree ("_parent_id");
  CREATE INDEX "trims_quality_flags_order_idx" ON "trims_quality_flags" USING btree ("_order");
  CREATE INDEX "trims_quality_flags_parent_id_idx" ON "trims_quality_flags" USING btree ("_parent_id");
  CREATE INDEX "specification_definitions_quality_flags_order_idx" ON "specification_definitions_quality_flags" USING btree ("_order");
  CREATE INDEX "specification_definitions_quality_flags_parent_id_idx" ON "specification_definitions_quality_flags" USING btree ("_parent_id");
  CREATE INDEX "trim_specifications_quality_flags_order_idx" ON "trim_specifications_quality_flags" USING btree ("_order");
  CREATE INDEX "trim_specifications_quality_flags_parent_id_idx" ON "trim_specifications_quality_flags" USING btree ("_parent_id");
  ALTER TABLE "brands" ADD CONSTRAINT "brands_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "generations" ADD CONSTRAINT "generations_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "trims" ADD CONSTRAINT "trims_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "specification_definitions" ADD CONSTRAINT "specification_definitions_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "trim_specifications" ADD CONSTRAINT "trim_specifications_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "brands_catalog_status_idx" ON "brands" USING btree ("catalog_status");
  CREATE INDEX "brands_reviewed_by_idx" ON "brands" USING btree ("reviewed_by_id");
  CREATE INDEX "vehicle_models_catalog_status_idx" ON "vehicle_models" USING btree ("catalog_status");
  CREATE INDEX "vehicle_models_reviewed_by_idx" ON "vehicle_models" USING btree ("reviewed_by_id");
  CREATE INDEX "generations_catalog_status_idx" ON "generations" USING btree ("catalog_status");
  CREATE INDEX "generations_reviewed_by_idx" ON "generations" USING btree ("reviewed_by_id");
  CREATE INDEX "trims_catalog_status_idx" ON "trims" USING btree ("catalog_status");
  CREATE INDEX "trims_reviewed_by_idx" ON "trims" USING btree ("reviewed_by_id");
  CREATE INDEX "specification_definitions_catalog_status_idx" ON "specification_definitions" USING btree ("catalog_status");
  CREATE INDEX "specification_definitions_reviewed_by_idx" ON "specification_definitions" USING btree ("reviewed_by_id");
  CREATE INDEX "trim_specifications_catalog_status_idx" ON "trim_specifications" USING btree ("catalog_status");
  CREATE INDEX "trim_specifications_reviewed_by_idx" ON "trim_specifications" USING btree ("reviewed_by_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "brands_quality_flags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vehicle_models_quality_flags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "generations_quality_flags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "trims_quality_flags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "specification_definitions_quality_flags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "trim_specifications_quality_flags" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "brands_quality_flags" CASCADE;
  DROP TABLE "vehicle_models_quality_flags" CASCADE;
  DROP TABLE "generations_quality_flags" CASCADE;
  DROP TABLE "trims_quality_flags" CASCADE;
  DROP TABLE "specification_definitions_quality_flags" CASCADE;
  DROP TABLE "trim_specifications_quality_flags" CASCADE;
  ALTER TABLE "brands" DROP CONSTRAINT "brands_reviewed_by_id_users_id_fk";
  
  ALTER TABLE "vehicle_models" DROP CONSTRAINT "vehicle_models_reviewed_by_id_users_id_fk";
  
  ALTER TABLE "generations" DROP CONSTRAINT "generations_reviewed_by_id_users_id_fk";
  
  ALTER TABLE "trims" DROP CONSTRAINT "trims_reviewed_by_id_users_id_fk";
  
  ALTER TABLE "specification_definitions" DROP CONSTRAINT "specification_definitions_reviewed_by_id_users_id_fk";
  
  ALTER TABLE "trim_specifications" DROP CONSTRAINT "trim_specifications_reviewed_by_id_users_id_fk";
  
  DROP INDEX "brands_catalog_status_idx";
  DROP INDEX "brands_reviewed_by_idx";
  DROP INDEX "vehicle_models_catalog_status_idx";
  DROP INDEX "vehicle_models_reviewed_by_idx";
  DROP INDEX "generations_catalog_status_idx";
  DROP INDEX "generations_reviewed_by_idx";
  DROP INDEX "trims_catalog_status_idx";
  DROP INDEX "trims_reviewed_by_idx";
  DROP INDEX "specification_definitions_catalog_status_idx";
  DROP INDEX "specification_definitions_reviewed_by_idx";
  DROP INDEX "trim_specifications_catalog_status_idx";
  DROP INDEX "trim_specifications_reviewed_by_idx";
  ALTER TABLE "brands" DROP COLUMN "catalog_status";
  ALTER TABLE "brands" DROP COLUMN "source_type";
  ALTER TABLE "brands" DROP COLUMN "source_reference";
  ALTER TABLE "brands" DROP COLUMN "source_observed_at";
  ALTER TABLE "brands" DROP COLUMN "source_notes";
  ALTER TABLE "brands" DROP COLUMN "review_notes";
  ALTER TABLE "brands" DROP COLUMN "reviewed_by_id";
  ALTER TABLE "brands" DROP COLUMN "reviewed_at";
  ALTER TABLE "vehicle_models" DROP COLUMN "catalog_status";
  ALTER TABLE "vehicle_models" DROP COLUMN "source_type";
  ALTER TABLE "vehicle_models" DROP COLUMN "source_reference";
  ALTER TABLE "vehicle_models" DROP COLUMN "source_observed_at";
  ALTER TABLE "vehicle_models" DROP COLUMN "source_notes";
  ALTER TABLE "vehicle_models" DROP COLUMN "review_notes";
  ALTER TABLE "vehicle_models" DROP COLUMN "reviewed_by_id";
  ALTER TABLE "vehicle_models" DROP COLUMN "reviewed_at";
  ALTER TABLE "generations" DROP COLUMN "catalog_status";
  ALTER TABLE "generations" DROP COLUMN "source_type";
  ALTER TABLE "generations" DROP COLUMN "source_reference";
  ALTER TABLE "generations" DROP COLUMN "source_observed_at";
  ALTER TABLE "generations" DROP COLUMN "source_notes";
  ALTER TABLE "generations" DROP COLUMN "review_notes";
  ALTER TABLE "generations" DROP COLUMN "reviewed_by_id";
  ALTER TABLE "generations" DROP COLUMN "reviewed_at";
  ALTER TABLE "trims" DROP COLUMN "catalog_status";
  ALTER TABLE "trims" DROP COLUMN "source_type";
  ALTER TABLE "trims" DROP COLUMN "source_reference";
  ALTER TABLE "trims" DROP COLUMN "source_observed_at";
  ALTER TABLE "trims" DROP COLUMN "source_notes";
  ALTER TABLE "trims" DROP COLUMN "review_notes";
  ALTER TABLE "trims" DROP COLUMN "reviewed_by_id";
  ALTER TABLE "trims" DROP COLUMN "reviewed_at";
  ALTER TABLE "specification_definitions" DROP COLUMN "catalog_status";
  ALTER TABLE "specification_definitions" DROP COLUMN "source_type";
  ALTER TABLE "specification_definitions" DROP COLUMN "source_reference";
  ALTER TABLE "specification_definitions" DROP COLUMN "source_observed_at";
  ALTER TABLE "specification_definitions" DROP COLUMN "source_notes";
  ALTER TABLE "specification_definitions" DROP COLUMN "review_notes";
  ALTER TABLE "specification_definitions" DROP COLUMN "reviewed_by_id";
  ALTER TABLE "specification_definitions" DROP COLUMN "reviewed_at";
  ALTER TABLE "trim_specifications" DROP COLUMN "catalog_status";
  ALTER TABLE "trim_specifications" DROP COLUMN "source_type";
  ALTER TABLE "trim_specifications" DROP COLUMN "source_reference";
  ALTER TABLE "trim_specifications" DROP COLUMN "source_observed_at";
  ALTER TABLE "trim_specifications" DROP COLUMN "source_notes";
  ALTER TABLE "trim_specifications" DROP COLUMN "review_notes";
  ALTER TABLE "trim_specifications" DROP COLUMN "reviewed_by_id";
  ALTER TABLE "trim_specifications" DROP COLUMN "reviewed_at";
  DROP TYPE "public"."enum_brands_quality_flags_severity";
  DROP TYPE "public"."enum_brands_catalog_status";
  DROP TYPE "public"."enum_brands_source_type";
  DROP TYPE "public"."enum_vehicle_models_quality_flags_severity";
  DROP TYPE "public"."enum_vehicle_models_catalog_status";
  DROP TYPE "public"."enum_vehicle_models_source_type";
  DROP TYPE "public"."enum_generations_quality_flags_severity";
  DROP TYPE "public"."enum_generations_catalog_status";
  DROP TYPE "public"."enum_generations_source_type";
  DROP TYPE "public"."enum_trims_quality_flags_severity";
  DROP TYPE "public"."enum_trims_catalog_status";
  DROP TYPE "public"."enum_trims_source_type";
  DROP TYPE "public"."enum_specification_definitions_quality_flags_severity";
  DROP TYPE "public"."enum_specification_definitions_catalog_status";
  DROP TYPE "public"."enum_specification_definitions_source_type";
  DROP TYPE "public"."enum_trim_specifications_quality_flags_severity";
  DROP TYPE "public"."enum_trim_specifications_catalog_status";
  DROP TYPE "public"."enum_trim_specifications_source_type";`)
}
