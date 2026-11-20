-- W0-05 — migrasi skema gelombang 1 (SRS §6 blok "Tambahan", FR-DEL-1/2/5,
-- FR-MD-3/4, FR-NTF-3, FR-FIN-1/3, FR-PRJ-3/4/5/6, FR-DOC-1/2/8, FR-INT-1/2,
-- FR-AUTH-5, FR-RAB-7/9). Expand-only (REL-6): tak ada kolom yang dihapus atau
-- diganti tipe — `rab_nodes.is_purchased/purchased_*/vendor_id`,
-- `expenses.receipt_url`, `notifications.type/is_read`, `termins.status`, dan
-- `projects.public_images text[]` dibereskan bersama kode penggantinya (W1-*).
-- Bagian atas = DDL hasil `prisma migrate diff`; bagian bawah = SQL tulis tangan.

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('tender', 'kontrak', 'bast', 'invoice', 'k3', 'gambar', 'legalitas', 'lainnya', 'bukti');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProjectToolApprovalStatus" ADD VALUE 'cancelled';
ALTER TYPE "ProjectToolApprovalStatus" ADD VALUE 'handed_over';
ALTER TYPE "ProjectToolApprovalStatus" ADD VALUE 'returned';

-- DropIndex
DROP INDEX "tools_code_key";

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "code" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMPTZ,
ADD COLUMN     "deleted_by" UUID,
ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logo_path" TEXT;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "deleted_at" TIMESTAMPTZ,
ADD COLUMN     "deleted_by" UUID,
ADD COLUMN     "receipt_document_id" UUID;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "entity_id" UUID,
ADD COLUMN     "entity_type" TEXT,
ADD COLUMN     "event" TEXT,
ADD COLUMN     "read_at" TIMESTAMPTZ,
ADD COLUMN     "severity" "NotificationType" NOT NULL DEFAULT 'info';

-- AlterTable
ALTER TABLE "project_tools" ADD COLUMN     "handed_over_at" TIMESTAMPTZ,
ADD COLUMN     "handed_over_by" UUID,
ADD COLUMN     "handed_over_to" TEXT,
ADD COLUMN     "handover_condition" TEXT,
ADD COLUMN     "reject_reason" TEXT,
ADD COLUMN     "requested_by" UUID,
ADD COLUMN     "return_condition" TEXT,
ADD COLUMN     "returned_at" TIMESTAMPTZ,
ADD COLUMN     "returned_by" UUID;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "actual_end_date" DATE,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "contract_value_initial" BIGINT,
ADD COLUMN     "deleted_at" TIMESTAMPTZ,
ADD COLUMN     "deleted_by" UUID,
ADD COLUMN     "parent_id" UUID,
ADD COLUMN     "period_label" TEXT,
ADD COLUMN     "public_slug" TEXT,
ADD COLUMN     "review_requested_at" TIMESTAMPTZ,
ADD COLUMN     "status_reason" TEXT,
ADD COLUMN     "sub_project_seq" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "rab_nodes" ADD COLUMN     "deleted_at" TIMESTAMPTZ,
ADD COLUMN     "deleted_by" UUID;

-- AlterTable
ALTER TABLE "termins" ADD COLUMN     "deleted_at" TIMESTAMPTZ,
ADD COLUMN     "deleted_by" UUID;

-- AlterTable
ALTER TABLE "tools" ADD COLUMN     "deleted_at" TIMESTAMPTZ,
ADD COLUMN     "deleted_by" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failed_login_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "deleted_at" TIMESTAMPTZ,
ADD COLUMN     "deleted_by" UUID;

-- CreateTable
CREATE TABLE "termin_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "termin_id" UUID NOT NULL,
    "payment_date" DATE NOT NULL,
    "amount" BIGINT NOT NULL,
    "receipt_document_id" UUID,
    "notes" TEXT,
    "recorded_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "termin_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "vendor_id" UUID,
    "note_number" TEXT,
    "note_date" DATE NOT NULL,
    "receipt_document_id" UUID,
    "notes" TEXT,
    "recorded_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "purchase_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_note_id" UUID NOT NULL,
    "rab_node_id" UUID NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unit_price" BIGINT NOT NULL,
    "subtotal" BIGINT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "purchase_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rab_progress_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rab_node_id" UUID NOT NULL,
    "old_progress" DECIMAL NOT NULL,
    "new_progress" DECIMAL NOT NULL,
    "progress_date" DATE NOT NULL,
    "notes" TEXT,
    "recorded_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rab_progress_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_progress_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "progress" DECIMAL NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_progress_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rab_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "total" BIGINT NOT NULL,
    "reason" TEXT,
    "addendum_number" TEXT,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rab_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_addenda" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "addendum_date" DATE NOT NULL,
    "contract_value" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "document_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "project_addenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "project_id" UUID,
    "notes" TEXT,
    "valid_until" DATE,
    "uploaded_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "sha256" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "document_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "termin_payments_termin_idx" ON "termin_payments"("termin_id");

-- CreateIndex
CREATE INDEX "purchase_notes_project_idx" ON "purchase_notes"("project_id");

-- CreateIndex
CREATE INDEX "purchase_lines_note_idx" ON "purchase_lines"("purchase_note_id");

-- CreateIndex
CREATE INDEX "purchase_lines_rab_node_idx" ON "purchase_lines"("rab_node_id");

-- CreateIndex
CREATE INDEX "rab_progress_logs_rab_node_idx" ON "rab_progress_logs"("rab_node_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_progress_snapshots_project_date_key" ON "project_progress_snapshots"("project_id", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "rab_versions_project_version_key" ON "rab_versions"("project_id", "version_no");

-- CreateIndex
CREATE INDEX "project_addenda_project_idx" ON "project_addenda"("project_id");

-- CreateIndex
CREATE INDEX "documents_project_idx" ON "documents"("project_id");

-- CreateIndex
CREATE INDEX "document_files_document_idx" ON "document_files"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "clients_code_key" ON "clients"("code");

-- CreateIndex
CREATE INDEX "notifications_user_read_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "projects_public_slug_key" ON "projects"("public_slug");

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

-- CreateIndex
CREATE INDEX "projects_parent_idx" ON "projects"("parent_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_receipt_document_id_fkey" FOREIGN KEY ("receipt_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tools" ADD CONSTRAINT "project_tools_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tools" ADD CONSTRAINT "project_tools_handed_over_by_fkey" FOREIGN KEY ("handed_over_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tools" ADD CONSTRAINT "project_tools_returned_by_fkey" FOREIGN KEY ("returned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "termin_payments" ADD CONSTRAINT "termin_payments_termin_id_fkey" FOREIGN KEY ("termin_id") REFERENCES "termins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "termin_payments" ADD CONSTRAINT "termin_payments_receipt_document_id_fkey" FOREIGN KEY ("receipt_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "termin_payments" ADD CONSTRAINT "termin_payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_notes" ADD CONSTRAINT "purchase_notes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_notes" ADD CONSTRAINT "purchase_notes_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_notes" ADD CONSTRAINT "purchase_notes_receipt_document_id_fkey" FOREIGN KEY ("receipt_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_notes" ADD CONSTRAINT "purchase_notes_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_purchase_note_id_fkey" FOREIGN KEY ("purchase_note_id") REFERENCES "purchase_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_rab_node_id_fkey" FOREIGN KEY ("rab_node_id") REFERENCES "rab_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rab_progress_logs" ADD CONSTRAINT "rab_progress_logs_rab_node_id_fkey" FOREIGN KEY ("rab_node_id") REFERENCES "rab_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rab_progress_logs" ADD CONSTRAINT "rab_progress_logs_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_progress_snapshots" ADD CONSTRAINT "project_progress_snapshots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rab_versions" ADD CONSTRAINT "rab_versions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rab_versions" ADD CONSTRAINT "rab_versions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_addenda" ADD CONSTRAINT "project_addenda_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_addenda" ADD CONSTRAINT "project_addenda_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_addenda" ADD CONSTRAINT "project_addenda_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ===========================================================================
-- SQL tulis tangan (di luar generate Prisma)
-- ===========================================================================

-- Kemiripan teks pengeluaran vs item RAB (FR-FIN-7).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- FR-DEL-5: kode alat unik hanya di antara baris aktif. Pelanggaran tetap
-- SQLSTATE 23505 → Prisma P2002, jadi pemetaan error di ToolsService tak berubah.
CREATE UNIQUE INDEX "tools_code_active_key" ON "tools"("code") WHERE "deleted_at" IS NULL;

-- ---------------------------------------------------------------------------
-- CHECK (kolom baru → semua baris lama NULL/default, validasi instan)
-- ---------------------------------------------------------------------------
ALTER TABLE "clients" ADD CONSTRAINT "clients_code_format" CHECK ("code" ~ '^[A-Z0-9]{2,6}$');
ALTER TABLE "projects" ADD CONSTRAINT "projects_parent_not_self" CHECK ("parent_id" <> "id");
ALTER TABLE "projects" ADD CONSTRAINT "projects_sub_project_seq_range" CHECK ("sub_project_seq" BETWEEN 0 AND 9999);
ALTER TABLE "users" ADD CONSTRAINT "users_failed_login_count_nonneg" CHECK ("failed_login_count" >= 0);
ALTER TABLE "termin_payments" ADD CONSTRAINT "termin_payments_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_unit_price_nonneg" CHECK ("unit_price" >= 0);
ALTER TABLE "project_addenda" ADD CONSTRAINT "project_addenda_contract_value_nonneg" CHECK ("contract_value" >= 0);
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_size_positive" CHECK ("size" > 0);
ALTER TABLE "rab_progress_logs" ADD CONSTRAINT "rab_progress_logs_range"
  CHECK ("old_progress" BETWEEN 0 AND 100 AND "new_progress" BETWEEN 0 AND 100);
ALTER TABLE "project_progress_snapshots" ADD CONSTRAINT "project_progress_snapshots_range" CHECK ("progress" BETWEEN 0 AND 100);
ALTER TABLE "rab_versions" ADD CONSTRAINT "rab_versions_version_no_positive" CHECK ("version_no" >= 1);

-- ---------------------------------------------------------------------------
-- Backfill kolom pengganti (kolom lama tetap diisi kode lama sampai W1-*)
-- ---------------------------------------------------------------------------
UPDATE "notifications"
SET "severity" = "type",
    "read_at" = CASE WHEN "is_read" THEN "created_at" END;

-- Belum ada addendum mana pun → nilai awal = nilai kontrak sekarang (FR-PRJ-5).
UPDATE "projects" SET "contract_value_initial" = "contract_value" WHERE "contract_value_initial" IS NULL;

-- ---------------------------------------------------------------------------
-- purchase_lines: node harus `item` dari proyek nota yang sama (SRS §6 —
-- CHECK lintas tabel tak mungkin, jadi trigger), dan subtotal selalu di-set DB
-- seperti rab_nodes.total.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION purchase_line_validate_set_subtotal() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "rab_nodes" rn
    JOIN "purchase_notes" pn ON pn."id" = NEW."purchase_note_id"
    WHERE rn."id" = NEW."rab_node_id"
      AND rn."node_type" = 'item'
      AND rn."project_id" = pn."project_id"
      AND (rn."deleted_at" IS NULL OR NEW."deleted_at" IS NOT NULL) -- baris yang ikut dihapus boleh menunjuk node terhapus (kaskade FR-DEL-3)
  ) THEN
    RAISE EXCEPTION 'purchase_lines: node % bukan item RAB aktif dari proyek nota yang sama', NEW."rab_node_id"
      USING ERRCODE = 'check_violation';
  END IF;
  NEW."subtotal" := ROUND(NEW."quantity" * NEW."unit_price")::bigint;
  RETURN NEW;
END;
$$;

CREATE TRIGGER purchase_line_validate_set_subtotal_trg
BEFORE INSERT OR UPDATE ON "purchase_lines"
FOR EACH ROW EXECUTE FUNCTION purchase_line_validate_set_subtotal();

-- Memindah nota berbaris ke proyek lain memutus syarat "node dari proyek yang
-- sama" di atas tanpa terdeteksi → tolak.
CREATE OR REPLACE FUNCTION purchase_note_lock_project() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."project_id" IS DISTINCT FROM OLD."project_id"
     AND EXISTS (SELECT 1 FROM "purchase_lines" WHERE "purchase_note_id" = OLD."id") THEN
    RAISE EXCEPTION 'purchase_notes: proyek nota % tak bisa diubah karena sudah punya baris', OLD."id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER purchase_note_lock_project_trg
BEFORE UPDATE OF "project_id" ON "purchase_notes"
FOR EACH ROW EXECUTE FUNCTION purchase_note_lock_project();

-- ---------------------------------------------------------------------------
-- FR-DEL-2: agregasi progress mengabaikan node terhapus. Sama persis dengan
-- versi init kecuali dua filter `deleted_at IS NULL` di CTE — node grup yang
-- terhapus otomatis memutus seluruh turunannya (rekursi tak menembusnya).
-- Soft delete = UPDATE deleted_at → trigger rab_node_recompute_progress_trg
-- (unconditional) sudah memanggil fungsi ini.
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
    WHERE "project_id" = p_project_id AND "parent_id" IS NULL AND "deleted_at" IS NULL
    UNION ALL
    SELECT rn."id", rn."parent_id", tree.depth + 1
    FROM "rab_nodes" rn
    JOIN tree ON rn."parent_id" = tree."id"
    WHERE rn."project_id" = p_project_id AND rn."deleted_at" IS NULL
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

-- ---------------------------------------------------------------------------
-- Audit trail untuk semua tabel baru (SRS §6). Semua punya PK uuid "id",
-- syarat audit_trigger_fn(). Soft delete/pulihkan = UPDATE deleted_at →
-- ikut tercatat (FR-DEL-8).
-- ---------------------------------------------------------------------------
CREATE TRIGGER termin_payments_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "termin_payments" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER purchase_notes_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "purchase_notes" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER purchase_lines_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "purchase_lines" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER rab_progress_logs_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "rab_progress_logs" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER project_progress_snapshots_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "project_progress_snapshots" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER rab_versions_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "rab_versions" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER project_addenda_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "project_addenda" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER documents_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "documents" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER document_files_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "document_files" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER settings_audit_trg AFTER INSERT OR UPDATE OR DELETE ON "settings" FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
