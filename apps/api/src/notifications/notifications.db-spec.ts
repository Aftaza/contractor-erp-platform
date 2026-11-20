// acme-backend/src/notifications/notifications.db-spec.ts
//
// Integrasi (Postgres nyata, master §9.2) — WP-19, database test
// `acme_test_wp19` (fase-2-keuangan-operasional.md §2.6). Boot AppModule
// SUNGGUHAN + configureApp (pola sama `project-tools.db-spec.ts`) supaya
// tiga hal teruji lewat HTTP nyata, bukan mock:
//
//   1. Scoping "miliknya" — ADA DI SERVICE, bukan di matriks. Baris
//      `test/authz/rows/notifications.rows.ts` meloloskan ketiga role; yang
//      memisahkan data antar-user adalah `where: { userId }`.
//   2. `PATCH /:id/read` atas milik orang lain → 404, BUKAN 403 (fase-2 §4
//      WP-19: jangan bocorkan keberadaannya).
//   3. Emitter fase-2 §2.3 — membuat `project_tools` pending menerbitkan
//      notifikasi untuk pimpinan aktif. Ini SATU-SATUNYA test yang menutupi
//      penyambungan lintas modul itu; unit spec `project-tools.service.spec.ts`
//      sengaja men-stub `notifyRole`.
//
// Jalankan (WAJIB prefix DATABASE_URL inline — fase-2 §2.6):
//   DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/acme_test_wp19" \
//     npx jest --config test/jest-db.json --runInBand src/notifications/notifications.db-spec.ts
import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { configureApp } from '../config/app-setup';
import { authCookie } from '../../test/auth-cookie';

interface LoginResponseBody {
  user: { id: string };
}

interface NotificationBody {
  id: string;
  title: string;
  isRead: boolean;
}

interface NotificationListBody {
  data: NotificationBody[];
  meta: { total: number };
}

const prisma = new PrismaClient();
const PASSWORD = 'PasswordAwal-123!';
const JUDUL_EMITTER = 'Pemakaian alat menunggu persetujuan';

async function bootApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

async function createUserAndLogin(
  app: INestApplication<App>,
  role: Role,
  createdUserIds: string[],
): Promise<{ token: string; userId: string }> {
  const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: {
      email: `wp19-notif-${randomUUID()}@acme.local`,
      passwordHash,
      fullName: `WP-19 Notif Test ${role}`,
      role,
      mustChangePassword: false,
    },
  });
  createdUserIds.push(user.id);

  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: PASSWORD })
    .expect(200);
  const body = res.body as LoginResponseBody;
  return { token: authCookie(res, 'access_token'), userId: body.user.id };
}

describe('notifications (Postgres nyata) — WP-19', () => {
  let app: INestApplication<App>;
  const createdUserIds: string[] = [];
  const createdProjectIds: string[] = [];
  const createdToolIds: string[] = [];
  const createdRowIds: string[] = [];

  let pimpinanId: string;
  let staffToken: string;
  let staffId: string;
  let projectId: string;
  let toolId: string;

  // Timeout 30s: boot AppModule PENUH + 2x argon2 hash/login sekuensial
  // melebihi default hook jest 5000ms — waktu startup nyata, bukan tanda
  // kelambatan logika (pelajaran WP-18).
  beforeAll(async () => {
    app = await bootApp();

    const pimpinan = await createUserAndLogin(
      app,
      Role.pimpinan,
      createdUserIds,
    );
    pimpinanId = pimpinan.userId;

    const staff = await createUserAndLogin(
      app,
      Role.staff_gudang,
      createdUserIds,
    );
    staffToken = staff.token;
    staffId = staff.userId;

    const project = await prisma.project.create({
      data: {
        name: `WP-19 Proyek ${randomUUID()}`,
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
        createdBy: pimpinanId,
      },
    });
    projectId = project.id;
    createdProjectIds.push(project.id);

    const tool = await prisma.tool.create({
      data: { name: 'Genset 10kVA', createdBy: pimpinanId },
    });
    toolId = tool.id;
    createdToolIds.push(tool.id);
  }, 30000);

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    if (createdRowIds.length > 0) {
      await prisma.projectTool.deleteMany({
        where: { id: { in: createdRowIds } },
      });
    }
    if (createdToolIds.length > 0) {
      await prisma.tool.deleteMany({ where: { id: { in: createdToolIds } } });
    }
    if (createdProjectIds.length > 0) {
      await prisma.project.deleteMany({
        where: { id: { in: createdProjectIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
    await app.close();
  });

  it('staff_gudang mencatat pemakaian alat → pimpinan aktif menerima notifikasi (emitter §2.3)', async () => {
    // Hitung dulu supaya assertion tahan terhadap baris sisa spec lain di
    // database yang sama — yang diuji PERTAMBAHANNYA, bukan total.
    const before = await prisma.notification.count({
      where: { userId: pimpinanId },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/project-tools`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ toolId, quantity: 1 })
      .expect(201);
    createdRowIds.push((res.body as { id: string }).id);

    const after = await prisma.notification.count({
      where: { userId: pimpinanId },
    });
    expect(after).toBe(before + 1);

    const notif = await prisma.notification.findFirst({
      where: { userId: pimpinanId },
      orderBy: { createdAt: 'desc' },
    });
    // Pesan wajib menyebut nama alat & proyek, link menunjuk halaman alat
    // proyek itu — tanpa keduanya notifikasinya tak bisa ditindaklanjuti.
    expect(notif?.title).toBe(JUDUL_EMITTER);
    expect(notif?.message).toContain('Genset 10kVA');
    expect(notif?.link).toBe(`/projects/${projectId}/tools`);
    expect(notif?.isRead).toBe(false);
  }, 20000);

  it('staff_gudang HANYA melihat notifikasinya sendiri', async () => {
    await prisma.notification.create({
      data: {
        userId: staffId,
        type: 'info',
        title: 'Khusus staff',
        message: 'Hanya untuk staff gudang.',
      },
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
    const body = res.body as NotificationListBody;

    expect(body.data.length).toBeGreaterThan(0);
    // Notifikasi pimpinan dari test sebelumnya TIDAK boleh bocor ke sini.
    expect(body.data.every((n) => n.title !== JUDUL_EMITTER)).toBe(true);

    const owned = await prisma.notification.findMany({
      where: { userId: staffId },
      select: { id: true },
    });
    const ownedIds = owned.map((n) => n.id);
    expect(body.data.every((n) => ownedIds.includes(n.id))).toBe(true);
  });

  it('PATCH /:id/read atas notifikasi milik orang lain → 404 (bukan 403)', async () => {
    const milikPimpinan = await prisma.notification.create({
      data: {
        userId: pimpinanId,
        type: 'info',
        title: 'Rahasia pimpinan',
        message: 'Tak boleh terlihat staff.',
      },
    });

    // 404, BUKAN 403: 403 mengonfirmasi baris itu ADA — kebocoran keberadaan,
    // bentuk kebocoran yang paling mudah lolos review.
    await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${milikPimpinan.id}/read`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(404);

    // Dan barisnya tetap belum terbaca — penolakannya bukan sekadar kosmetik.
    const masihAda = await prisma.notification.findUnique({
      where: { id: milikPimpinan.id },
    });
    expect(masihAda?.isRead).toBe(false);
  });

  it('pemilik BISA menandai notifikasinya sendiri terbaca', async () => {
    const milikStaff = await prisma.notification.create({
      data: {
        userId: staffId,
        type: 'info',
        title: 'Punya staff',
        message: 'Boleh ditandai terbaca.',
      },
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${milikStaff.id}/read`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    expect((res.body as NotificationBody).isRead).toBe(true);
  });

  it('anonim ditolak 401 di GET /notifications', async () => {
    await request(app.getHttpServer()).get('/api/v1/notifications').expect(401);
  });
});
