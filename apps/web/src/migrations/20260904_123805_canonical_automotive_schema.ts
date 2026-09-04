import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_media_kind" AS ENUM('brand-logo', 'vehicle', 'interior', 'technical', 'other');
  CREATE TYPE "public"."enum_trims_body_style" AS ENUM('city-car', 'hatchback', 'sedan', 'wagon', 'suv', 'crossover', 'pickup', 'van-mpv', 'coupe', 'convertible', 'commercial', 'other');
  CREATE TYPE "public"."enum_trims_fuel_type" AS ENUM('petrol', 'diesel', 'hybrid', 'plug-in-hybrid', 'electric', 'lpg', 'other');
  CREATE TYPE "public"."enum_trims_transmission" AS ENUM('manual', 'automatic', 'cvt', 'dct', 'automated-manual', 'single-speed', 'other');
  CREATE TYPE "public"."enum_trims_drive_type" AS ENUM('fwd', 'rwd', 'awd', '4wd', 'other');
  CREATE TYPE "public"."enum_specification_definitions_category" AS ENUM('engine', 'electric-system', 'performance', 'drivetrain', 'dimensions', 'capacity', 'efficiency', 'chassis', 'safety', 'comfort', 'other');
  CREATE TYPE "public"."enum_specification_definitions_value_type" AS ENUM('number', 'text', 'boolean', 'option');
  CREATE TYPE "public"."enum_specification_definitions_unit" AS ENUM('mm', 'cm', 'm', 'l', 'cm3', 'kw', 'hp', 'nm', 'kg', 'km-h', 'l-100km', 'kwh-100km', 'km', 'g-km', 's', 'percent');
  CREATE TYPE "public"."enum_trim_specifications_value_status" AS ENUM('known', 'unknown', 'not-applicable');
  CREATE TYPE "public"."enum_trim_specifications_boolean_value" AS ENUM('true', 'false');
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"kind" "enum_media_kind" DEFAULT 'vehicle' NOT NULL,
  	"source_url" varchar,
  	"attribution" varchar,
  	"license_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "brands" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"country_of_origin" varchar,
  	"website" varchar,
  	"logo_id" integer,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "vehicle_models" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"brand_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"identity_key" varchar NOT NULL,
  	"model_code" varchar,
  	"hero_image_id" integer,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "vehicle_models_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "generations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"model_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"identity_key" varchar NOT NULL,
  	"generation_code" varchar,
  	"production_start_year" numeric,
  	"production_end_year" numeric,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "generations_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "trims" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"generation_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"identity_key" varchar NOT NULL,
  	"model_year_start" numeric,
  	"model_year_end" numeric,
  	"body_style" "enum_trims_body_style",
  	"fuel_type" "enum_trims_fuel_type",
  	"transmission" "enum_trims_transmission",
  	"drive_type" "enum_trims_drive_type",
  	"seats" numeric,
  	"doors" numeric,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "trims_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "specification_definitions_allowed_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "specification_definitions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"category" "enum_specification_definitions_category" NOT NULL,
  	"value_type" "enum_specification_definitions_value_type" NOT NULL,
  	"unit" "enum_specification_definitions_unit",
  	"comparable" boolean DEFAULT true,
  	"filterable" boolean DEFAULT false,
  	"sort_order" numeric DEFAULT 100,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "trim_specifications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"trim_id" integer NOT NULL,
  	"definition_id" integer NOT NULL,
  	"identity_key" varchar NOT NULL,
  	"value_status" "enum_trim_specifications_value_status" DEFAULT 'known' NOT NULL,
  	"number_value" numeric,
  	"text_value" varchar,
  	"boolean_value" "enum_trim_specifications_boolean_value",
  	"option_value" varchar,
  	"source_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "media_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "brands_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "vehicle_models_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "generations_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "trims_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "specification_definitions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "trim_specifications_id" integer;
  ALTER TABLE "brands" ADD CONSTRAINT "brands_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vehicle_models_rels" ADD CONSTRAINT "vehicle_models_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."vehicle_models"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vehicle_models_rels" ADD CONSTRAINT "vehicle_models_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "generations" ADD CONSTRAINT "generations_model_id_vehicle_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "generations_rels" ADD CONSTRAINT "generations_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "generations_rels" ADD CONSTRAINT "generations_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "trims" ADD CONSTRAINT "trims_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "trims_rels" ADD CONSTRAINT "trims_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."trims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "trims_rels" ADD CONSTRAINT "trims_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "specification_definitions_allowed_options" ADD CONSTRAINT "specification_definitions_allowed_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."specification_definitions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "trim_specifications" ADD CONSTRAINT "trim_specifications_trim_id_trims_id_fk" FOREIGN KEY ("trim_id") REFERENCES "public"."trims"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "trim_specifications" ADD CONSTRAINT "trim_specifications_definition_id_specification_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."specification_definitions"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "brands_slug_idx" ON "brands" USING btree ("slug");
  CREATE INDEX "brands_logo_idx" ON "brands" USING btree ("logo_id");
  CREATE INDEX "brands_updated_at_idx" ON "brands" USING btree ("updated_at");
  CREATE INDEX "brands_created_at_idx" ON "brands" USING btree ("created_at");
  CREATE INDEX "vehicle_models_brand_idx" ON "vehicle_models" USING btree ("brand_id");
  CREATE INDEX "vehicle_models_slug_idx" ON "vehicle_models" USING btree ("slug");
  CREATE UNIQUE INDEX "vehicle_models_identity_key_idx" ON "vehicle_models" USING btree ("identity_key");
  CREATE INDEX "vehicle_models_hero_image_idx" ON "vehicle_models" USING btree ("hero_image_id");
  CREATE INDEX "vehicle_models_updated_at_idx" ON "vehicle_models" USING btree ("updated_at");
  CREATE INDEX "vehicle_models_created_at_idx" ON "vehicle_models" USING btree ("created_at");
  CREATE INDEX "vehicle_models_rels_order_idx" ON "vehicle_models_rels" USING btree ("order");
  CREATE INDEX "vehicle_models_rels_parent_idx" ON "vehicle_models_rels" USING btree ("parent_id");
  CREATE INDEX "vehicle_models_rels_path_idx" ON "vehicle_models_rels" USING btree ("path");
  CREATE INDEX "vehicle_models_rels_media_id_idx" ON "vehicle_models_rels" USING btree ("media_id");
  CREATE INDEX "generations_model_idx" ON "generations" USING btree ("model_id");
  CREATE INDEX "generations_slug_idx" ON "generations" USING btree ("slug");
  CREATE UNIQUE INDEX "generations_identity_key_idx" ON "generations" USING btree ("identity_key");
  CREATE INDEX "generations_updated_at_idx" ON "generations" USING btree ("updated_at");
  CREATE INDEX "generations_created_at_idx" ON "generations" USING btree ("created_at");
  CREATE INDEX "generations_rels_order_idx" ON "generations_rels" USING btree ("order");
  CREATE INDEX "generations_rels_parent_idx" ON "generations_rels" USING btree ("parent_id");
  CREATE INDEX "generations_rels_path_idx" ON "generations_rels" USING btree ("path");
  CREATE INDEX "generations_rels_media_id_idx" ON "generations_rels" USING btree ("media_id");
  CREATE INDEX "trims_generation_idx" ON "trims" USING btree ("generation_id");
  CREATE INDEX "trims_slug_idx" ON "trims" USING btree ("slug");
  CREATE UNIQUE INDEX "trims_identity_key_idx" ON "trims" USING btree ("identity_key");
  CREATE INDEX "trims_body_style_idx" ON "trims" USING btree ("body_style");
  CREATE INDEX "trims_fuel_type_idx" ON "trims" USING btree ("fuel_type");
  CREATE INDEX "trims_transmission_idx" ON "trims" USING btree ("transmission");
  CREATE INDEX "trims_drive_type_idx" ON "trims" USING btree ("drive_type");
  CREATE INDEX "trims_updated_at_idx" ON "trims" USING btree ("updated_at");
  CREATE INDEX "trims_created_at_idx" ON "trims" USING btree ("created_at");
  CREATE INDEX "trims_rels_order_idx" ON "trims_rels" USING btree ("order");
  CREATE INDEX "trims_rels_parent_idx" ON "trims_rels" USING btree ("parent_id");
  CREATE INDEX "trims_rels_path_idx" ON "trims_rels" USING btree ("path");
  CREATE INDEX "trims_rels_media_id_idx" ON "trims_rels" USING btree ("media_id");
  CREATE INDEX "specification_definitions_allowed_options_order_idx" ON "specification_definitions_allowed_options" USING btree ("_order");
  CREATE INDEX "specification_definitions_allowed_options_parent_id_idx" ON "specification_definitions_allowed_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "specification_definitions_key_idx" ON "specification_definitions" USING btree ("key");
  CREATE INDEX "specification_definitions_category_idx" ON "specification_definitions" USING btree ("category");
  CREATE INDEX "specification_definitions_updated_at_idx" ON "specification_definitions" USING btree ("updated_at");
  CREATE INDEX "specification_definitions_created_at_idx" ON "specification_definitions" USING btree ("created_at");
  CREATE INDEX "trim_specifications_trim_idx" ON "trim_specifications" USING btree ("trim_id");
  CREATE INDEX "trim_specifications_definition_idx" ON "trim_specifications" USING btree ("definition_id");
  CREATE UNIQUE INDEX "trim_specifications_identity_key_idx" ON "trim_specifications" USING btree ("identity_key");
  CREATE INDEX "trim_specifications_value_status_idx" ON "trim_specifications" USING btree ("value_status");
  CREATE INDEX "trim_specifications_updated_at_idx" ON "trim_specifications" USING btree ("updated_at");
  CREATE INDEX "trim_specifications_created_at_idx" ON "trim_specifications" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vehicle_models_fk" FOREIGN KEY ("vehicle_models_id") REFERENCES "public"."vehicle_models"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_generations_fk" FOREIGN KEY ("generations_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_trims_fk" FOREIGN KEY ("trims_id") REFERENCES "public"."trims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_specification_definitions_fk" FOREIGN KEY ("specification_definitions_id") REFERENCES "public"."specification_definitions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_trim_specifications_fk" FOREIGN KEY ("trim_specifications_id") REFERENCES "public"."trim_specifications"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_brands_id_idx" ON "payload_locked_documents_rels" USING btree ("brands_id");
  CREATE INDEX "payload_locked_documents_rels_vehicle_models_id_idx" ON "payload_locked_documents_rels" USING btree ("vehicle_models_id");
  CREATE INDEX "payload_locked_documents_rels_generations_id_idx" ON "payload_locked_documents_rels" USING btree ("generations_id");
  CREATE INDEX "payload_locked_documents_rels_trims_id_idx" ON "payload_locked_documents_rels" USING btree ("trims_id");
  CREATE INDEX "payload_locked_documents_rels_specification_definitions__idx" ON "payload_locked_documents_rels" USING btree ("specification_definitions_id");
  CREATE INDEX "payload_locked_documents_rels_trim_specifications_id_idx" ON "payload_locked_documents_rels" USING btree ("trim_specifications_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "brands" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vehicle_models" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vehicle_models_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "generations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "generations_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "trims" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "trims_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "specification_definitions_allowed_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "specification_definitions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "trim_specifications" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "media" CASCADE;
  DROP TABLE "brands" CASCADE;
  DROP TABLE "vehicle_models" CASCADE;
  DROP TABLE "vehicle_models_rels" CASCADE;
  DROP TABLE "generations" CASCADE;
  DROP TABLE "generations_rels" CASCADE;
  DROP TABLE "trims" CASCADE;
  DROP TABLE "trims_rels" CASCADE;
  DROP TABLE "specification_definitions_allowed_options" CASCADE;
  DROP TABLE "specification_definitions" CASCADE;
  DROP TABLE "trim_specifications" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_media_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_brands_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_vehicle_models_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_generations_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_trims_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_specification_definitions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_trim_specifications_fk";
  
  DROP INDEX "payload_locked_documents_rels_media_id_idx";
  DROP INDEX "payload_locked_documents_rels_brands_id_idx";
  DROP INDEX "payload_locked_documents_rels_vehicle_models_id_idx";
  DROP INDEX "payload_locked_documents_rels_generations_id_idx";
  DROP INDEX "payload_locked_documents_rels_trims_id_idx";
  DROP INDEX "payload_locked_documents_rels_specification_definitions__idx";
  DROP INDEX "payload_locked_documents_rels_trim_specifications_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "media_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "brands_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "vehicle_models_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "generations_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "trims_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "specification_definitions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "trim_specifications_id";
  DROP TYPE "public"."enum_media_kind";
  DROP TYPE "public"."enum_trims_body_style";
  DROP TYPE "public"."enum_trims_fuel_type";
  DROP TYPE "public"."enum_trims_transmission";
  DROP TYPE "public"."enum_trims_drive_type";
  DROP TYPE "public"."enum_specification_definitions_category";
  DROP TYPE "public"."enum_specification_definitions_value_type";
  DROP TYPE "public"."enum_specification_definitions_unit";
  DROP TYPE "public"."enum_trim_specifications_value_status";
  DROP TYPE "public"."enum_trim_specifications_boolean_value";`)
}
