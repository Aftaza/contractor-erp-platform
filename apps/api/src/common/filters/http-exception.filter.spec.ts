// acme-backend/src/common/filters/http-exception.filter.spec.ts
import { ArgumentsHost, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WarningsException } from '../warnings';
import { ApiErrorBody, HttpExceptionFilter } from './http-exception.filter';

function createHost(request: Record<string, unknown> = {}) {
  const json = jest.fn<void, [ApiErrorBody]>();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url: '/test', method: 'GET', ...request }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('menghasilkan bentuk error §3.1 untuk HttpException', () => {
    const { host, status, json } = createHost({ requestId: 'req-123' });

    filter.catch(new ForbiddenException('Tidak diizinkan'), host);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Tidak diizinkan',
      requestId: 'req-123',
    });
  });

  it('422 pola A: error "Warnings" + warnings[] (FR-NTF-7)', () => {
    const { host, status, json } = createHost({ requestId: 'req-422' });
    const warnings = [{ code: 'X', message: 'pesan', ref: 'id-1' }];

    filter.catch(new WarningsException(warnings), host);

    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith({
      statusCode: 422,
      error: 'Warnings',
      message: 'Periksa peringatan sebelum menyimpan',
      requestId: 'req-422',
      warnings,
    });
  });

  it('membuat requestId sendiri bila request belum sempat melewati interceptor', () => {
    const { host, json } = createHost({ requestId: undefined });

    filter.catch(new ForbiddenException('ditolak'), host);

    const body = json.mock.calls[0][0];
    expect(typeof body.requestId).toBe('string');
    expect(body.requestId.length).toBeGreaterThan(0);
  });

  it('tak pernah membocorkan detail error tak terduga (500 generik, tanpa stack trace)', () => {
    const { host, status, json } = createHost({ requestId: 'req-500' });

    filter.catch(new Error('detail internal rahasia'), host);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.error).toBe('Internal Server Error');
    expect(body.message).not.toContain('detail internal rahasia');
    expect(body.message).not.toContain('at ');
    expect(body.requestId).toBe('req-500');
  });

  it('menggabungkan pesan validasi class-validator (array) jadi satu string', () => {
    const { host, json } = createHost({ requestId: 'req-400' });

    filter.catch(
      new (class extends ForbiddenException {
        constructor() {
          super({
            message: ['email wajib diisi', 'password terlalu pendek'],
            statusCode: 400,
          });
        }
      })(),
      host,
    );

    const body = json.mock.calls[0][0];
    expect(body.message).toBe('email wajib diisi, password terlalu pendek');
  });
});

describe('HttpExceptionFilter — peta error Prisma (SEC-8)', () => {
  const prismaError = (code: string, meta?: Record<string, unknown>) =>
    new Prisma.PrismaClientKnownRequestError('detail internal rahasia', {
      code,
      clientVersion: 'test',
      meta,
    });

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['P2025', undefined, 404, 'Data tidak ditemukan'],
    [
      'P2002',
      { target: ['code'] },
      409,
      'Data dengan code yang sama sudah ada',
    ],
    [
      'P2002',
      { target: 'tools_code_active_key' },
      409,
      'Data yang sama sudah ada',
    ],
    [
      'P2003',
      { field_name: 'vendor_id' },
      409,
      'Data masih dipakai oleh data lain',
    ],
    ['P2010', { code: '23503' }, 409, 'Data masih dipakai oleh data lain'],
  ])('%s → %i', (code, meta, statusCode, message) => {
    const { host, json } = createHost({ requestId: 'r' });

    new HttpExceptionFilter().catch(prismaError(code, meta), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode, message }),
    );
  });

  it('kode Prisma tak dikenal tetap 500 generik', () => {
    const { host, json } = createHost({ requestId: 'r' });

    new HttpExceptionFilter().catch(prismaError('P2034'), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );
  });
});
