// acme-backend/src/public/public.db-spec.ts
//
// Integrasi (Postgres nyata, master §9.2) — WP-21, database test
// `acme_test_wp21` (fase-3-pelaporan-publikasi.md §2.11).
//
// Ini test KEBOCORAN DTO PUBLIK (master §9.4): `/public/projects` menghadap
// internet tanpa auth, jadi assertion-nya ditulis sebagai **allowlist daftar
// kunci** — bukan daftar kunci terlarang. Konsekuensinya disengaja: kolom
// baru yang ikut terserialisasi membuat test ini MERAH secara default,
// alih-alih bocor diam-diam.
//
// Jalankan (WAJIB prefix DATABASE_URL inline):
//   DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/acme_test_wp21" \
//     npx jest --config test/jest-db.json --runInBand src/public/public.db-spec.ts
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, PublicCategory } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { configureApp } from '../config/app-setup';

const raw = new PrismaClient();

/** Kontrak beku §2.6 — TUJUH kunci, tak lebih. */
const EXPECTED_KEYS = [
  'id',
  'title',
  'summary',
  'category',
  'images',
  'location',
  'endDate',
].sort();

interface PublicListBody {
  data: Record<string, unknown>[];
  meta: { page: number; perPage: number; total: number };
}

describe('GET /public/projects — batas kepercayaan (WP-21)', () => {
  let app: INestApplication<App>;
  const projectIds: string[] = [];
  const clientIds: string[] = [];

  let publishedId: string;
  let unpublishedId: string;
  let publishedNoTitleId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const client = await raw.client.create({
      data: { name: `WP-21 Klien Rahasia ${randomUUID()}` },
    });
    clientIds.push(client.id);

    // (1) Terbit + judul publik terisi -> HARUS muncul. Sengaja diberi
    //     contractValue & clientId supaya kebocorannya bisa terdeteksi.
    const published = await raw.project.create({
      data: {
        name: `WP-21 Public ${randomUUID()}`,
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
        contractValue: 7_777_777_777n,
        clientId: client.id,
        isPublished: true,
        publicTitle: 'Rehabilitasi Conveyor Line 2',
        publicSummary: 'Pekerjaan mekanikal di area produksi.',
        publicCategory: PublicCategory.Industri,
        publicImages: ['/uploads/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp'],
      },
    });
    publishedId = published.id;
    projectIds.push(published.id);

    // (2) Tak terbit -> TAK BOLEH muncul.
    const unpublished = await raw.project.create({
      data: {
        name: `WP-21 Unpublished ${randomUUID()}`,
        location: 'Sidoarjo',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-02-01'),
        isPublished: false,
        publicTitle: 'Judul ini tak boleh terlihat publik',
      },
    });
    unpublishedId = unpublished.id;
    projectIds.push(unpublished.id);

    // (3) Terbit TAPI publicTitle NULL -> TAK BOLEH muncul (§2.6).
    const publishedNoTitle = await raw.project.create({
      data: {
        name: `WP-21 Published Tanpa Judul ${randomUUID()}`,
        location: 'Lamongan',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-03-01'),
        isPublished: true,
        publicTitle: null,
      },
    });
    publishedNoTitleId = publishedNoTitle.id;
    projectIds.push(publishedNoTitle.id);
    // Boot Nest + 4 insert bisa melewati 5 detik default Jest, dan
    // `test/jest-db.json` tak menyetel testTimeout. Timeout per-hook di sini,
    // bukan di config bersama.
  }, 60_000);

  afterAll(async () => {
    if (projectIds.length > 0) {
      await raw.project.deleteMany({ where: { id: { in: projectIds } } });
    }
    if (clientIds.length > 0) {
      await raw.client.deleteMany({ where: { id: { in: clientIds } } });
    }
    await raw.$disconnect();
    await app.close();
  });

  /** Tanpa cookie & tanpa Authorization — persis cara situs Astro memanggilnya. */
  async function fetchPublic(): Promise<PublicListBody> {
    const res = await request(app.getHttpServer())
      .get('/api/v1/public/projects')
      .query({ perPage: 100 })
      .expect(200);
    return res.body as PublicListBody;
  }

  it('anonim (tanpa cookie/token) -> 200, bukan 401', async () => {
    const body = await fetchPublic();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta.perPage).toBe(100);
  });

  it('proyek isPublished=false TAK muncul', async () => {
    const body = await fetchPublic();
    expect(body.data.map((r) => r.id)).not.toContain(unpublishedId);
  });

  it('proyek isPublished=true tapi publicTitle NULL TAK muncul', async () => {
    const body = await fetchPublic();
    expect(body.data.map((r) => r.id)).not.toContain(publishedNoTitleId);
  });

  it('daftar kunci tiap baris PERSIS 7 nama (allowlist, master §9.4)', async () => {
    const body = await fetchPublic();
    expect(body.data.length).toBeGreaterThan(0);
    for (const row of body.data) {
      expect(Object.keys(row).sort()).toEqual(EXPECTED_KEYS);
    }
  });

  it('contractValue & clientId TAK muncul meski proyeknya punya nilai', async () => {
    const body = await fetchPublic();
    const row = body.data.find((r) => r.id === publishedId);

    expect(row).toBeDefined();
    // Proyek ini memang punya contractValue 7_777_777_777 dan clientId di DB.
    for (const forbidden of [
      'contractValue',
      'contract_value',
      'clientId',
      'client_id',
      'client',
      'rabStatus',
      'progress',
      'name',
    ]) {
      expect(row).not.toHaveProperty(forbidden);
    }
    // Nilai kontraknya juga tak boleh menyelinap lewat serialisasi apa pun.
    expect(JSON.stringify(row)).not.toContain('7777777777');
    // Dan bentuk yang BENAR tetap terkirim.
    expect(row?.title).toBe('Rehabilitasi Conveyor Line 2');
    expect(row?.endDate).toBe('2026-06-30');
  });
});
