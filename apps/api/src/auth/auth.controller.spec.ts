// acme-backend/src/auth/auth.controller.spec.ts
//
// Unit test — AuthService & ConfigService di-mock (tanpa DB, tanpa .env).
// Fokus: cookie `secure` mengikuti NODE_ENV lewat ConfigService, BUKAN
// `process.env` telanjang (fase-1-vertikal-rab.md §2.4). `secure: true` keras
// menolak cookie tersimpan di http://localhost — perbaikan ini WAJIB tetap
// `secure: true` saat NODE_ENV=production, itu satu-satunya alasan longgar
// diizinkan untuk dev.
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthResult, AuthService } from './auth.service';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from './constants';

interface MockAuthService {
  login: jest.Mock;
  changePassword: jest.Mock;
}

interface MockConfigService {
  get: jest.Mock;
}

interface MockResponse {
  cookie: jest.Mock<void, [string, string, Record<string, unknown>]>;
  clearCookie: jest.Mock;
}

function mockResponse(): MockResponse {
  return {
    cookie: jest.fn<void, [string, string, Record<string, unknown>]>(),
    clearCookie: jest.fn(),
  };
}

function fakeAuthResult(): AuthResult {
  return {
    accessToken: 'access.jwt',
    refreshToken: 'refresh.jwt',
    refreshExpiresAt: new Date(Date.now() + 1000),
    user: {
      id: 'u1',
      email: 'x@acme.local',
      fullName: 'X',
      role: 'pimpinan',
      mustChangePassword: false,
    },
  };
}

describe('AuthController (unit) — cookie secure', () => {
  let authService: MockAuthService;
  let config: MockConfigService;
  let controller: AuthController;

  beforeEach(() => {
    authService = { login: jest.fn(), changePassword: jest.fn() };
    config = { get: jest.fn() };
    controller = new AuthController(
      authService as unknown as AuthService,
      config as unknown as ConfigService,
    );
  });

  it('secure=false saat NODE_ENV=development (dev, http://localhost)', async () => {
    config.get.mockReturnValue('development');
    authService.login.mockResolvedValue(fakeAuthResult());
    const res = mockResponse();

    await controller.login(
      { email: 'x@acme.local', password: 'x' },
      res as unknown as Response,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      ACCESS_COOKIE_NAME,
      'access.jwt',
      expect.objectContaining({
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'refresh.jwt',
      expect.objectContaining({
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('secure=true saat NODE_ENV=production — production tak boleh ikut turun standar', async () => {
    config.get.mockReturnValue('production');
    authService.login.mockResolvedValue(fakeAuthResult());
    const res = mockResponse();

    await controller.login(
      { email: 'x@acme.local', password: 'x' },
      res as unknown as Response,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      ACCESS_COOKIE_NAME,
      'access.jwt',
      expect.objectContaining({ secure: true }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'refresh.jwt',
      expect.objectContaining({ secure: true }),
    );
  });

  it('httpOnly, sameSite, dan path TAK berubah — hanya secure yang bergantung env', async () => {
    config.get.mockReturnValue('test');
    authService.login.mockResolvedValue(fakeAuthResult());
    const res = mockResponse();

    await controller.login(
      { email: 'x@acme.local', password: 'x' },
      res as unknown as Response,
    );

    const opts = res.cookie.mock.calls[0][2];
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
  });
});
