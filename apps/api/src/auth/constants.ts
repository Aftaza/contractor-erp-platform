// acme-backend/src/auth/constants.ts
//
// Konstanta token & cookie auth (WP-03, master §3.3).

/** Access token: umur pendek — dicek ulang ke DB tiap request (WP-04/policy). */
export const ACCESS_TOKEN_TTL = '15m';
export const ACCESS_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;

/** Refresh token: umur panjang, ter-hash di DB, dirotasi tiap dipakai. */
export const REFRESH_TOKEN_TTL = '7d';
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Nama cookie access HARUS sama persis dengan yang dibaca JwtAuthGuard
// (src/common/guards/jwt-auth.guard.ts, dibekukan WP-00) — lihat
// `request.cookies?.['access_token']` di sana.
export const ACCESS_COOKIE_NAME = 'access_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';

/** Rate limit /auth/login (SEC-1) — 5 percobaan / menit per IP+email. */
export const LOGIN_THROTTLE_LIMIT = 5;
export const LOGIN_THROTTLE_TTL_MS = 60_000;
/** Kuota per IP saja (semua email) — longgar agar satu kantor ber-NAT tetap bisa login. */
export const LOGIN_THROTTLE_IP_LIMIT = 30;

/** Lockout akun (FR-AUTH-5): N gagal berturut → ditahan sementara. */
export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
