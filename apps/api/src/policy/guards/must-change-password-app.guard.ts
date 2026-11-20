// acme-backend/src/policy/guards/must-change-password-app.guard.ts
//
// Membungkus MustChangePasswordGuard (src/auth/guards — milik WP-03,
// DIBEKUKAN untuk WP-04, tak pernah diedit di sini) sebagai APP_GUARD
// app-wide (fase-0-fondasi.md §WP-04: "boleh memasangnya sebagai APP_GUARD
// kedua setelah JwtAuthGuard, dengan pengecualian eksplisit
// /auth/change-password & /auth/logout").
//
// Kenapa dibungkus, bukan dipasang langsung: pengecualian dua route itu
// butuh identifikasi handler, dan file controller yang memilikinya
// (src/auth/auth.controller.ts) di luar scope WP-04 (tak boleh disentuh) —
// jadi tak bisa ditambah dekorator penanda di sana. Identifikasi dilakukan
// lewat referensi fungsi handler langsung (bukan string path), yang tetap
// benar walau prefix global (`/api/v1`) berubah.
//
// /auth/logout sudah `@Public()` di kode saat ini (JwtAuthGuard
// meloloskannya sebelum `request.user` pernah terisi, jadi guard ini pun
// otomatis tak pernah mengevaluasinya). Tetap dicek eksplisit di sini
// sebagai pertahanan berlapis dan dokumentasi niat — DoD WP-04 minta
// pengecualian keduanya disebutkan eksplisit, bukan cuma diam-diam benar
// karena efek samping @Public().
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthController } from '../../auth/auth.controller';
import { MustChangePasswordGuard } from '../../auth/guards/must-change-password.guard';

type Handler = (...args: unknown[]) => unknown;

// Referensi method dipakai HANYA sebagai identitas objek di dalam Set
// (perbandingan referensi lewat context.getHandler()), tak pernah dipanggil
// langsung — kehilangan binding `this` tak relevan untuk pemakaian ini.
/* eslint-disable @typescript-eslint/unbound-method */
const EXEMPT_HANDLERS: ReadonlySet<Handler> = new Set<Handler>([
  AuthController.prototype.changePassword,
  AuthController.prototype.logout,
]);
/* eslint-enable @typescript-eslint/unbound-method */

@Injectable()
export class MustChangePasswordAppGuard implements CanActivate {
  private readonly inner = new MustChangePasswordGuard();

  canActivate(context: ExecutionContext): boolean {
    if (EXEMPT_HANDLERS.has(context.getHandler() as Handler)) return true;
    return this.inner.canActivate(context);
  }
}
