import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'data_editor', 'dealer_manager', 'dealer_agent');
  CREATE TYPE "public"."enum_users_status" AS ENUM('active', 'suspended');
  CREATE TYPE "public"."enum_dealer_organizations_status" AS ENUM('active', 'suspended');
  CREATE TYPE "public"."enum_audit_logs_actor_role" AS ENUM('admin', 'data_editor', 'dealer_manager', 'dealer_agent');
  CREATE TYPE "public"."enum_audit_logs_action" AS ENUM('create', 'update', 'delete');
  CREATE TABLE "dealer_organizations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"status" "enum_dealer_organizations_status" DEFAULT 'active' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "audit_logs_changed_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"field" varchar NOT NULL
  );
  
  CREATE TABLE "audit_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"actor_id" varchar,
  	"actor_email" varchar,
  	"actor_role" "enum_audit_logs_actor_role",
  	"dealer_organization_id" varchar,
  	"action" "enum_audit_logs_action" NOT NULL,
  	"target_collection" varchar NOT NULL,
  	"target_document_id" varchar NOT NULL,
  	"occurred_at" timestamp(3) with time zone NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "name" varchar;
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" NOT NULL;
  ALTER TABLE "users" ADD COLUMN "dealer_organization_id" integer;
  ALTER TABLE "users" ADD COLUMN "status" "enum_users_status" DEFAULT 'active' NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "dealer_organizations_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "audit_logs_id" integer;
  ALTER TABLE "audit_logs_changed_fields" ADD CONSTRAINT "audit_logs_changed_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "dealer_organizations_slug_idx" ON "dealer_organizations" USING btree ("slug");
  CREATE INDEX "dealer_organizations_status_idx" ON "dealer_organizations" USING btree ("status");
  CREATE INDEX "dealer_organizations_updated_at_idx" ON "dealer_organizations" USING btree ("updated_at");
  CREATE INDEX "dealer_organizations_created_at_idx" ON "dealer_organizations" USING btree ("created_at");
  CREATE INDEX "audit_logs_changed_fields_order_idx" ON "audit_logs_changed_fields" USING btree ("_order");
  CREATE INDEX "audit_logs_changed_fields_parent_id_idx" ON "audit_logs_changed_fields" USING btree ("_parent_id");
  CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");
  CREATE INDEX "audit_logs_target_collection_idx" ON "audit_logs" USING btree ("target_collection");
  CREATE INDEX "audit_logs_target_document_id_idx" ON "audit_logs" USING btree ("target_document_id");
  CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs" USING btree ("occurred_at");
  ALTER TABLE "users" ADD CONSTRAINT "users_dealer_organization_id_dealer_organizations_id_fk" FOREIGN KEY ("dealer_organization_id") REFERENCES "public"."dealer_organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_dealer_organizations_fk" FOREIGN KEY ("dealer_organizations_id") REFERENCES "public"."dealer_organizations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_logs_fk" FOREIGN KEY ("audit_logs_id") REFERENCES "public"."audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_role_idx" ON "users" USING btree ("role");
  CREATE INDEX "users_dealer_organization_idx" ON "users" USING btree ("dealer_organization_id");
  CREATE INDEX "users_status_idx" ON "users" USING btree ("status");
  CREATE INDEX "payload_locked_documents_rels_dealer_organizations_id_idx" ON "payload_locked_documents_rels" USING btree ("dealer_organizations_id");
  CREATE INDEX "payload_locked_documents_rels_audit_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_logs_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "dealer_organizations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "audit_logs_changed_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "audit_logs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "dealer_organizations" CASCADE;
  DROP TABLE "audit_logs_changed_fields" CASCADE;
  DROP TABLE "audit_logs" CASCADE;
  ALTER TABLE "users" DROP CONSTRAINT "users_dealer_organization_id_dealer_organizations_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_dealer_organizations_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_audit_logs_fk";
  
  DROP INDEX "users_role_idx";
  DROP INDEX "users_dealer_organization_idx";
  DROP INDEX "users_status_idx";
  DROP INDEX "payload_locked_documents_rels_dealer_organizations_id_idx";
  DROP INDEX "payload_locked_documents_rels_audit_logs_id_idx";
  ALTER TABLE "users" DROP COLUMN "name";
  ALTER TABLE "users" DROP COLUMN "role";
  ALTER TABLE "users" DROP COLUMN "dealer_organization_id";
  ALTER TABLE "users" DROP COLUMN "status";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "dealer_organizations_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "audit_logs_id";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_users_status";
  DROP TYPE "public"."enum_dealer_organizations_status";
  DROP TYPE "public"."enum_audit_logs_actor_role";
  DROP TYPE "public"."enum_audit_logs_action";`)
}
