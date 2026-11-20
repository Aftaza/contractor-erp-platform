// acme-backend/src/project-tools/project-tools.db-spec.ts
//
// Integrasi (Postgres nyata, master §9.2) — WP-18, database test
// `acme_test_wp18` (fase-2-keuangan-operasional.md §2.6). Boot AppModule
// SUNGGUHAN + configureApp (pola sama `auth-me.db-spec.ts`/
// `role-revocation.db-spec.ts`) — supaya rantai guard (JwtAuthGuard ->
// RolesGuard) DAN `PolicyService.canMutateProjectTool` (dipanggil dari
// `ProjectToolsService`) sama-sama teruji lewat HTTP nyata, bukan mock.
//
// Jalankan (WAJIB prefix DATABASE_URL inline — fase-2 §2.6):
//   DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/acme_test_wp18" \
//     npx jest --config test/jest-db.json --runInBand src/project-tools/project-tools.db-spec.ts
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

interface ProjectToolResponseBody {
  id: string;
  approvalStatus: string;
  recordedBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
}

const prisma = new PrismaClient();
const PASSWORD = 'PasswordAwal-123!';

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
      email: `wp18-pt-${randomUUID()}@acme.local`,
      passwordHash,
      fullName: `WP-18 ProjectTools Test ${role}`,
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

describe('project-tools (Postgres nyata) — WP-18', () => {
  let app: INestApplication<App>;
  const createdUserIds: string[] = [];
  const createdProjectIds: string[] = [];
  const createdToolIds: string[] = [];
  const createdRowIds: string[] = [];

  let pimpinanToken: string;
  let pimpinanId: string;
  let staffAToken: string;
  let staffAId: string;
  let staffBToken: string;
  let projectId: string;
  let toolId: string;

  // Timeout 30s: boot AppModule PENUH + 3x argon2 hash/login sekuensial
  // melebihi default jest 5000ms — waktu startup nyata, bukan tanda
  // kelambatan logika (sama seperti tools.db-spec.ts).
  beforeAll(async () => {
    app = await bootApp();

    const pimpinan = await createUserAndLogin(
      app,
      Role.pimpinan,
      createdUserIds,
    );
    pimpinanToken = pimpinan.token;
    pimpinanId = pimpinan.userId;

    const staffA = await createUserAndLogin(
      app,
      Role.staff_gudang,
      createdUserIds,
    );
    staffAToken = staffA.token;
    staffAId = staffA.userId;

    const staffB = await createUserAndLogin(
      app,
      Role.staff_gudang,
      createdUserIds,
    );
    staffBToken = staffB.token;

    const project = await prisma.project.create({
      data: {
        name: `WP-18 Proyek ${randomUUID()}`,
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
      data: { name: 'Molen Beton', createdBy: pimpinanId },
    });
    toolId = tool.id;
    createdToolIds.push(tool.id);
  }, 30000);

  afterAll(async () => {
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

  it('staff_gudang membuat project_tools → approvalStatus=pending & recordedBy=dirinya (tak bisa dioverride body)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/project-tools`)
      .set('Authorization', `Bearer ${staffAToken}`)
      .send({ toolId, quantity: 2, notes: 'Dipakai minggu ini' })
      .expect(201);
    const row = res.body as ProjectToolResponseBody;
    createdRowIds.push(row.id);

    expect(row.approvalStatus).toBe('pending');
    expect(row.recordedBy).toBe(staffAId);
  });

  it('staff_gudang DITOLAK 403 saat PATCH baris milik user lain (PolicyService, bukan controller)', async () => {
    const created = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/project-tools`)
      .set('Authorization', `Bearer ${staffAToken}`)
      .send({ toolId })
      .expect(201);
    const row = created.body as ProjectToolResponseBody;
    createdRowIds.push(row.id);

    await request(app.getHttpServer())
      .patch(`/api/v1/project-tools/${row.id}`)
      .set('Authorization', `Bearer ${staffBToken}`)
      .send({ notes: 'Milik orang lain' })
      .expect(403);
  });

  it('staff_gudang DITOLAK 403 saat PATCH baris miliknya sendiri yang sudah approved', async () => {
    const created = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/project-tools`)
      .set('Authorization', `Bearer ${staffAToken}`)
      .send({ toolId })
      .expect(201);
    const row = created.body as ProjectToolResponseBody;
    createdRowIds.push(row.id);

    await request(app.getHttpServer())
      .patch(`/api/v1/project-tools/${row.id}/approve`)
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .send({ approvalStatus: 'approved' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/project-tools/${row.id}`)
      .set('Authorization', `Bearer ${staffAToken}`)
      .send({ notes: 'Sudah approved' })
      .expect(403);
  });

  it('pimpinan approve → approvedBy + approvedAt terisi', async () => {
    const created = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/project-tools`)
      .set('Authorization', `Bearer ${staffAToken}`)
      .send({ toolId })
      .expect(201);
    const row = created.body as ProjectToolResponseBody;
    createdRowIds.push(row.id);

    const approved = await request(app.getHttpServer())
      .patch(`/api/v1/project-tools/${row.id}/approve`)
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .send({ approvalStatus: 'approved' })
      .expect(200);
    const body = approved.body as ProjectToolResponseBody;

    expect(body.approvalStatus).toBe('approved');
    expect(body.approvedBy).toBe(pimpinanId);
    expect(body.approvedAt).not.toBeNull();
  });

  it('GET /projects/:id/project-tools mengembalikan bentuk {data, meta} master §3.2, scoped ke proyek', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/project-tools`)
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
  });
});
