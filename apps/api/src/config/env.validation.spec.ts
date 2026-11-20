// acme-backend/src/config/env.validation.spec.ts
import { validateEnv } from './env.validation';

const VALID: Record<string, unknown> = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/acme?schema=public',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  NODE_ENV: 'development',
  PORT: '3001',
};

describe('validateEnv', () => {
  it('lolos dan mengonversi PORT jadi number untuk konfigurasi valid', () => {
    const env = validateEnv(VALID);
    expect(env.DATABASE_URL).toBe(VALID.DATABASE_URL);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3001);
    expect(typeof env.PORT).toBe('number');
  });

  it.each([
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'NODE_ENV',
    'PORT',
  ])('gagal (boot gagal) saat %s hilang', (key) => {
    const incomplete = { ...VALID };
    delete incomplete[key];
    expect(() => validateEnv(incomplete)).toThrow(
      /Konfigurasi environment tidak valid/,
    );
  });

  it('menolak DATABASE_URL tanpa skema postgresql://', () => {
    expect(() =>
      validateEnv({ ...VALID, DATABASE_URL: 'mysql://localhost/acme' }),
    ).toThrow(/DATABASE_URL/);
  });

  it('menolak JWT secret yang terlalu pendek', () => {
    expect(() =>
      validateEnv({ ...VALID, JWT_ACCESS_SECRET: 'pendek' }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('menolak NODE_ENV di luar development|production|test', () => {
    expect(() => validateEnv({ ...VALID, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });

  it.each(['bukan-angka', '0', '70000', '-1'])(
    'menolak PORT invalid: %s',
    (port) => {
      expect(() => validateEnv({ ...VALID, PORT: port })).toThrow(/PORT/);
    },
  );
});
