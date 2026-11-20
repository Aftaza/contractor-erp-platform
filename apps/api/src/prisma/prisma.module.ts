// PrismaModule — @Global() supaya modul domain lain cukup import sekali
// (WP-02). Tidak didaftarkan di app.module.ts (file itu milik WP-00) —
// modul yang butuh Prisma meng-import PrismaModule di file modulnya sendiri.
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
