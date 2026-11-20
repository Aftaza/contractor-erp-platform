-- CreateEnum
CREATE TYPE "Role" AS ENUM ('pimpinan', 'admin', 'staff_gudang');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('Aktif', 'Selesai', 'Ditunda', 'Dibatalkan');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('kontrak_payung', 'one_time');

-- CreateEnum
CREATE TYPE "RabStatus" AS ENUM ('draft', 'approved');

-- CreateEnum
CREATE TYPE "PublicCategory" AS ENUM ('Industri', 'Infrastruktur', 'Sipil', 'Gedung');

-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('section', 'subgroup', 'phase', 'item');

-- CreateEnum
CREATE TYPE "TerminType" AS ENUM ('dp', 'termin', 'pelunasan', 'retensi');

-- CreateEnum
CREATE TYPE "TerminStatus" AS ENUM ('Lunas', 'Belum Bayar', 'Terlambat', 'Sebagian');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('material', 'upah', 'transport', 'overhead', 'sewa_alat', 'lain_lain');

-- CreateEnum
CREATE TYPE "ToolStatus" AS ENUM ('tersedia', 'dipakai', 'maintenance', 'rusak');

-- CreateEnum
CREATE TYPE "ProjectToolApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('info', 'warning', 'success', 'danger');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "sector" TEXT,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "client_id" UUID,
    "location" TEXT NOT NULL,
    "contract_type" "ContractType" NOT NULL,
    "status" "ProjectStatus" NOT NULL,
    "progress" DECIMAL NOT NULL DEFAULT 0,
    "contract_value" BIGINT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "description" TEXT,
    "ppn_enabled" BOOLEAN NOT NULL DEFAULT false,
    "ppn_rate" DECIMAL NOT NULL DEFAULT 11,
    "rab_status" "RabStatus" NOT NULL DEFAULT 'draft',
    "rab_approved_by" UUID,
    "rab_approved_at" TIMESTAMPTZ,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "public_title" TEXT,
    "public_summary" TEXT,
    "public_category" "PublicCategory",
    "public_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rab_nodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "parent_id" UUID,
    "node_type" "NodeType" NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "volume" DECIMAL,
    "unit" TEXT,
    "material_price" BIGINT,
    "labor_price" BIGINT,
    "total" BIGINT,
    "progress_percent" DECIMAL NOT NULL DEFAULT 0,
    "is_purchased" BOOLEAN NOT NULL DEFAULT false,
    "purchased_amount" BIGINT,
    "purchased_date" DATE,
    "vendor_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rab_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "termins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TerminType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" "TerminStatus" NOT NULL,
    "due_date" DATE,
    "paid_date" DATE,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "termins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "expense_date" DATE NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "vendor_id" UUID,
    "receipt_url" TEXT,
    "notes" TEXT,
    "recorded_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tools" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "condition" TEXT,
    "status" "ToolStatus" NOT NULL DEFAULT 'tersedia',
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tools" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "tool_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "used_from" DATE,
    "used_to" DATE,
    "approval_status" "ProjectToolApprovalStatus" NOT NULL DEFAULT 'pending',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "recorded_by" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "user_email" TEXT,
    "user_role" TEXT,
    "action" TEXT NOT NULL,
    "table_name" TEXT,
    "record_id" UUID,
    "old_data" JSONB,
    "new_data" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "rab_nodes_project_idx" ON "rab_nodes"("project_id");

-- CreateIndex
CREATE INDEX "rab_nodes_parent_idx" ON "rab_nodes"("parent_id");

-- CreateIndex
CREATE INDEX "expenses_project_idx" ON "expenses"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "tools_code_key" ON "tools"("code");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_table_name_idx" ON "audit_logs"("table_name");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_rab_approved_by_fkey" FOREIGN KEY ("rab_approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rab_nodes" ADD CONSTRAINT "rab_nodes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rab_nodes" ADD CONSTRAINT "rab_nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "rab_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rab_nodes" ADD CONSTRAINT "rab_nodes_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "termins" ADD CONSTRAINT "termins_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "termins" ADD CONSTRAINT "termins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tools" ADD CONSTRAINT "tools_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tools" ADD CONSTRAINT "project_tools_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tools" ADD CONSTRAINT "project_tools_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tools" ADD CONSTRAINT "project_tools_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tools" ADD CONSTRAINT "project_tools_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===========================================================================
-- WP-02 — SQL tulis tangan (di luar generate Prisma): CHECK numerik,
-- integritas rab_nodes, trigger total, agregasi progress, audit trail.
-- Acuan: master plan §4.3, §4.4, §4.8; fase-0-fondasi.md WP-02.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- CHECK numerik (master §4.5, §4.3)
-- ---------------------------------------------------------------------------

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_amount_positive" CHECK ("amount" > 0);

ALTER TABLE "rab_nodes"
  ADD CONSTRAINT "rab_nodes_progress_percent_range" CHECK ("progress_percent" BETWEEN 0 AND 100);

-- ---------------------------------------------------------------------------
-- Integritas rab_nodes (master §4.3): item wajib volume+unit+minimal 1 harga;
-- node grup (section/subgroup/phase) dilarang punya field harga/progress/
-- pembelian. Satu CHECK dua cabang — cukup, tak perlu trigger terpisah untuk
-- ini karena Postgres mengevaluasi CHECK setelah trigger BEFORE selesai
-- memodifikasi baris (jadi `total` yang di-set trigger di bawah tetap ikut
-- tervalidasi).
-- ---------------------------------------------------------------------------

ALTER TABLE "rab_nodes"
  ADD CONSTRAINT "rab_nodes_item_vs_group_fields" CHECK (
    (
      "node_type" = 'item'
      AND "volume" IS NOT NULL
      AND "unit" IS NOT NULL
      AND ("material_price" IS NOT NULL OR "labor_price" IS NOT NULL)
    )
    OR
    (
      "node_type" <> 'item'
      AND "volume" IS NULL
      AND "unit" IS NULL
      AND "material_price" IS NULL
      AND "labor_price" IS NULL
      AND "total" IS NULL
      AND "progress_percent" = 0
      AND "is_purchased" = false
      AND "purchased_amount" IS NULL
      AND "purchased_date" IS NULL
      AND "vendor_id" IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- Trigger: total = (COALESCE(material,0) + COALESCE(labor,0)) * volume
-- (master §4.3). Selalu dihitung ulang oleh DB pada setiap INSERT/UPDATE —
-- aplikasi tak pernah menghitungnya, dan tak bisa mem-bypass dengan menulis
-- kolom `total` langsung. Dibulatkan ke rupiah terdekat karena kolom
-- `total` bertipe BIGINT (dibekukan WP-00) sedangkan `volume` desimal.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rab_node_set_total() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."node_type" = 'item' THEN
    NEW."total" := ROUND(
      (COALESCE(NEW."material_price", 0) + COALESCE(NEW."labor_price", 0)) * NEW."volume"
    )::bigint;
  ELSE
    NEW."total" := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER rab_node_set_total_trg
BEFORE INSERT OR UPDATE ON "rab_nodes"
FOR EACH ROW EXECUTE FUNCTION rab_node_set_total();

-- ---------------------------------------------------------------------------
-- Agregasi progress (master §4.4): recompute_project_progress(project_id).
-- Value-weighted: progress_induk = Σ(child_total × child_progress) / Σ(child_total),
-- naik sampai root, cache ke projects.progress. HANYA aktif saat
-- projects.rab_status = 'approved' — draft tak memengaruhi progress.
--
-- Catatan implementasi: recursive CTE murni Postgres hanya berjalan
-- top-down (parent → child), sementara agregasi value-weighted butuh
-- bottom-up (leaf → root, kedalaman bervariasi per master §4.3 &
-- rab-format-analysis.md §3). Solusi: recursive CTE menghitung depth tiap
-- node (top-down), lalu tabel temp diagregasi per level dari depth
-- terdalam ke root (bottom-up) dalam loop PL/pgSQL. ~200 node × ≤4 level
-- = beberapa query set-based, bukan iterasi per-baris.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION recompute_project_progress(p_project_id uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_rab_status text;
  v_max_depth int;
  v_depth int;
  v_root_progress numeric;
BEGIN
  SELECT "rab_status"::text INTO v_rab_status FROM "projects" WHERE "id" = p_project_id;

  IF v_rab_status IS DISTINCT FROM 'approved' THEN
    RETURN;
  END IF;

  -- Guard to_regclass, bukan CREATE TEMP TABLE IF NOT EXISTS: varian IF NOT
  -- EXISTS memuntahkan NOTICE tiap pemanggilan (ratusan baris log saat impor
  -- RAB massal). Efeknya sama, lognya bersih.
  IF to_regclass('pg_temp._rab_progress_calc') IS NULL THEN
    CREATE TEMP TABLE _rab_progress_calc (
      id uuid PRIMARY KEY,
      parent_id uuid,
      depth int,
      node_total numeric,
      node_progress numeric
    ) ON COMMIT DROP;
  ELSE
    TRUNCATE _rab_progress_calc;
  END IF;

  WITH RECURSIVE tree AS (
    SELECT "id", "parent_id", 0 AS depth
    FROM "rab_nodes"
    WHERE "project_id" = p_project_id AND "parent_id" IS NULL
    UNION ALL
    SELECT rn."id", rn."parent_id", tree.depth + 1
    FROM "rab_nodes" rn
    JOIN tree ON rn."parent_id" = tree."id"
    WHERE rn."project_id" = p_project_id
  )
  INSERT INTO _rab_progress_calc (id, parent_id, depth, node_total, node_progress)
  SELECT
    t."id", t."parent_id", t.depth,
    CASE WHEN rn."node_type" = 'item' THEN COALESCE(rn."total", 0)::numeric ELSE 0 END,
    CASE WHEN rn."node_type" = 'item' THEN rn."progress_percent" ELSE 0 END
  FROM tree t
  JOIN "rab_nodes" rn ON rn."id" = t."id";

  SELECT max(depth) INTO v_max_depth FROM _rab_progress_calc;

  IF v_max_depth IS NULL THEN
    UPDATE "projects" SET "progress" = 0 WHERE "id" = p_project_id;
    RETURN;
  END IF;

  FOR v_depth IN REVERSE v_max_depth..0 LOOP
    UPDATE _rab_progress_calc c
    SET node_total = agg.sum_total,
        node_progress = CASE WHEN agg.sum_total > 0 THEN agg.weighted / agg.sum_total ELSE 0 END
    FROM (
      SELECT parent_id, SUM(node_total) AS sum_total, SUM(node_total * node_progress) AS weighted
      FROM _rab_progress_calc
      WHERE depth = v_depth + 1
      GROUP BY parent_id
    ) agg
    WHERE c.id = agg.parent_id AND c.depth = v_depth;
  END LOOP;

  SELECT COALESCE(SUM(node_total * node_progress) / NULLIF(SUM(node_total), 0), 0)
  INTO v_root_progress
  FROM _rab_progress_calc
  WHERE depth = 0;

  UPDATE "projects" SET "progress" = ROUND(v_root_progress, 2) WHERE "id" = p_project_id;
END;
$$;

-- Trigger di rab_nodes: INSERT / UPDATE / DELETE (master §4.4). Unconditional
-- (tak difilter per-kolom) — lebih sederhana & aman daripada mendaftar tiap
-- kolom yang memengaruhi total/progress secara transitif; biaya ekstra
-- recompute pada ubahan tak relevan (mis. rename) dapat diabaikan di skala
-- ~200 node. (ponytail: revisit dengan filter kolom kalau volume tulis jadi tinggi.)

CREATE OR REPLACE FUNCTION rab_node_trigger_recompute_progress() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_project_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD."project_id";
  ELSE
    v_project_id := NEW."project_id";
  END IF;
  PERFORM recompute_project_progress(v_project_id);
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER rab_node_recompute_progress_trg
AFTER INSERT OR UPDATE OR DELETE ON "rab_nodes"
FOR EACH ROW EXECUTE FUNCTION rab_node_trigger_recompute_progress();

-- Saat RAB baru saja di-approve (draft → approved), pohon yang sudah ada
-- harus langsung terhitung — bukan menunggu mutasi rab_nodes berikutnya.
-- Tak diminta eksplisit oleh master §4.4, tapi tanpa ini progress macet di 0
-- tepat setelah approve. Keputusan default WP-02.

CREATE OR REPLACE FUNCTION project_trigger_recompute_on_approve() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."rab_status" = 'approved' AND OLD."rab_status" IS DISTINCT FROM 'approved' THEN
    PERFORM recompute_project_progress(NEW."id");
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_recompute_on_approve_trg
AFTER UPDATE OF "rab_status" ON "projects"
FOR EACH ROW EXECUTE FUNCTION project_trigger_recompute_on_approve();

-- ---------------------------------------------------------------------------
-- Audit trail (master §5.3, §4.4 catatan sinkronisasi): audit_trigger_fn()
-- pakai current_setting('app.user_id', true)::uuid — BUKAN auth.uid()
-- (GoTrue sudah tak ada). Dipasang di tabel inti (bukan refresh_tokens,
-- notifications, atau audit_logs sendiri — hindari loop & noise housekeeping).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION audit_trigger_fn() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_user_role text;
  v_ip text;
BEGIN
  BEGIN
    v_user_id := NULLIF(current_setting('app.user_id', true), '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  v_ip := NULLIF(current_setting('app.client_ip', true), '');

  IF v_user_id IS NOT NULL THEN
    SELECT "email", "role"::text INTO v_user_email, v_user_role FROM "users" WHERE "id" = v_user_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO "audit_logs" ("user_id", "user_email", "user_role", "action", "table_name", "record_id", "old_data", "new_data", "ip_address")
    VALUES (v_user_id, v_user_email, v_user_role, TG_OP, TG_TABLE_NAME, OLD."id", to_jsonb(OLD), NULL, v_ip);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO "audit_logs" ("user_id", "user_email", "user_role", "action", "table_name", "record_id", "old_data", "new_data", "ip_address")
    VALUES (v_user_id, v_user_email, v_user_role, TG_OP, TG_TABLE_NAME, NEW."id", to_jsonb(OLD), to_jsonb(NEW), v_ip);
    RETURN NEW;
  ELSE
    INSERT INTO "audit_logs" ("user_id", "user_email", "user_role", "action", "table_name", "record_id", "old_data", "new_data", "ip_address")
    VALUES (v_user_id, v_user_email, v_user_role, TG_OP, TG_TABLE_NAME, NEW."id", NULL, to_jsonb(NEW), v_ip);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER users_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "users" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER clients_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "clients" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER vendors_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "vendors" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER projects_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "projects" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER rab_nodes_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "rab_nodes" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER termins_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "termins" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER expenses_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "expenses" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER tools_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "tools" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER project_tools_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "project_tools" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
