// acme-backend/src/policy/policy.module.ts
// acme-backend/src/policy/policy.module.ts
//
// Diisi WP-04 (master §5.2, §12; fase-0-fondasi.md §WP-04). Modul ini SUDAH
// terdaftar di app.module.ts (dibekukan WP-00) — hanya file di folder ini
// yang diisi, TAK PERNAH menyentuh app.module.ts (master §3.4).
//
// Mendaftarkan rantai guard app-wide lewat APP_GUARD *dari modul ini*, bukan
// dari app.module.ts — pola resmi Nest untuk guard global yang tak
// mengharuskan pemilik app.module.ts ikut menyentuhnya (lihat
// https://docs.nestjs.com/guards#binding-guards, bagian "global guards").
// Urutan (array providers = urutan eksekusi Nest untuk multi APP_GUARD):
//   1. JwtAuthGuard              — autentikasi; fail-closed tanpa AUTH_VERIFIER.
//   2. MustChangePasswordAppGuard — blokir operasi lain selama ganti password
//                                   wajib belum dilakukan (kecuali dua route
//                                   yang justru jalan keluarnya).
//   3. RolesGuard                — cocokkan `@Roles()` vs `request.user.role`.
// PolicyService (aturan §4.8 yang tak muat @Roles(), mis. state rab_status)
// dipanggil manual oleh controller domain Fase 1+ — BUKAN via guard, karena
// butuh data spesifik request (mis. rab_status proyek) yang tak tersedia
// lewat metadata dekorator saja.
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { MustChangePasswordAppGuard } from './guards/must-change-password-app.guard';
import { PolicyService } from './policy.service';

@Module({
  // AuthModule diimpor (bukan bind ulang) supaya AUTH_VERIFIER yang
  // di-export-nya tersedia lewat DI untuk JwtAuthGuard di modul ini.
  imports: [AuthModule],
  providers: [
    PolicyService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: MustChangePasswordAppGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [PolicyService],
})
export class PolicyModule {}
