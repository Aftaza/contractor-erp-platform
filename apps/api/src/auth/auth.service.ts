// acme-backend/src/auth/auth.service.ts
import { createHash, randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { AppLogger } from '../common/logger/app-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACCESS_TOKEN_TTL,
  LOCKOUT_DURATION_MS,
  LOCKOUT_THRESHOLD,
  REFRESH_TOKEN_TTL,
  REFRESH_TOKEN_TTL_MS,
} from './constants';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

/** Pesan generik dipakai utk SEMUA kegagalan login (email salah, password
 * salah, akun nonaktif) — mencegah endpoint membocorkan mana yang salah. */
const GENERIC_LOGIN_ERROR = 'Email atau password salah';
const GENERIC_REFRESH_ERROR = 'Refresh token tidak valid';

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  mustChangePassword: boolean;
}

/** Bentuk `GET /auth/me` — kontrak eksplisit integrator, field `name` (bukan
 * `fullName` seperti PublicUser). Hanya field yang UI butuh; TIDAK PERNAH
 * `passwordHash`/`isActive`/kolom internal lain. */
export interface MeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: PublicUser;
}

interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new AppLogger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const passwordValid = user
      ? await argon2.verify(user.passwordHash, dto.password).catch(() => false)
      : false;

    // FR-AUTH-5: akun terkunci dibalas pesan generik yang SAMA — status
    // kunci tak pernah bocor, bahkan untuk password yang benar.
    const locked = !!user?.lockedUntil && user.lockedUntil > new Date();

    if (!user || !passwordValid || !user.isActive || locked) {
      if (user && !passwordValid && !locked) await this.recordFailedLogin(user);
      // Log HANYA email (identifier), tak pernah password/hash mentah —
      // AppLogger juga meredaksi field bernama sensitif secara rekursif
      // sebagai jaring pengaman kedua (common/logger, dibekukan).
      this.logger.warn('Login gagal', { email: dto.email, locked });
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    if (user.failedLoginCount > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });
    }

    this.logger.log('Login berhasil', { userId: user.id, email: user.email });

    const tokens = await this.issueTokenPair(user.id, user.role);
    return { ...tokens, user: this.toPublicUser(user) };
  }

  async refresh(presentedToken: string): Promise<AuthResult> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(
        presentedToken,
        { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') },
      );
    } catch {
      throw new UnauthorizedException(GENERIC_REFRESH_ERROR);
    }

    const tokenHash = this.hashToken(presentedToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, tokenHash },
    });

    // Ditolak kalau: tak ditemukan, sudah dicabut (rotasi — dipakai
    // sebelumnya), atau kedaluwarsa. Baris lama TAK PERNAH dihidupkan
    // kembali (master §3.3: refresh token dirotasi tiap dipakai).
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException(GENERIC_REFRESH_ERROR);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException(GENERIC_REFRESH_ERROR);
    }

    // Rotasi: cabut token lama SEBELUM menerbitkan yang baru, supaya
    // request refresh ganda (mis. race condition klien) tak bisa keduanya
    // sukses dari satu token yang sama.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokenPair(user.id, user.role);
    return { ...tokens, user: this.toPublicUser(user) };
  }

  async logout(presentedToken: string | undefined): Promise<void> {
    if (!presentedToken) return; // tak ada yang perlu dicabut — idempotent

    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(
        presentedToken,
        { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') },
      );
    } catch {
      return; // token sudah tak valid — logout tetap dianggap berhasil
    }

    const tokenHash = this.hashToken(presentedToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId: payload.sub, tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * FR-AUTH-5: hitung gagal berturut (increment atomik); mencapai ambang →
   * kunci `LOCKOUT_DURATION_MS` dan hitungan mulai lagi dari nol.
   * shortcut: durasi kunci tetap (bukan eskalasi bertahap), naikkan ke
   * durasi berlipat per kunci berulang bila brute force lambat terlihat di audit.
   */
  private async recordFailedLogin(user: User): Promise<void> {
    const { failedLoginCount } = await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });
    if (failedLoginCount < LOCKOUT_THRESHOLD) return;
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
      },
    });
    this.logger.warn('Akun dikunci sementara', { userId: user.id });
  }

  /** SEC-4: cabut semua refresh token aktif user — paksa login ulang di semua perangkat. */
  async revokeSessions(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Satu-satunya tempat parameter hash password ditetapkan (argon2id, master
   * §5.2 & §10). Diekstrak integrator saat WP-10 (`users`) butuh membuat user
   * baru: tanpa ini parameter hash tertulis di dua tempat dan bisa drift
   * diam-diam — password yang di-hash dengan setelan berbeda TETAP terverifikasi,
   * jadi drift-nya tak akan pernah membuat test merah. Dipakai modul `users`
   * lewat `AuthService` yang sudah di-export `AuthModule`.
   */
  hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Token tidak valid');

    const oldValid = await argon2
      .verify(user.passwordHash, dto.oldPassword)
      .catch(() => false);
    if (!oldValid) throw new BadRequestException('Password lama salah');

    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException(
        'Password baru harus berbeda dari password lama',
      );
    }

    const newHash = await this.hashPassword(dto.newPassword);

    // BUKAN bentuk array `$transaction([...])`: `User` ada di AUDITED_MODELS
    // (src/audit/audit.extension.ts, milik WP-05). Ekstensi itu mencegat tiap
    // panggilan mutasi model teraudit dan membungkusnya sendiri dalam
    // `client.$transaction(async tx => ...)` PADA SAAT `.update()` dipanggil —
    // sebelum promise itu sempat masuk ke array. Array `$transaction([...])`
    // Prisma butuh elemen berupa PrismaPromise yang bisa di-batch ke SATU
    // transaksi DB; yang diterimanya di sini adalah promise transaksi
    // terpisah milik ekstensi, dan kombinasi itu terbukti empiris menggantung
    // tanpa batas (direproduksi langsung ke Postgres asli, root cause 2 test
    // WP-03 yang macet). `refreshToken` tak ada di AUDITED_MODELS jadi
    // updateMany-nya lolos tanpa pembungkus — dua panggilan berurutan di
    // bawah ini sama-sama aman, konsisten dengan pola lain di file ini
    // (issueTokenPair, refresh) yang juga tak membungkus mutasi refresh token
    // dalam $transaction.
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash, mustChangePassword: false },
    });
    // Cabut semua refresh token milik user — paksa re-login di device lain
    // setelah ganti password (praktik keamanan umum).
    await this.revokeSessions(userId);

    this.logger.log('Password diganti', { userId });
  }

  /** `GET /auth/me` — data terkini DARI DB (bukan klaim JWT beku), pola sama
   * dengan AuthVerifierService.verify() (konsisten dengan alasan
   * role-revocation di master §5.2: role yang dicabut langsung berlaku). */
  async getMe(userId: string): Promise<MeUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Token tidak valid');

    return {
      id: user.id,
      name: user.fullName,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
  }

  private async issueTokenPair(userId: string, role: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, role },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: ACCESS_TOKEN_TTL,
      },
    );

    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      jti: randomUUID(),
    };
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: REFRESH_TOKEN_TTL,
    });

    // Refresh token disimpan TER-HASH (sha256) — token acak berentropi
    // tinggi, bukan password pengguna, jadi hash cepat cukup (argon2id
    // dipakai khusus utk password rendah-entropi). Hash dipakai utk lookup +
    // pencabutan; nilai token asli tak pernah disimpan.
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: refreshExpiresAt,
      },
    });

    return { accessToken, refreshToken, refreshExpiresAt };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
