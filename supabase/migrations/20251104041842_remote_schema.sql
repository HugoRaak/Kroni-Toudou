


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."mode_type" AS ENUM (
    'Tous',
    'Présentiel',
    'Distanciel'
);


ALTER TYPE "public"."mode_type" OWNER TO "postgres";


CREATE TYPE "public"."periodic_frequency" AS ENUM (
    'quotidien',
    'hebdomadaire',
    'mensuel'
);


ALTER TYPE "public"."periodic_frequency" OWNER TO "postgres";


CREATE TYPE "public"."weekday" AS ENUM (
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi',
    'Dimanche'
);


ALTER TYPE "public"."weekday" OWNER TO "postgres";


CREATE TYPE "public"."work_mode" AS ENUM (
    'Présentiel',
    'Distanciel',
    'Congé'
);


ALTER TYPE "public"."work_mode" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."licences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "active" boolean DEFAULT true,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "user_id" "uuid"
);


ALTER TABLE "public"."licences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "frequency" "public"."periodic_frequency",
    "day" "public"."weekday",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "due_on" "date",
    "in_progress" boolean,
    "postponed_days" integer,
    "mode" "public"."mode_type" DEFAULT 'Tous'::"public"."mode_type" NOT NULL
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workdays" (
    "user_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "work_mode" "public"."work_mode" DEFAULT 'Présentiel'::"public"."work_mode" NOT NULL
);


ALTER TABLE "public"."workdays" OWNER TO "postgres";


ALTER TABLE ONLY "public"."licences"
    ADD CONSTRAINT "licences_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."licences"
    ADD CONSTRAINT "licences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "periodics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workdays"
    ADD CONSTRAINT "workdays_pk" PRIMARY KEY ("user_id", "work_date");



CREATE INDEX "licences_user_id_idx" ON "public"."licences" USING "btree" ("user_id");



CREATE INDEX "tasks_user_id_updated_at_idx" ON "public"."tasks" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "workdays_user_id_work_date_idx" ON "public"."workdays" USING "btree" ("user_id", "work_date");



CREATE OR REPLACE TRIGGER "trg_periodics_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_workdays_updated_at" BEFORE UPDATE ON "public"."workdays" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."licences"
    ADD CONSTRAINT "licences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "periodics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workdays"
    ADD CONSTRAINT "workdays_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow public read for license validation" ON "public"."licences" FOR SELECT USING (true);



CREATE POLICY "Allow users to associate license to themselves" ON "public"."licences" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND ("user_id" IS NULL) AND (("active" IS NULL) OR ("active" = true)) AND (("expires_at" IS NULL) OR ("expires_at" > "now"())))) WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."licences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "periodics: own" ON "public"."tasks" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workdays" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workdays_delete_own" ON "public"."workdays" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "workdays_read_own" ON "public"."workdays" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "workdays_update_own" ON "public"."workdays" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "workdays_write_own" ON "public"."workdays" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."licences" TO "anon";
GRANT ALL ON TABLE "public"."licences" TO "authenticated";
GRANT ALL ON TABLE "public"."licences" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."workdays" TO "anon";
GRANT ALL ON TABLE "public"."workdays" TO "authenticated";
GRANT ALL ON TABLE "public"."workdays" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


