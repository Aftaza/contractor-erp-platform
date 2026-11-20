// Unit test murni (tanpa DB, tanpa .env) untuk kebijakan IP klien WP-05
// (master §5.3, §10): X-Forwarded-For hanya dipakai kalau pengirim
// langsungnya ada di daftar proxy tepercaya.
import {
  compileTrustedProxies,
  parseTrustedProxies,
  resolveClientIp,
} from './trusted-proxy';

describe('parseTrustedProxies', () => {
  it('undefined/kosong → array kosong (tak ada proxy dipercaya secara default)', () => {
    expect(parseTrustedProxies(undefined)).toEqual([]);
    expect(parseTrustedProxies('')).toEqual([]);
  });

  it('parse daftar dipisah koma, buang spasi', () => {
    expect(parseTrustedProxies('10.0.0.2, 10.0.0.3 ,10.0.0.4')).toEqual([
      '10.0.0.2',
      '10.0.0.3',
      '10.0.0.4',
    ]);
  });
});

describe('resolveClientIp', () => {
  it('tanpa header X-Forwarded-For → pakai alamat soket langsung', () => {
    const ip = resolveClientIp(
      { headers: {}, socket: { remoteAddress: '203.0.113.9' } },
      compileTrustedProxies(''),
    );
    expect(ip).toBe('203.0.113.9');
  });

  it('X-Forwarded-For dari sumber TAK tepercaya → diabaikan, pakai alamat soket', () => {
    const ip = resolveClientIp(
      {
        headers: { 'x-forwarded-for': '1.2.3.4' }, // klien mencoba memalsukan IP
        socket: { remoteAddress: '203.0.113.9' }, // peer langsung BUKAN proxy tepercaya
      },
      compileTrustedProxies('10.0.0.2'),
    );
    expect(ip).toBe('203.0.113.9');
  });

  it('X-Forwarded-For dari proxy tepercaya → dipakai (hop pertama)', () => {
    const ip = resolveClientIp(
      {
        headers: { 'x-forwarded-for': '198.51.100.7, 10.0.0.2' },
        socket: { remoteAddress: '10.0.0.2' }, // peer langsung = proxy tepercaya
      },
      compileTrustedProxies('10.0.0.2'),
    );
    expect(ip).toBe('198.51.100.7');
  });

  it('IPv4-mapped IPv6 (::ffff:) dinormalisasi sebelum dibandingkan', () => {
    const ip = resolveClientIp(
      {
        headers: { 'x-forwarded-for': '198.51.100.7' },
        socket: { remoteAddress: '::ffff:10.0.0.2' },
      },
      compileTrustedProxies('10.0.0.2'),
    );
    expect(ip).toBe('198.51.100.7');
  });

  it('daftar trustedProxies kosong (default) → X-Forwarded-For SELALU diabaikan', () => {
    const ip = resolveClientIp(
      {
        headers: { 'x-forwarded-for': '1.2.3.4' },
        socket: { remoteAddress: '10.0.0.2' },
      },
      compileTrustedProxies(''),
    );
    expect(ip).toBe('10.0.0.2');
  });
});

describe('resolveClientIp — CF-Connecting-IP (SEC-1)', () => {
  it('dari proxy tepercaya → CF-Connecting-IP didahulukan atas X-Forwarded-For', () => {
    const ip = resolveClientIp(
      {
        headers: {
          'cf-connecting-ip': '198.51.100.20',
          'x-forwarded-for': '172.18.0.5',
        },
        socket: { remoteAddress: '10.0.0.2' },
      },
      compileTrustedProxies('10.0.0.2'),
    );
    expect(ip).toBe('198.51.100.20');
  });

  it('dari sumber TAK tepercaya → CF-Connecting-IP diabaikan', () => {
    const ip = resolveClientIp(
      {
        headers: { 'cf-connecting-ip': '1.2.3.4' },
        socket: { remoteAddress: '203.0.113.9' },
      },
      compileTrustedProxies('10.0.0.2'),
    );
    expect(ip).toBe('203.0.113.9');
  });
});

describe('compileTrustedProxies — semantik Express trust proxy (CIDR & rentang)', () => {
  const req = (socket: string) => ({
    headers: { 'cf-connecting-ip': '198.51.100.7' },
    socket: { remoteAddress: socket },
  });

  it('CIDR: peer di dalam subnet dipercaya, di luar tidak', () => {
    const trust = compileTrustedProxies('172.18.0.0/16');
    expect(resolveClientIp(req('172.18.3.4'), trust)).toBe('198.51.100.7');
    expect(resolveClientIp(req('172.19.0.1'), trust)).toBe('172.19.0.1');
  });

  it('nama rentang `uniquelocal` (10/8, 172.16/12, 192.168/16) & IPv4-mapped', () => {
    const trust = compileTrustedProxies('uniquelocal');
    expect(resolveClientIp(req('::ffff:192.168.1.9'), trust)).toBe(
      '198.51.100.7',
    );
    expect(resolveClientIp(req('203.0.113.9'), trust)).toBe('203.0.113.9');
  });

  it('entri tak valid → melempar (boot gagal, bukan diam-diam tak dipercaya)', () => {
    expect(() => compileTrustedProxies('bukan-ip')).toThrow();
  });
});
