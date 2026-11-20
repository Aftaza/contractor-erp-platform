// PrismaService — wrapper tipis di atas PrismaClient (WP-02).
//
// Perluasan WP-05 (diizinkan eksplisit, lihat brief WP-05): constructor
// me-return HASIL `withAuditExtension(this)`, bukan `this` biasa. Ini JS
// legal — constructor class boleh `return` objek lain, dan objek itulah
// yang dikembalikan `new PrismaService()` (dipakai apa adanya oleh DI
// container Nest). Alasannya: `PrismaClient.$extends()` TIDAK memutasi
// instance asal, ia mengembalikan client baru — satu-satunya cara membuat
// SEMUA pemanggil `prisma.user.create()` dkk (lewat token DI
// `PrismaService` yang sama, tanpa mereka tahu) otomatis lewat extension
// audit, adalah menukar objek yang benar-benar di-resolve DI ini. Pola ini
// dipakai komunitas Nest+Prisma untuk masalah yang sama (lih. laporan akhir
// WP-05 untuk rujukan).
//
// Konsekuensi: `onModuleInit`/`onModuleDestroy` TIDAK didefinisikan di
// class ini lagi — objek yang di-return tak mewarisi prototype class ini,
// jadi method itu tak akan pernah kepanggil kalau taruh di sini. Keduanya
// dipasang lewat komponen `client: {}` di dalam `withAuditExtension`
// sendiri (audit.extension.ts) — Nest memanggil hook lifecycle lewat
// duck-typing runtime pada instance yang di-resolve, jadi tetap terpanggil
// dengan benar.
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { withAuditExtension } from '../audit/audit.extension';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super();
    return withAuditExtension(this) as unknown as PrismaService;
  }
}
