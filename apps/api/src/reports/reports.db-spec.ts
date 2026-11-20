// acme-backend/src/reports/reports.db-spec.ts
//
// Integrasi (Postgres nyata, master §9.2) — WP-20, database test
// `acme_test_wp20` (fase-3-pelaporan-publikasi.md §2.11). Membuktikan DoD
// paket ini (§4 WP-20):
//   (a) 3 proyek dengan termin+expense+pembelian -> summary.realisasiBiaya
//       sama dengan jumlah manual yang ditulis di test
//   (b) byClient mengelompokkan 2 proyek satu klien jadi 1 baris projectCount=2
//   (c) byMonth mengembalikan TEPAT 12 elemen
//   (d) staff_gudang 403 di ketiga endpoint reports (rantai guard sungguhan,
//       pola sama test/authz/role-revocation.db-spec.ts)
//
// Jalankan (WAJIB prefix DATABASE_URL inline):
//   DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/acme_test_wp20" \
//     npx jest --config test/jest-db.json --runInBand src/reports/reports.db-spec.ts
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NodeType, PrismaClient, Role, TerminStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { configureApp } from '../config/app-setup';
import { auditContextStorage } from '../audit/audit-context';
import { withAuditExtension } from '../audit/audit.extension';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';
import { authCookie } from '../../test/auth-cookie';

const raw = new PrismaClient();
const prisma = withAuditExtension(raw);
const service = new ReportsService(prisma as unknown as PrismaService);

describe('ReportsService — integrasi Postgres nyata (WP-20)', () => {
  let userId: string;
  const projectIds: string[] = [];
  const clientIds: string[] = [];

  beforeAll(async () => {
    const user = await raw.user.create({
      data: {
        email: `wp20-reports-${randomUUID()}@acme.local`,
        passwordHash: 'x',
        fullName: 'WP-20 Reports Test User',
        role: 'pimpinan',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (projectIds.length > 0) {
      // purchase_notes RESTRICT → hapus dulu (baris ikut CASCADE); sisanya CASCADE.
      await raw.purchaseNote.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      await raw.project.deleteMany({ where: { id: { in: projectIds } } });
    }
    if (clientIds.length > 0) {
      await raw.client.deleteMany({ where: { id: { in: clientIds } } });
    }
    await raw.auditLog.deleteMany({ where: { userId } });
    await raw.user.delete({ where: { id: userId } });
    await raw.$disconnect();
  });

  function withUser<T>(fn: () => Promise<T>): Promise<T> {
    return auditContextStorage.run({ userId, clientIp: '127.0.0.1' }, fn);
  }

  async function makeProject(opts: {
    contractValue: number;
    clientId?: string;
    purchasedAmount: number;
    expenseAmount: number;
    paidAmount: number;
    unpaidAmount?: number;
  }) {
    const project = await raw.project.create({
      data: {
        name: `WP-20 Reports ${randomUUID()}`,
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
        contractValue: BigInt(opts.contractValue),
        clientId: opts.clientId,
      },
    });
    projectIds.push(project.id);

    const section = await raw.rabNode.create({
      data: { projectId: project.id, nodeType: NodeType.section, name: 'S' },
    });
    const item = await raw.rabNode.create({
      data: {
        projectId: project.id,
        parentId: section.id,
        nodeType: NodeType.item,
        name: 'Item dibeli',
        volume: 1,
        unit: 'ls',
        materialPrice: 0n,
      },
    });
    // Pembelian = baris nota (FR-FIN-3); nota terhapus tak boleh ikut terhitung.
    await raw.purchaseNote.create({
      data: {
        projectId: project.id,
        noteDate: new Date('2026-08-01'),
        lines: {
          create: {
            rabNodeId: item.id,
            quantity: 1,
            unitPrice: BigInt(opts.purchasedAmount),
          },
        },
      },
    });
    await raw.purchaseNote.create({
      data: {
        projectId: project.id,
        noteDate: new Date('2026-08-01'),
        deletedAt: new Date(),
        lines: {
          create: {
            rabNodeId: item.id,
            quantity: 1,
            unitPrice: 999_999n,
            deletedAt: new Date(),
          },
        },
      },
    });

    await withUser(() =>
      raw.expense.create({
        data: {
          projectId: project.id,
          description: 'Expense manual test',
          amount: BigInt(opts.expenseAmount),
          expenseDate: new Date('2026-08-01'),
          category: 'lain_lain',
          recordedBy: userId,
        },
      }),
    );

    await withUser(() =>
      raw.termin.create({
        data: {
          projectId: project.id,
          name: 'Termin Lunas',
          type: 'termin',
          amount: BigInt(opts.paidAmount),
          status: TerminStatus.Lunas,
          paidDate: new Date('2026-08-01'),
        },
      }),
    );
    if (opts.unpaidAmount) {
      await withUser(() =>
        raw.termin.create({
          data: {
            projectId: project.id,
            name: 'Termin Belum Bayar',
            type: 'termin',
            amount: BigInt(opts.unpaidAmount as number),
            status: TerminStatus.BelumBayar,
          },
        }),
      );
    }

    return project;
  }

  describe('agregasi 3 proyek, 2 di klien yang sama', () => {
    let clientAId: string;

    beforeAll(async () => {
      const clientA = await raw.client.create({
        data: { name: `Klien A ${randomUUID()}` },
      });
      clientAId = clientA.id;
      clientIds.push(clientA.id);

      await makeProject({
        contractValue: 500_000_000,
        clientId: clientAId,
        purchasedAmount: 100_000_000,
        expenseAmount: 20_000_000,
        paidAmount: 150_000_000,
        unpaidAmount: 50_000_000,
      });
      await makeProject({
        contractValue: 300_000_000,
        clientId: clientAId,
        purchasedAmount: 50_000_000,
        expenseAmount: 10_000_000,
        paidAmount: 80_000_000,
      });
      await makeProject({
        contractValue: 200_000_000,
        purchasedAmount: 0,
        expenseAmount: 5_000_000,
        paidAmount: 20_000_000,
      });
    });

    it('summary.realisasiBiaya = jumlah manual (purchased+expense ketiga proyek) (DoD a)', async () => {
      const result = await service.finance();

      const expectedRealisasi =
        100_000_000 + 20_000_000 + (50_000_000 + 10_000_000) + (0 + 5_000_000);
      const expectedPaid = 150_000_000 + 80_000_000 + 20_000_000;

      expect(result.summary.realisasiBiaya).toBe(expectedRealisasi);
      expect(result.summary.paidTotal).toBe(expectedPaid);
      expect(result.summary.profit).toBe(expectedPaid - expectedRealisasi);
    });

    it('byClient mengelompokkan 2 proyek klien yang sama jadi 1 baris projectCount=2 (DoD b)', async () => {
      const result = await service.finance();

      const row = result.byClient.find((c) => c.clientId === clientAId);
      expect(row).toBeDefined();
      expect(row?.projectCount).toBe(2);
      expect(row?.contractTotal).toBe(500_000_000 + 300_000_000);
      expect(row?.paidTotal).toBe(150_000_000 + 80_000_000);
      expect(row?.realisasiBiaya).toBe(120_000_000 + 60_000_000);
    });

    it('byMonth mengembalikan TEPAT 12 elemen (DoD c)', async () => {
      const result = await service.finance();
      expect(result.byMonth).toHaveLength(12);
    });
  });
});

describe('GET /reports/* — staff_gudang ditolak (DoD d, rantai guard sungguhan)', () => {
  let app: INestApplication<App>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await raw.refreshToken.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await raw.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app.close();
  });

  async function loginStaffGudang(): Promise<string> {
    const email = `wp20-staff-${randomUUID()}@acme.local`;
    const password = 'PasswordAwal-123!';
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await raw.user.create({
      data: {
        email,
        passwordHash,
        fullName: 'WP-20 Staff Gudang Test',
        role: Role.staff_gudang,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(user.id);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return authCookie(loginRes, 'access_token');
  }

  it('staff_gudang -> 403 di /reports/projects, /reports/finance, /reports/progress', async () => {
    const token = await loginStaffGudang();

    await request(app.getHttpServer())
      .get('/api/v1/reports/projects')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/reports/finance')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/reports/progress')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});
