<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Skema database (Prisma)

Skema lengkap ada di `prisma/schema.prisma` (dibekukan WP-00 — lihat komentar di
puncak file). Selama Fase 0, **jangan jalankan migration** (itu WP-02); cukup
validasi & generate client:

```bash
# Validasi sintaks skema (tak perlu koneksi DB nyata)
DATABASE_URL="postgresql://user:pass@localhost:5432/acme?schema=public" npx prisma validate

# Generate Prisma Client dari skema (dibutuhkan modul manapun yang import @prisma/client)
DATABASE_URL="postgresql://user:pass@localhost:5432/acme?schema=public" npx prisma generate
```

> Catatan versi: `prisma`/`@prisma/client` sengaja dipin ke `6.19.3`. Prisma 7
> memindahkan `datasource.url` keluar dari `schema.prisma` ke `prisma.config.ts`
> + driver adapter (`@prisma/adapter-pg`, dst.) — perubahan besar yang akan
> memaksa setiap `PrismaClient` di seluruh worker Fase 1+ memakai adapter.
> Ditahan di 6.x sampai ada keputusan sadar untuk migrasi.

## Generate tipe API (OpenAPI → TypeScript)

`lib/types/api.ts` di web (`acme-management/`) **tak ditulis tangan** — selalu
digenerate dari dokumen OpenAPI backend. Dua langkah:

```bash
# 1. Dari acme-backend/ — hasilkan openapi.json (tanpa perlu server jalan)
npm run generate:openapi

# 2. Dari root acme-management/ — generate lib/types/api.ts dari openapi.json
npm run generate:api-types
```

`scripts/generate-openapi.ts` membuat Nest application context dari
`AppModule` langsung (tanpa `main.ts` / listener HTTP) lalu memakai
`SwaggerModule.createDocument()` untuk menyusun spec. Ini dipilih supaya
pipeline tak bergantung pada server yang sedang jalan.

Selama Fase 0, spec hanya berisi route bawaan (`GET /`) karena belum ada
controller domain. Jalankan ulang kedua perintah di atas setiap kali modul
domain (Fase 1+) menambah endpoint baru — `lib/types/api.ts` akan otomatis
mengikuti tanpa ada yang menulis tipe manual.

## Matriks otorisasi (Fase 1+)

RLS sudah dilepas (master plan §0.1) — **harness matriks otorisasi** (`test/authz/`) adalah
satu-satunya jaring yang mencegah endpoint baru lolos tanpa baris otorisasi. Ia mengenumerasi
**semua** route yang benar-benar terdaftar di Nest lewat `DiscoveryService` (bukan menyisir
folder controller manual) dan mencocokkannya terhadap `test/authz/registry.ts`. **Endpoint
tanpa baris di registry membuat suite `matrix.e2e-spec.ts` gagal** — ini disengaja.

Tiga file yang terlibat:

| File | Isi | Siapa yang mengedit |
|---|---|---|
| `test/authz/rows/<modul>.rows.ts` | Data: `{ method, path, access }` per route, turunan langsung master §4.8 | **Tiap WP domain memiliki SATU file di sini — dan hanya file miliknya** |
| `test/authz/registry.ts` | Baris inti (health, auth) + pemungut otomatis isi `rows/` | Milik WP-04, **jangan** diedit worker lain |
| `test/authz/matrix.ts` | Mesin harness (scan route + bandingkan) — reusable, tak berisi `it()` | Milik WP-04, tak perlu diedit worker lain |
| `test/authz/matrix.e2e-spec.ts` | Assersi jest (`npm run test:e2e`) | Milik WP-04, tak perlu diedit worker lain |

### Cara menambah baris untuk modul baru

1. Buat endpoint dengan `@Roles(...)` (dari `src/common/decorators/roles.decorator.ts`) atau
   `@Public()` seperti biasa — **jangan** menulis `if (role === ...)` di controller.
2. Buat **satu** file `test/authz/rows/<modul>.rows.ts` milik paketmu — `registry.ts`
   memungutnya otomatis, jadi tak ada file bersama yang harus disunting banyak worker
   paralel:
   ```ts
   import { MatrixRow, allow } from '../registry';

   export const rows: MatrixRow[] = [
     {
       method: 'POST',
       path: '/projects', // TANPA prefix /api/v1, param dinamis dalam bentuk ':id'
       access: allow('pimpinan', 'admin'), // aktor lain otomatis false
     },
   ];
   ```
3. Jalankan `npx jest --config ./test/jest-e2e.json test/authz/matrix.e2e-spec.ts`. Kalau
   lupa baris → test pertama ("setiap route ... punya baris matriks") gagal dengan pesan
   yang menyebut method+path+controller yang hilang. Kalau baris ada tapi
   `access` tak cocok dekorator (`@Public()`/`@Roles()`) sungguhan di kode → test kedua
   ("baris registry konsisten dengan metadata") gagal.

### Yang PENTING dipahami: harness ini menguji gerbang role, bukan aturan bisnis state-dependent

`access` di registry menjawab pertanyaan: *"apakah role ini lolos `JwtAuthGuard` +
`RolesGuard` dan mencapai handler?"* — bukan *"apakah hasil akhirnya sukses?"*. Contoh nyata
dari master §4.8: endpoint mutasi `rab_nodes` didekorasi `@Roles('pimpinan','admin')` (KEDUA
role lolos gerbang), tapi admin harus ditolak **khusus saat `rab_status='approved'`**. Aturan
kedua ini TIDAK muat di dekorator — itu tugas **`PolicyService`** (`src/policy/policy.service.ts`),
dipanggil manual dari controller/service modul domain, dengan unit test coverage 100% cabang
sendiri (lihat `policy.service.spec.ts`). Baris registry untuk endpoint itu tetap
`allow('pimpinan', 'admin')` (menggambarkan gerbang role), BUKAN diubah jadi hanya
`allow('pimpinan')` — itu akan membuat baris registry berbohong soal apa yang sungguhan
dijalankan RolesGuard, dan menyembunyikan justru bug yang PolicyService seharusnya tangkap.

Ringkas: **dua jaring terpisah, jangan dicampur** — RolesGuard+matriks untuk gerbang role
kasar, PolicyService+unit test-nya untuk aturan halus bergantung state.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
