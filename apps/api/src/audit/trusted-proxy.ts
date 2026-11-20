// acme-backend/src/audit/trusted-proxy.ts
//
// Kebijakan IP klien untuk audit_logs & throttle login (SEC-1): header proxy
// (`CF-Connecting-IP`/`X-Forwarded-For`) HANYA dipercaya kalau peer TCP langsung (soket) ada di daftar proxy
// tepercaya — klien bebas mengirim header apa pun, memercayainya mentah
// membuat jejak audit bisa dipalsukan (spoofing IP).
//
// Daftar proxy tepercaya dari env `AUDIT_TRUSTED_PROXY_IPS` (dipisah koma).
// Semantik SAMA dengan Express `trust proxy` (SEC-1): dicocokkan lewat
// `proxy-addr` — IP tunggal, CIDR (`172.18.0.0/16`), atau nama rentang
// (`loopback`, `uniquelocal`, `linklocal`). Kosong (default dev/test) = tak
// ada proxy dipercaya = header selalu diabaikan (fail-closed); production
// WAJIB mengisinya dengan jaringan container `proxy` (Caddy).
import { compile } from 'proxy-addr';

export function parseTrustedProxies(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((ip) => ip.trim())
    .filter((ip) => ip.length > 0);
}

/** Fungsi "apakah alamat soket ini proxy tepercaya?" — dikompilasi sekali saat start.
 * Entri tak valid melempar TypeError → boot gagal, bukan diam-diam tak dipercaya. */
export type TrustProxyFn = (addr: string) => boolean;

export function compileTrustedProxies(raw: string | undefined): TrustProxyFn {
  const trust = compile(parseTrustedProxies(raw));
  return (addr) => trust(addr, 0);
}

/** Buang prefix IPv4-mapped IPv6 (`::ffff:127.0.0.1` → `127.0.0.1`). */
function normalizeIp(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  return ip.startsWith('::ffff:') ? ip.slice('::ffff:'.length) : ip;
}

export interface ClientIpRequest {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

/**
 * Resolusi IP klien sebenarnya (SEC-1) — dipakai audit DAN throttle login.
 * `socketIp` (peer TCP langsung) dipakai sebagai fallback SELALU. Header
 * proxy hanya dipercaya kalau `socketIp` lolos `trusted`:
 * `CF-Connecting-IP` (ditulis Cloudflare, diteruskan `cloudflared` → Caddy —
 * SRS §2.6 INF-8) didahulukan, lalu hop pertama `X-Forwarded-For`.
 */
export function resolveClientIp(
  request: ClientIpRequest,
  trusted: TrustProxyFn,
): string | undefined {
  const socketIp = normalizeIp(request.socket?.remoteAddress);
  if (!socketIp || !trusted(socketIp)) {
    // Pengirim langsung bukan proxy tepercaya — header apa pun bisa
    // dipalsukan klien. Abaikan, pakai alamat soket asli.
    return socketIp;
  }

  const first = (h: string | string[] | undefined) =>
    (Array.isArray(h) ? h[0] : h)?.split(',')[0]?.trim() || undefined;
  return (
    first(request.headers['cf-connecting-ip']) ??
    first(request.headers['x-forwarded-for']) ??
    socketIp
  );
}
