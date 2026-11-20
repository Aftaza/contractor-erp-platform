-- Role DB (SRS INF-4). Idempoten; jalankan sebagai superuser DB:
--   psql -v ON_ERROR_STOP=1 -v app_pw=... -v migrate_pw=... -v dbname=acme -f roles.sql
-- acme_migrate = pemilik tabel (DDL, dipakai `prisma migrate deploy`);
-- acme_app = DML saja, bukan pemilik -> tak bisa ALTER/DISABLE TRIGGER (trigger audit aman).
SELECT format('CREATE ROLE %I LOGIN', r) FROM (VALUES ('acme_app'), ('acme_migrate')) v(r)
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) \gexec
ALTER ROLE acme_app PASSWORD :'app_pw';
ALTER ROLE acme_migrate PASSWORD :'migrate_pw';

SELECT format('GRANT CONNECT, TEMPORARY ON DATABASE %I TO acme_app', :'dbname') \gexec
-- CREATE di DB: migrasi memakai CREATE EXTENSION pg_trgm (extension "trusted").
SELECT format('GRANT CONNECT, CREATE ON DATABASE %I TO acme_migrate', :'dbname') \gexec
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'dbname') \gexec

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO acme_migrate;
GRANT USAGE ON SCHEMA public TO acme_app;

-- TEMPORARY: recompute_project_progress() membuat TEMP TABLE sebagai pemanggil.

-- Tabel/sequence yang sudah ada (re-run) ...
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO acme_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO acme_app;
-- ... dan yang dibuat migrasi mendatang oleh acme_migrate.
ALTER DEFAULT PRIVILEGES FOR ROLE acme_migrate IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO acme_app;
ALTER DEFAULT PRIVILEGES FOR ROLE acme_migrate IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO acme_app;

-- Append-only: acme_app hanya boleh SELECT/INSERT (trigger audit meng-INSERT) pada audit_logs,
-- dan hanya SELECT pada _prisma_migrations. Default privileges memberi hak penuh pada tabel
-- BARU, jadi file ini WAJIB dijalankan ulang SETELAH `prisma migrate deploy` (langkah deploy, W4-04).
DO $$ BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM acme_app;
  END IF;
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public._prisma_migrations FROM acme_app;
  END IF;
END $$;
