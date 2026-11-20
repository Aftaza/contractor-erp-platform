// e2e tanpa Postgres untuk SEC-3 & SEC-8 (SRS §3.12): validasi param/query
// ditolak 400 sebelum service menyentuh DB. AUTH_VERIFIER di-override agar
// request lolos JwtAuthGuard sebagai pimpinan tanpa lookup DB.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { AUTH_VERIFIER } from '../../src/common/guards/jwt-auth.guard';
import { configureApp } from '../../src/config/app-setup';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Hardening P0 — SEC-3 & SEC-8 (e2e)', () => {
  let app: INestApplication<App>;
  const auth = 'Bearer dummy';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .overrideProvider(AUTH_VERIFIER)
      .useValue({
        verify: () =>
          Promise.resolve({
            id: '00000000-0000-0000-0000-000000000001',
            role: 'pimpinan',
            mustChangePassword: false,
          }),
      })
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('SEC-8: GET /projects/abc → 400 (bukan 500)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/projects/abc')
      .set('Authorization', auth)
      .expect(400);
  });

  it.each(['/projects', '/users', '/clients', '/vendors', '/tools', '/audit'])(
    'SEC-3: GET %s?perPage=1000 → 400; perPage=0 & page=0 → 400',
    async (path) => {
      const server = app.getHttpServer();
      for (const q of ['perPage=1000', 'perPage=0', 'page=0']) {
        await request(server)
          .get(`/api/v1${path}?${q}`)
          .set('Authorization', auth)
          .expect(400);
      }
    },
  );
});
