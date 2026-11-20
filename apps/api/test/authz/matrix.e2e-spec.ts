// acme-backend/test/authz/matrix.e2e-spec.ts
//
// Assersi jest untuk harness matriks otorisasi (test/authz/matrix.ts +
// registry.ts) — master §9.3, DoD WP-04. Boot AppModule PENUH (semua
// controller yang benar-benar terdaftar aplikasi nyata — bukan subset),
// dengan PrismaService di-override sama seperti test/app.e2e-spec.ts: suite
// ini murni metadata reflection, tak pernah memanggil HTTP, jadi tak butuh
// Postgres nyata. Dijalankan via `npm run test:e2e`.
//
// Bukti negatif (DoD): lihat blok `describe('bukti negatif ...')` di bawah —
// mendaftarkan controller dummy TANPA baris registry, membuktikan harness
// gagal, lalu (di kode) controller itu tak pernah didaftarkan ke
// AUTHZ_REGISTRY permanen. Lihat laporan akhir WP-04 untuk output aktual
// perintah ini saat dijalankan sekali secara manual dengan baris registry
// dihapus sementara.
import { Controller, Get, INestApplication } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { diffAccess, findMatrixRow, scanRoutes } from './matrix';
import { AUTHZ_REGISTRY } from './registry';

async function bootAppForScan(
  extraControllers: (new (...args: unknown[]) => unknown)[] = [],
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, DiscoveryModule],
    controllers: extraControllers,
  })
    // Sama seperti test/app.e2e-spec.ts: suite ini tak butuh Postgres nyata,
    // hanya metadata routing — tanpa override ini, app.init() menuntut DB
    // hidup lewat PrismaService.onModuleInit().
    .overrideProvider(PrismaService)
    .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
    .compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('Harness matriks otorisasi (master §9.3, WP-04)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await bootAppForScan();
  });

  afterAll(async () => {
    await app.close();
  });

  it('setiap route terdaftar Nest punya baris matriks di registry.ts', () => {
    const routes = scanRoutes(app);
    expect(routes.length).toBeGreaterThan(0); // sanity: scanner benar-benar menemukan sesuatu

    const missing = routes
      .filter((r) => !findMatrixRow(AUTHZ_REGISTRY, r))
      .map(
        (r) =>
          `${r.method} ${r.path} (${r.controllerName}.${r.handlerName}) — TAK ADA baris di test/authz/registry.ts`,
      );
    expect(missing).toEqual([]);
  });

  it('baris registry konsisten dengan metadata @Public()/@Roles() sungguhan di kode', () => {
    const routes = scanRoutes(app);
    const mismatches: string[] = [];
    for (const route of routes) {
      const row = findMatrixRow(AUTHZ_REGISTRY, route);
      if (!row) continue; // sudah ditangkap test sebelumnya
      mismatches.push(...diffAccess(route, row));
    }
    expect(mismatches).toEqual([]);
  });

  it('setiap baris registry menunjuk route yang benar-benar terdaftar (tak ada baris basi)', () => {
    const routes = scanRoutes(app);
    const stale = AUTHZ_REGISTRY.filter(
      (row) =>
        !routes.some((r) => r.method === row.method && r.path === row.path),
    ).map((row) => `${row.method} ${row.path} — tak ada route Nest yang cocok`);
    expect(stale).toEqual([]);
  });
});

describe('bukti negatif — endpoint tanpa baris matriks membuat harness GAGAL', () => {
  // Controller dummy, route-nya SENGAJA tak pernah didaftarkan ke
  // AUTHZ_REGISTRY (test/authz/registry.ts). Ini BUKAN test yang harus
  // hijau di CI biasa — ini adalah demonstrasi permanen bahwa mekanisme
  // "endpoint tanpa baris -> gagal" benar-benar bekerja, dijalankan lewat
  // `.skip` supaya tetap terlihat & bisa dijalankan manual (`.only`) tanpa
  // meracuni suite utama dengan kegagalan yang memang disengaja.
  it.skip('DEMONSTRASI: jalankan manual (hapus .skip) untuk melihat harness gagal pada route tak terdaftar', async () => {
    @Controller('_dummy-unregistered')
    class DummyUnregisteredController {
      @Get()
      ping() {
        return { ok: true };
      }
    }

    const app = await bootAppForScan([DummyUnregisteredController]);
    try {
      const routes = scanRoutes(app);
      const missing = routes.filter((r) => !findMatrixRow(AUTHZ_REGISTRY, r));
      // Route dummy ini HARUS muncul di daftar "missing" -> baris di bawah
      // gagal kalau harness tak bekerja.
      expect(missing).toEqual([]);
    } finally {
      await app.close();
    }
  });
});
