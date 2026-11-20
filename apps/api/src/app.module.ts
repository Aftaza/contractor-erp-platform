// acme-backend/src/app.module.ts
//
// KONTRAK DIBEKUKAN — WP-00 (master plan §3.4, §11.1). HANYA paket ini yang
// boleh mengedit file ini, SELAMANYA. Worker domain (Fase 1+) mengisi
// folder modulnya sendiri (controller/service/dto) — tak pernah menyentuh
// file ini untuk mendaftarkan sesuatu. Kalau terasa perlu, itu sinyal
// kontraknya salah: berhenti, benahi di WP-00, jangan tambal lokal.
//
// Keputusan WP-00: AuthModule & PolicyModule ikut didaftarkan di sini
// meski tak eksplisit disebut di daftar "16 modul domain" pada dokumen
// fase-0 — keduanya butuh titik registrasi root yang sama seperti modul
// domain lain, dan aturan "app.module.ts tak boleh disentuh siapa pun
// selain WP-00" berlaku mutlak untuk WP-03/WP-04 juga. Lihat laporan akhir
// WP-00 untuk detail keputusan ini.
// Catatan (integrator, penutup Fase 0): AppController/AppService bawaan
// `nest new` (route "Hello World") DIHAPUS. JwtAuthGuard global fail-closed
// membuatnya 401 — guard-nya bekerja benar, route-nya yang tak seharusnya
// ada. Memberi @Public() pada kode sampah = melubangi harness matriks.
import { Module } from '@nestjs/common';

import { AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

import { AuthModule } from './auth/auth.module';
import { PolicyModule } from './policy/policy.module';

import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { VendorsModule } from './vendors/vendors.module';
import { ProjectsModule } from './projects/projects.module';
import { RabModule } from './rab/rab.module';
import { RabImportModule } from './rab-import/rab-import.module';
import { PurchaseModule } from './purchase/purchase.module';
import { TerminsModule } from './termins/termins.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ToolsModule } from './tools/tools.module';
import { ProjectToolsModule } from './project-tools/project-tools.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { PublicModule } from './public/public.module';
import { UploadsModule } from './uploads/uploads.module';
import { DocumentsModule } from './documents/documents.module';
import { TrashModule } from './trash/trash.module';

@Module({
  imports: [
    // Infrastruktur — didahulukan karena modul lain bergantung padanya.
    // AppConfigModule (WP-01): ConfigModule.forRoot({ isGlobal: true }) +
    //   validasi env. Tanpa ini ConfigService tak tersedia lewat DI, dan
    //   WP-03 tak bisa membaca JWT_ACCESS_SECRET/JWT_REFRESH_SECRET.
    // PrismaModule (WP-02): @Global(), mengekspor PrismaService — satu-satunya
    //   jalur ke Postgres untuk semua modul domain.
    // HealthModule (WP-01): GET /health untuk healthcheck Docker (master §5.1).
    //   Harus terdaftar di sini, kalau tidak route-nya tak disajikan aplikasi
    //   nyata yang di-boot main.ts (DoD Fase 0 #1).
    AppConfigModule,
    PrismaModule,
    HealthModule,

    // Fondasi (Fase 0)
    AuthModule,
    PolicyModule,

    // Domain (Fase 1+) — semua stub kosong, diisi worker masing-masing.
    UsersModule,
    ClientsModule,
    VendorsModule,
    ProjectsModule,
    RabModule,
    RabImportModule,
    PurchaseModule,
    TerminsModule,
    ExpensesModule,
    ToolsModule,
    ProjectToolsModule,
    NotificationsModule,
    ReportsModule,
    AuditModule,
    PublicModule,
    UploadsModule,
    DocumentsModule,
    TrashModule,
  ],
})
export class AppModule {}
