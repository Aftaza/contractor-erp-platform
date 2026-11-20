// acme-backend/src/auth/auth.controller.ts
//
// Token HANYA dikirim lewat cookie httpOnly (SEC-2) — tak pernah di body, agar
// XSS tak bisa mencuri refresh token. Header `Authorization: Bearer` tetap
// diterima (refresh/logout, JwtAuthGuard) untuk klien non-browser.
// shortcut: belum ada jalur body token untuk mobile, tambahkan endpoint/header
// khusus yang terdokumentasi saat aplikasi mobile dibuat (SEC-2).
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import {
  AuthenticatedUser,
  JwtAuthGuard,
} from '../common/guards/jwt-auth.guard';
import { AuthResult, AuthService } from './auth.service';
import {
  ACCESS_COOKIE_MAX_AGE_MS,
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from './constants';
import {
  AuthResponseDto,
  MeResponseDto,
  MessageResponseDto,
} from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

// Interface eksplisit (bukan `extends Request` dari express) — sama pola
// dengan RequestLike di common/guards/jwt-auth.guard.ts, supaya `headers`
// bertipe tegas (string | string[] | undefined), bukan luruh ke `any`.
interface RequestWithAuth {
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
  user?: AuthenticatedUser;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @ApiOkResponse({ type: AuthResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setAuthCookies(res, result);
    return { user: result.user };
  }

  @Public()
  @ApiOkResponse({ type: AuthResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: RequestWithAuth,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = this.extractBearerOrCookie(req, REFRESH_COOKIE_NAME);
    if (!token) {
      throw new UnauthorizedException('Refresh token tidak ditemukan');
    }

    const result = await this.authService.refresh(token);
    this.setAuthCookies(res, result);
    return { user: result.user };
  }

  @Public()
  @ApiOkResponse({ type: MessageResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() req: RequestWithAuth,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = this.extractBearerOrCookie(req, REFRESH_COOKIE_NAME);
    await this.authService.logout(token);
    this.clearAuthCookies(res);
    return { message: 'Logout berhasil' };
  }

  // Auth guard dipasang eksplisit di sini (bukan global — pendaftaran guard
  // global adalah tugas WP-04) supaya endpoint ini tahu siapa pemanggilnya.
  // SENGAJA TAK diberi MustChangePasswordGuard — endpoint inilah jalan keluar
  // dari status must_change_password=true.
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: MessageResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  async changePassword(
    @Req() req: RequestWithAuth,
    @Body() dto: ChangePasswordDto,
  ) {
    if (!req.user) throw new UnauthorizedException('Token tidak valid');
    await this.authService.changePassword(req.user.id, dto);
    return { message: 'Password berhasil diganti' };
  }

  // GET /auth/me — tambahan scope integrator (bukan master §5.4 asli):
  // WP-34/35/36 butuh identitas user untuk gating tombol berbasis role
  // (master §6.3 poin 5) dan tak ada endpoint lain yang menyediakannya.
  // Terautentikasi, TANPA @Roles() — semua role melihat data dirinya
  // sendiri (baris matriks: test/authz/rows/auth-me.rows.ts).
  //
  // KEPUTUSAN SADAR: TIDAK dikecualikan MustChangePasswordAppGuard (beda
  // dengan change-password/logout). Alasan: web sudah tahu harus redirect ke
  // /change-password langsung dari BODY respons POST /auth/login
  // (user.mustChangePassword) — tak perlu memanggil /auth/me dulu untuk itu.
  // Mengecualikannya butuh menyunting EXEMPT_HANDLERS di
  // src/policy/guards/must-change-password-app.guard.ts, file di luar
  // kepemilikan WP-31 (beku, milik WP-04) — kalau kebutuhan itu ternyata
  // muncul nyata, tambahkan di sana, jangan tambal di sini.
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: MeResponseDto })
  @HttpCode(HttpStatus.OK)
  @Get('me')
  async me(@Req() req: RequestWithAuth) {
    if (!req.user) throw new UnauthorizedException('Token tidak valid');
    return this.authService.getMe(req.user.id);
  }

  private extractBearerOrCookie(
    req: RequestWithAuth,
    cookieName: string,
  ): string | undefined {
    const header = req.headers['authorization'];
    const headerValue = Array.isArray(header) ? header[0] : header;
    if (headerValue?.startsWith('Bearer ')) return headerValue.slice(7);
    return req.cookies?.[cookieName];
  }

  private setAuthCookies(res: Response, result: AuthResult): void {
    // `secure: true` keras menolak cookie disimpan browser di http://localhost
    // (dev tanpa TLS) — login lewat UI mustahil sukses. Production tetap wajib
    // Secure (master §3.3); nilainya dibaca dari NODE_ENV via ConfigService,
    // BUKAN `process.env` telanjang (fase-1-vertikal-rab.md §2.4).
    const secure = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie(ACCESS_COOKIE_NAME, result.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_COOKIE_MAX_AGE_MS,
    });
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      expires: result.refreshExpiresAt,
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie(ACCESS_COOKIE_NAME, { path: '/' });
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
  }
}
