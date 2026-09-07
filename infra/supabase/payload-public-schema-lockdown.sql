-- AgenAuto Payload on Supabase
--
-- Payload remains the application/API authorization boundary. Supabase exposes the
-- public schema through PostgREST, so every Payload-owned table must have RLS
-- enabled with no public policies. The server-side Payload database owner/privileged
-- connection is expected to bypass RLS.
--
-- Run this after applying Payload migrations to a Supabase environment.

DO $$
DECLARE
  table_record record;
BEGIN
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      table_record.tablename
    );
  END LOOP;
END $$;
