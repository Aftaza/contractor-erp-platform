// acme-backend/src/config/config.module.spec.ts
//
// Menjaga fail-fast env pada jalur NYATA. main.ts sengaja tak lagi memanggil
// `validateEnv()` sendiri (redundan — lihat komentar di main.ts): satu-satunya
// yang menegakkan env saat boot adalah opsi `validate: validateEnv` di dalam
// AppConfigModule. Test ini yang membuat penghapusan opsi itu ketahuan;
// env.validation.spec.ts hanya menguji fungsinya, bukan wiring-nya.
//
// Dua detail yang memaksa bentuk test ini:
//  1. `require()` (bukan `import()` dinamis) karena jest jalan CJS — dynamic
//     import butuh --experimental-vm-modules. Yang dibutuhkan cuma "muat ulang
//     modul setelah process.env diubah"; require + resetModules sudah cukup.
//  2. `ConfigModule.forRoot` itu `static async`, jadi env invalid TIDAK throw
//     sinkron — ia menghasilkan promise REJECTED yang disimpan di metadata
//     `imports` dan baru di-await Nest saat NestFactory.create(). Handler
//     karena itu dipasang sinkron tepat setelah require, kalau tidak Node
//     membunuh worker jest dengan unhandled rejection.

/* eslint-disable @typescript-eslint/no-require-imports */
import 'reflect-metadata';

/** Muat ulang AppConfigModule dan ambil promise dari ConfigModule.forRoot. */
function loadForRootResult(): unknown {
  const mod = require('./config.module') as typeof import('./config.module');
  const imports = Reflect.getMetadata(
    'imports',
    mod.AppConfigModule,
  ) as unknown[];
  return imports[0];
}

describe('AppConfigModule', () => {
  const ORIGINAL = process.env.JWT_ACCESS_SECRET;

  afterEach(() => {
    process.env.JWT_ACCESS_SECRET = ORIGINAL;
    jest.resetModules();
  });

  it('menolak env invalid — fail-fast sebelum aplikasi listen', async () => {
    jest.resetModules();
    // process.env menang atas isi .env di ConfigModule
    // (`{ ...envFile, ...process.env }`), jadi deterministik baik di CI
    // (tanpa .env) maupun di mesin dev (dengan .env).
    process.env.JWT_ACCESS_SECRET = 'pendek';

    await expect(loadForRootResult()).rejects.toThrow(
      /JWT_ACCESS_SECRET minimal 16 karakter/,
    );
  });

  it('lolos saat env valid', async () => {
    jest.resetModules();
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);

    await expect(loadForRootResult()).resolves.toBeDefined();
  });
});
