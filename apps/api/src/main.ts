// acme-backend/src/main.ts
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './config/app-setup';

async function bootstrap() {
  // Fail-fast env (master §5.1) TIDAK dipanggil eksplisit di sini —
  // `import { AppModule }` di atas SUDAH memicunya. AppModule meng-import
  // AppConfigModule, dan `ConfigModule.forRoot({ validate })` mengeksekusi
  // validasi saat modul di-IMPORT (bukan saat di-init): .env dimuat,
  // divalidasi, hasilnya ditulis balik ke process.env. Env kurang/invalid
  // membuat proses mati sebelum baris ini tercapai sama sekali.
  //
  // `validateEnv(process.env)` yang sempat ada di sini justru menyesatkan:
  // ia jalan SETELAH import (jadi tak pernah bisa gagal lebih dulu) dan
  // membaca process.env sebelum ConfigModule memuat .env — membuat
  // `node dist/main` seolah menuntut env ter-export di shell.
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = app.get(ConfigService).getOrThrow<number>('PORT');
  await app.listen(port);
}

bootstrap().catch((err: unknown) => {
  console.error(
    'Gagal boot aplikasi:',
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
