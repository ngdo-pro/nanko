-- ==============================================================================
-- Migration de sécurité des rôles PostgreSQL (Spec 013)
-- Exécution :
--   psql -U nanko -d nanko -v app_pwd='...' -v kc_pwd='...' -v pl_pwd='...' -v bk_pwd='...' -f harden-roles.sql
-- ==============================================================================

-- 1. Création des rôles applicatifs dédiés
CREATE ROLE nanko_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'app_pwd';
CREATE ROLE keycloak  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'kc_pwd';
CREATE ROLE plausible LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'pl_pwd';
CREATE ROLE backup    LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'bk_pwd';
GRANT pg_read_all_data TO backup;

-- 2. Base nanko : fermeture par défaut puis ouverture nominative
REVOKE CONNECT ON DATABASE nanko FROM PUBLIC;
GRANT  CONNECT ON DATABASE nanko TO nanko_app, keycloak, backup;

-- 3. Schéma public -> nanko_app (PG16 : USAGE reste accordé à PUBLIC par défaut, on le retire)
REVOKE ALL ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO nanko_app;
GRANT ALL ON SCHEMA public TO nanko_app;
GRANT USAGE ON SCHEMA public TO backup;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO nanko_app', r.tablename);
  END LOOP;
  FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO nanko_app', r.sequencename);
  END LOOP;
END $$;

-- 4. Schéma keycloak -> keycloak
CREATE SCHEMA IF NOT EXISTS keycloak;
ALTER SCHEMA keycloak OWNER TO keycloak;
GRANT USAGE ON SCHEMA keycloak TO backup;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'keycloak' LOOP
    EXECUTE format('ALTER TABLE keycloak.%I OWNER TO keycloak', r.tablename);
  END LOOP;
  FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'keycloak' LOOP
    EXECUTE format('ALTER SEQUENCE keycloak.%I OWNER TO keycloak', r.sequencename);
  END LOOP;
END $$;
ALTER ROLE keycloak SET search_path = keycloak;

-- 5. Base plausible -> plausible (si la base existe sur cette instance)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_database WHERE datname = 'plausible') THEN
    EXECUTE 'REVOKE CONNECT ON DATABASE plausible FROM PUBLIC';
    EXECUTE 'ALTER DATABASE plausible OWNER TO plausible';
    EXECUTE 'GRANT CONNECT ON DATABASE plausible TO plausible, backup';
  END IF;
END $$;

-- Note : si la base plausible contenait déjà des tables, exécuter ensuite dans la base plausible :
-- psql -U nanko -d plausible -c "
--   REVOKE ALL ON SCHEMA public FROM PUBLIC;
--   ALTER SCHEMA public OWNER TO plausible;
--   GRANT ALL ON SCHEMA public TO plausible;
--   GRANT USAGE ON SCHEMA public TO backup;
--   DO \$\$ DECLARE r record; BEGIN
--     FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
--       EXECUTE format('ALTER TABLE public.%I OWNER TO plausible', r.tablename);
--     END LOOP;
--     FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' LOOP
--       EXECUTE format('ALTER SEQUENCE public.%I OWNER TO plausible', r.sequencename);
--     END LOOP;
--   END \$\$;
-- "
