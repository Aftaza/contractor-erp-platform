// acme-backend/src/audit/audit-context.ts
//
// Konteks per-request (user id + IP klien) dibawa lewat AsyncLocalStorage
// (stdlib Node `node:async_hooks`) — bukan lib pihak ketiga, mengalir
// otomatis lewat rantai async tanpa perlu diteruskan manual ke tiap service.
// Diisi oleh AuditContextInterceptor (lihat audit-context.interceptor.ts),
// dibaca oleh Prisma client extension (audit.extension.ts).
//
// Di luar request HTTP (seed, migration, cron) tak ada context yang
// di-`run()` — `getStore()` mengembalikan `undefined`, dan extension
// menanganinya sebagai "tanpa user" (master §5.3 DoD: tak boleh meledak).
import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditContext {
  userId?: string;
  clientIp?: string;
}

export const auditContextStorage = new AsyncLocalStorage<AuditContext>();

// CATATAN JEBAKAN (dibuktikan lewat db-spec, lihat audit-extension.db-spec.ts):
// `auditContextStorage.run(ctx, callback)` HANYA mempertahankan context
// selama ekstensi SINKRON dari `callback` (dan continuation yang
// benar-benar berakar di sana). Prisma me-return "PrismaPromise" yang
// LAZY — query sebenarnya baru dipicu saat `.then()`/`await` dipanggil.
// Kalau `callback` BUKAN `async` dan cuma `return prisma.x.create(...)`
// TANPA di-await di dalam callback itu sendiri, `.then()` dipanggil
// pemanggil di LUAR `run()` — context sudah lepas, `getStore()` di dalam
// extension jadi `undefined`. AMAN: tandai callback `async` (mesin async
// function men-trigger `.then()` pada return value secara sinkron sebelum
// callback selesai) ATAU `await` eksplisit di dalamnya. Pola produksi
// (AuditContextInterceptor → RxJS `subscribe()` → controller/service async)
// sudah aman karena seluruh rantai panggilan sinkron sampai `await`
// pertama tetap di dalam frame `run()`.
