// acme-backend/test/bootstrap.e2e-spec.ts
//
// Menguji wiring yang dipasang configureApp() (src/config/app-setup.ts) —
// fungsi yang SAMA dipakai main.ts saat boot sungguhan. App dibangun dari
// HealthModule + controller uji lokal (bukan AppModule penuh), karena
// HealthModule belum terdaftar di app.module.ts (lihat catatan di
// src/health/health.module.ts dan laporan akhir WP-01) — ini membuktikan
// modul WP-01 sendiri benar, terlepas dari status wiring itu.
import { Body, Controller, Get, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiErrorBody } from '../src/common/filters/http-exception.filter';
import { configureApp } from '../src/config/app-setup';
import { HealthModule } from '../src/health/health.module';

class SampleDto {
  @IsString()
  name!: string;
}

@Controller('sample')
class SampleController {
  @Post()
  create(@Body() dto: SampleDto): SampleDto {
    return dto;
  }
}

@Controller('boom')
class BoomController {
  @Get()
  explode(): never {
    throw new Error('rahasia internal: query gagal di baris 42');
  }
}

describe('Bootstrap wiring (configureApp, dipakai main.ts) — e2e', () => {
  let app: INestApplication<App>;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
      controllers: [SampleController, BoomController],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    process.env.NODE_ENV = originalNodeEnv;
    await app.close();
  });

  it('GET /health -> 200 (di luar prefix /api/v1, untuk healthcheck Docker)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('DTO dengan field asing -> 400 (whitelist + forbidNonWhitelisted)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/sample')
      .send({ name: 'valid', extra: 'field asing' })
      .expect(400);
  });

  it('DTO valid tanpa field asing -> lolos', () => {
    return request(app.getHttpServer())
      .post('/api/v1/sample')
      .send({ name: 'valid' })
      .expect(201)
      .expect({ name: 'valid' });
  });

  it('error tak terduga saat production tak memuat stack trace / detail internal', async () => {
    process.env.NODE_ENV = 'production';

    const res = await request(app.getHttpServer())
      .get('/api/v1/boom')
      .expect(500);

    const body = res.body as ApiErrorBody;
    expect(body).not.toHaveProperty('stack');
    expect(JSON.stringify(body)).not.toContain('rahasia internal');
    expect(body).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Terjadi kesalahan pada server',
    });
    expect(typeof body.requestId).toBe('string');
  });
});
