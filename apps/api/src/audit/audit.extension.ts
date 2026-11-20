// acme-backend/src/audit/audit.extension.ts
//
// Prisma client extension (WP-05, master §5.3): membungkus SETIAP mutasi
// pada 9 tabel yang dipasangi `audit_trigger_fn()` (WP-02) dalam satu
// transaksi yang diawali `SET LOCAL app.user_id` + `app.client_ip`.
//
// Postgres tak menerima parameter bind pada `SET LOCAL nama = $1` (nilai
// SET harus literal). `select set_config(name, value, is_local)` adalah
// FUNGSI biasa — bisa dipanggil dengan parameter ter-bind (aman dari SQL
// injection, master §10 "query lewat Prisma, parameterized") dan `is_local
// = true` perilakunya IDENTIK dengan `SET LOCAL`: nilainya otomatis
// hilang saat transaksi COMMIT/ROLLBACK (dijamin Postgres sendiri, bukan
// kode kita) — inilah yang mencegah `app.user_id` bocor ke request lain
// lewat connection pool.
//
// `SET LOCAL`/`set_config` HANYA berlaku dalam transaksi yang sama. Dicoba
// lebih dulu bentuk `$transaction([setUser, setIp, query(args)])` (array) —
// TERBUKTI SALAH secara empiris (db-spec awal): `query(args)` dari dalam
// extension tak selalu ikut batch array yang sama, jadi operasi tulisnya
// lolos DI LUAR transaksi yang sudah di-`SET LOCAL`, dan trigger membaca
// `app.user_id` kosong. Dipakai bentuk INTERAKTIF (`$transaction(async tx =>
// ...)`) sebagai gantinya — satu koneksi terjamin dipakai untuk ketiga
// pernyataan karena semuanya dipanggil eksplisit lewat `tx` yang sama.
import { Prisma, PrismaClient } from '@prisma/client';
import { auditContextStorage } from './audit-context';

function uncapitalize(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

/** Tabel ber-`audit_trigger_fn()` yang ditulis lewat Prisma — model tak terdaftar tercatat `user_id` NULL. */
const AUDITED_MODELS = new Set([
  'User',
  'Client',
  'Vendor',
  'Project',
  'RabNode',
  'Termin',
  'TerminPayment',
  'Expense',
  'Tool',
  'ProjectTool',
  'Document',
  'DocumentFile',
  'PurchaseNote', // trigger audit W0-05; mutasi via nested write ikut transaksi PurchaseNote
  'PurchaseLine',
]);

/** Operasi Prisma yang benar-benar menulis (trigger hanya jalan di INSERT/UPDATE/DELETE). */
const MUTATING_OPERATIONS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
  'delete',
  'deleteMany',
]);

/**
 * `SET LOCAL app.user_id` + `app.client_ip` dari konteks request untuk
 * transaksi `tx`. Juga dipakai transaksi raw SQL (soft delete berkaskade,
 * src/trash/soft-delete.ts) yang tak lewat extension di bawah.
 */
export async function setAuditContext(
  tx: Prisma.TransactionClient,
): Promise<void> {
  // Kosong (bukan meledak) kalau di luar konteks request HTTP —
  // seed/migration/cron tak pernah men-set context ini (DoD WP-05).
  const ctx = auditContextStorage.getStore();
  await tx.$executeRaw`SELECT set_config('app.user_id', ${ctx?.userId ?? ''}, true)`;
  await tx.$executeRaw`SELECT set_config('app.client_ip', ${ctx?.clientIp ?? ''}, true)`;
}

/**
 * Bungkus `client` (instance PrismaClient) dengan extension audit. Dipanggil
 * dari `PrismaService` (src/prisma/prisma.service.ts, WP-02 mengizinkan
 * WP-05 memperluas file itu untuk memasang extension ini).
 *
 * Komponen `client.onModuleInit`/`onModuleDestroy` sengaja ditambahkan di
 * sini (bukan cuma di class PrismaService) karena PrismaService me-return
 * OBJEK HASIL `$extends` dari constructor-nya (lihat komentar di
 * prisma.service.ts) — objek itu tak mewarisi method di prototype
 * PrismaService, jadi Nest butuh method lifecycle ini menempel langsung
 * di objek yang benar-benar di-resolve DI container.
 */
export function withAuditExtension<T extends PrismaClient>(client: T) {
  return client.$extends({
    name: 'audit-context',
    client: {
      async onModuleInit(this: PrismaClient) {
        await this.$connect();
      },
      async onModuleDestroy(this: PrismaClient) {
        await this.$disconnect();
      },
    },
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !AUDITED_MODELS.has(model)) return query(args);
          if (!MUTATING_OPERATIONS.has(operation)) return query(args);

          const delegate = uncapitalize(model);

          return client.$transaction(async (tx) => {
            await setAuditContext(tx);
            const txClient = tx as unknown as Record<
              string,
              Record<string, (a: unknown) => Promise<unknown>>
            >;
            return txClient[delegate][operation](args);
          });
        },
      },
    },
  });
}

export type AuditedPrismaClient = ReturnType<typeof withAuditExtension>;
