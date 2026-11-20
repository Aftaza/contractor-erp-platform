// acme-backend/scripts/generate-openapi.ts
//
// Hasilkan openapi.json dari AppModule tanpa membuka listener HTTP (tak perlu
// server jalan). Dipakai pipeline `npm run generate:api-types` (lihat README).
//
// Sengaja tak menyentuh main.ts (milik WP-01) — script berdiri sendiri,
// membuat application context Nest hanya untuk menyusun dokumen OpenAPI.
//
// IMPOR DARI `dist/`, BUKAN `src/` — disengaja (U1). Plugin CLI
// `@nestjs/swagger` (nest-cli.json) adalah transformer TypeScript: ia hanya
// jalan saat `nest build`. Membaca `src/` lewat ts-node melewatinya, dan
// itulah sebab seluruh schema di openapi.json sempat kosong
// (`properties: {}`). Karena itu `generate:openapi` menjalankan `nest build`
// lebih dulu (lihat package.json).
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../dist/app.module';

async function main() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });

  const config = new DocumentBuilder()
    .setTitle('Acme ERP API')
    .setDescription(
      'API internal acme-backend — konsumen: web ERP, mobile (nanti), situs publik.',
    )
    .setVersion('1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outPath = join(__dirname, '..', 'openapi.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2));

  await app.close();

  console.log(`openapi.json ditulis ke ${outPath}`);
}

main().catch((err) => {
  console.error('Gagal membuat openapi.json:', err);
  process.exitCode = 1;
});
