// Integrasi Postgres nyata — W1-05 (SRS FR-FIN-3, FR-NTF-7, R-001):
//   (a) migrasi data pembelian lama → nota: satu nota per item, Σ jumlah =
//       volume, Σ subtotal = nominal lama, realisasi sama sebelum/sesudah,
//       idempoten
//   (b) alur HTTP sungguhan (AppModule + configureApp): 422 Warnings → kirim
//       ulang `acknowledgeWarnings` → tersimpan; agregat per item & proyek;
//       baris/nota terhapus diabaikan; rekap vendor
// Di sini (bukan test:e2e) karena e2e CI jalan tanpa Postgres.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NodeType, Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { AUTH_VERIFIER } from '../common/guards/jwt-auth.guard';
import { configureApp } from '../config/app-setup';

const raw = new PrismaClient();

interface TreeNode {
  id: string;
  purchase: {
    purchasedQty: number;
    purchasedAmount: number;
    vendorCount: number;
    status: string;
  } | null;
  children: TreeNode[];
}

const flatten = (nodes: TreeNode[]): TreeNode[] =>
  nodes.flatMap((n) => [n, ...flatten(n.children)]);

describe('Nota pembelian — integrasi Postgres nyata (W1-05)', () => {
  let app: INestApplication<App>;
  let userId: string;
  let vendorA: string;
  let vendorB: string;
  let vendorC: string; // C & D khusus (b), agar rekap vendor tak tercampur data (a)
  let vendorD: string;
  const projectIds: string[] = [];

  beforeAll(async () => {
    const user = await raw.user.create({
      data: {
        email: `w105-${randomUUID()}@acme.local`,
        passwordHash: 'x',
        fullName: 'W1-05 Test',
        role: 'pimpinan',
      },
    });
    userId = user.id;
    vendorA = (
      await raw.vendor.create({ data: { name: `W105 A ${randomUUID()}` } })
    ).id;
    vendorB = (
      await raw.vendor.create({ data: { name: `W105 B ${randomUUID()}` } })
    ).id;
    vendorC = (
      await raw.vendor.create({ data: { name: `W105 C ${randomUUID()}` } })
    ).id;
    vendorD = (
      await raw.vendor.create({ data: { name: `W105 D ${randomUUID()}` } })
    ).id;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AUTH_VERIFIER)
      .useValue({
        verify: () =>
          Promise.resolve({
            id: userId,
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
    await raw.purchaseNote.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    await raw.project.deleteMany({ where: { id: { in: projectIds } } });
    await raw.vendor.deleteMany({
      where: { id: { in: [vendorA, vendorB, vendorC, vendorD] } },
    });
    await raw.auditLog.deleteMany({ where: { userId } });
    await raw.user.delete({ where: { id: userId } });
    await raw.$disconnect();
  });

  const http = () => request(app.getHttpServer());
  const auth = { Authorization: 'Bearer dummy' };

  async function createProject() {
    const project = await raw.project.create({
      data: {
        name: `W1-05 ${randomUUID()}`,
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
        contractValue: 1_000_000_000n,
      },
    });
    projectIds.push(project.id);
    const section = await raw.rabNode.create({
      data: { projectId: project.id, nodeType: NodeType.section, name: 'S' },
    });
    return { project, section };
  }

  function item(
    projectId: string,
    parentId: string,
    data: Partial<Prisma.RabNodeUncheckedCreateInput>,
  ) {
    return raw.rabNode.create({
      data: {
        projectId,
        parentId,
        nodeType: NodeType.item,
        name: 'Item',
        volume: 10,
        unit: 'm3',
        materialPrice: 100_000n,
        ...data,
      },
    });
  }

  async function tree(projectId: string): Promise<Map<string, TreeNode>> {
    const res = await http()
      .get(`/api/v1/projects/${projectId}/rab/nodes`)
      .set(auth)
      .expect(200);
    return new Map(flatten(res.body as TreeNode[]).map((n) => [n.id, n]));
  }

  async function purchasedAmount(projectId: string): Promise<number> {
    const res = await http()
      .get(`/api/v1/projects/${projectId}/finance/summary`)
      .set(auth)
      .expect(200);
    return (res.body as { purchasedAmount: number }).purchasedAmount;
  }

  describe('(a) migrasi data lama R-001', () => {
    it('satu nota per item, Σ jumlah = volume & Σ subtotal = nominal eksak, realisasi sama, idempoten', async () => {
      const { project, section } = await createProject();
      const p = project.id;
      const legacy = (data: Partial<Prisma.RabNodeUncheckedCreateInput>) =>
        item(p, section.id, { isPurchased: true, ...data });
      const exact = await legacy({
        purchasedAmount: 950_000n,
        purchasedDate: new Date('2026-07-30'),
        vendorId: vendorA,
      });
      const split = await legacy({
        volume: 3,
        purchasedAmount: 1_000_000n,
        vendorId: vendorB,
      });
      const q325 = await legacy({
        volume: new Prisma.Decimal('3.25'),
        purchasedAmount: 162_507n,
      });
      const q075 = await legacy({
        volume: new Prisma.Decimal('0.75'),
        purchasedAmount: 1n,
      });
      const volZero = await legacy({ volume: 0, purchasedAmount: 500n });
      const zeroAmount = await legacy({ purchasedAmount: 0n });
      const nullAmount = await legacy({});
      const deleted = await legacy({
        purchasedAmount: 1_000n,
        deletedAt: new Date(),
        deletedBy: userId,
      });
      const notPurchased = await item(p, section.id, {
        isPurchased: false,
        purchasedAmount: 777n, // dulu tak dihitung → tak dimigrasi
      });

      // Rumus realisasi lama atas node aktif (sebelum R-001 belum ada node terhapus).
      const [{ before }] = await raw.$queryRaw<{ before: bigint }[]>`
        SELECT COALESCE(SUM(COALESCE("purchased_amount", 0)), 0)::bigint AS before
        FROM "rab_nodes" WHERE "project_id" = ${p}::uuid AND "node_type" = 'item'
          AND "is_purchased" AND "deleted_at" IS NULL`;
      expect(before).toBe(2_113_008n);

      await raw.$queryRaw`SELECT migrate_legacy_purchases_r001()`;

      const notes = await raw.purchaseNote.findMany({
        where: { projectId: p },
        include: { lines: true },
      });
      expect(notes).toHaveLength(8);
      expect(notes.every((n) => n.noteNumber === 'R-001')).toBe(true);
      const byNode = new Map(notes.map((n) => [n.lines[0].rabNodeId, n]));
      const check = (id: string, volume: string, amount: bigint) => {
        const n = byNode.get(id)!;
        expect(n.lines.length).toBeLessThanOrEqual(3);
        expect(
          n.lines
            .reduce((s, l) => s.add(l.quantity), new Prisma.Decimal(0))
            .toString(),
        ).toBe(volume);
        expect(n.lines.reduce((s, l) => s + (l.subtotal ?? 0n), 0n)).toBe(
          amount,
        );
      };
      check(exact.id, '10', 950_000n);
      expect(byNode.get(exact.id)!.lines).toHaveLength(1);
      check(split.id, '3', 1_000_000n);
      check(q325.id, '3.25', 162_507n);
      check(q075.id, '0.75', 1n);
      check(volZero.id, '1', 500n); // volume ≤ 0 → jumlah 1
      check(zeroAmount.id, '10', 0n);
      check(nullAmount.id, '10', 0n);
      check(deleted.id, '10', 1_000n);
      expect(byNode.has(notPurchased.id)).toBe(false);

      const exactNote = byNode.get(exact.id)!;
      expect(exactNote.vendorId).toBe(vendorA);
      expect(exactNote.noteDate.toISOString().slice(0, 10)).toBe('2026-07-30');
      const splitNote = byNode.get(split.id)!;
      expect(splitNote.vendorId).toBe(vendorB);
      expect(byNode.get(q325.id)!.vendorId).toBeNull();
      expect(splitNote.noteDate.toISOString().slice(0, 10)).toBe(
        split.updatedAt.toISOString().slice(0, 10), // purchased_date NULL → updated_at
      );
      const deletedNote = byNode.get(deleted.id)!;
      expect(deletedNote.deletedAt).not.toBeNull();
      expect(deletedNote.lines.every((l) => l.deletedAt !== null)).toBe(true);

      expect(await purchasedAmount(p)).toBe(Number(before));
      const nodes = await tree(p);
      expect(nodes.get(exact.id)?.purchase).toEqual({
        purchasedQty: 10,
        purchasedAmount: 950_000,
        vendorCount: 1,
        status: 'lengkap',
      });
      expect(nodes.get(notPurchased.id)?.purchase?.status).toBe('belum');
      expect(nodes.get(section.id)?.purchase).toBeNull();

      await raw.$queryRaw`SELECT migrate_legacy_purchases_r001()`;
      expect(await raw.purchaseNote.count({ where: { projectId: p } })).toBe(8);
    });
  });

  describe('(b) alur HTTP nota + pola A', () => {
    it('422 Warnings → ack → tersimpan; edit/hapus; agregat mengabaikan yang terhapus', async () => {
      const { project, section } = await createProject();
      const p = project.id;
      const besi = await item(p, section.id, {
        name: 'Besi',
        unit: 'kg',
        materialPrice: 1_000n,
      });

      // Bukti nota harus dokumen kategori `bukti` proyek yang sama.
      await http()
        .post(`/api/v1/projects/${p}/purchases`)
        .set(auth)
        .send({
          noteDate: '2026-11-01',
          receiptDocumentId: randomUUID(),
          lines: [{ rabNodeId: besi.id, quantity: 1, unitPrice: 1 }],
        })
        .expect(400);

      const first = await http()
        .post(`/api/v1/projects/${p}/purchases`)
        .set(auth)
        .send({
          vendorId: vendorC,
          noteNumber: 'N-1',
          noteDate: '2026-11-01',
          lines: [{ rabNodeId: besi.id, quantity: 6, unitPrice: 1_000 }],
        })
        .expect(201);
      expect(first.body).toMatchObject({ total: 6_000, recordedBy: userId });

      const second = {
        vendorId: vendorD,
        noteDate: '2026-11-02',
        lines: [{ rabNodeId: besi.id, quantity: 5, unitPrice: 900 }],
      };
      const warned = await http()
        .post(`/api/v1/projects/${p}/purchases`)
        .set(auth)
        .send(second)
        .expect(422);
      expect(warned.body).toMatchObject({
        statusCode: 422,
        error: 'Warnings',
        warnings: [
          { code: 'PURCHASE_QTY_EXCEEDS_VOLUME', ref: besi.id },
          { code: 'PURCHASE_AMOUNT_EXCEEDS_MATERIAL_BUDGET', ref: besi.id },
        ],
      });
      expect(await raw.purchaseNote.count({ where: { projectId: p } })).toBe(1);

      const saved = await http()
        .post(`/api/v1/projects/${p}/purchases`)
        .set(auth)
        .send({ ...second, acknowledgeWarnings: true })
        .expect(201);
      const secondId = (saved.body as { id: string }).id;

      expect((await tree(p)).get(besi.id)?.purchase).toEqual({
        purchasedQty: 11,
        purchasedAmount: 10_500,
        vendorCount: 2,
        status: 'lengkap',
      });

      // Diff per id: baris ber-id diubah di tempat (ID stabil).
      const lineId = (saved.body as { lines: { id: string }[] }).lines[0].id;
      const edit = {
        id: lineId,
        rabNodeId: besi.id,
        quantity: 2,
        unitPrice: 900,
      };
      const patch = (lines: object[]) =>
        http().patch(`/api/v1/purchases/${secondId}`).set(auth).send({ lines });
      const patched = await patch([edit]).expect(200);
      expect(patched.body).toMatchObject({
        total: 1_800,
        lines: [{ id: lineId, quantity: 2 }],
      });
      expect(
        await raw.purchaseLine.count({ where: { purchaseNoteId: secondId } }),
      ).toBe(1);
      // Kirim ulang tanpa perubahan → tak ada UPDATE baris baru di audit.
      const lineAudits = () =>
        raw.auditLog.count({
          where: {
            tableName: 'purchase_lines',
            recordId: lineId,
            action: 'UPDATE',
          },
        });
      const auditsBefore = await lineAudits();
      await patch([edit]).expect(200);
      expect(await lineAudits()).toBe(auditsBefore);
      // id duplikat → 400.
      await patch([edit, edit]).expect(400);
      // id tak dikenal → 400.
      await patch([{ ...edit, id: randomUUID() }]).expect(400);
      // Tanpa id = baris baru; baris lama yang tak dikirim di-soft delete.
      const replaced = await patch([
        { rabNodeId: besi.id, quantity: 2, unitPrice: 900 },
      ]).expect(200);
      expect(
        (replaced.body as { lines: { id: string }[] }).lines[0].id,
      ).not.toBe(lineId);
      expect(
        await raw.purchaseLine.findUniqueOrThrow({ where: { id: lineId } }),
      ).toMatchObject({ deletedBy: userId });
      expect((await tree(p)).get(besi.id)?.purchase).toMatchObject({
        purchasedQty: 8,
        purchasedAmount: 7_800,
        status: 'sebagian',
      });
      expect(await purchasedAmount(p)).toBe(7_800);

      const vendors = await http()
        .get('/api/v1/reports/vendors?perPage=100')
        .set(auth)
        .expect(200);
      const rows = (
        vendors.body as {
          data: {
            vendorId: string;
            totalAmount: number;
            itemCount: number;
            priceHistory: { unitPrice: number }[];
          }[];
        }
      ).data;
      expect(rows.find((r) => r.vendorId === vendorC)).toMatchObject({
        totalAmount: 6_000,
        itemCount: 1,
        priceHistory: [{ unitPrice: 1_000 }],
      });
      expect(rows.find((r) => r.vendorId === vendorD)?.totalAmount).toBe(1_800);

      // Nota di proyek terhapus tak ikut rekap vendor.
      const gone = await createProject();
      const goneItem = await item(gone.project.id, gone.section.id, {});
      await raw.purchaseNote.create({
        data: {
          projectId: gone.project.id,
          vendorId: vendorD,
          noteDate: new Date('2026-11-03'),
          lines: {
            create: { rabNodeId: goneItem.id, quantity: 1, unitPrice: 5n },
          },
        },
      });
      await raw.project.update({
        where: { id: gone.project.id },
        data: { deletedAt: new Date() },
      });
      const after = await http()
        .get('/api/v1/reports/vendors?perPage=100')
        .set(auth)
        .expect(200);
      expect(
        (
          after.body as { data: { vendorId: string; totalAmount: number }[] }
        ).data.find((r) => r.vendorId === vendorD)?.totalAmount,
      ).toBe(1_800);

      // Menurunkan batas (volume) di bawah Σ jumlah dibeli (8) → pola A yang sama.
      const lower = () =>
        http().patch(`/api/v1/rab/nodes/${besi.id}`).set(auth);
      await lower().send({ volume: 7 }).expect(422);
      await lower().send({ volume: 7, acknowledgeWarnings: true }).expect(200);
      await lower().send({ volume: 10 }).expect(200);

      await http()
        .delete(`/api/v1/purchases/${secondId}`)
        .set(auth)
        .expect(204);
      await http().get(`/api/v1/purchases/${secondId}`).set(auth).expect(404);
      expect(await purchasedAmount(p)).toBe(6_000);
      const list = await http()
        .get(`/api/v1/projects/${p}/purchases`)
        .set(auth)
        .expect(200);
      expect((list.body as { meta: { total: number } }).meta.total).toBe(1);
      expect(
        await raw.purchaseLine.count({
          where: { purchaseNoteId: secondId, deletedAt: null },
        }),
      ).toBe(0);

      const audit = await raw.auditLog.findFirst({
        where: {
          tableName: 'purchase_notes',
          recordId: secondId,
          action: 'UPDATE',
        },
      });
      expect(audit?.userId).toBe(userId);
      const lineAudit = await raw.auditLog.findFirst({
        where: { tableName: 'purchase_lines', action: 'INSERT', userId },
      });
      expect(lineAudit).not.toBeNull(); // user_id terisi lewat AUDITED_MODELS

      // Tempat Sampah: nota terhapus muncul, pulih bersama baris yang terhapus bersamanya saja.
      const trash = await http()
        .get('/api/v1/trash?type=purchase_note&perPage=100')
        .set(auth)
        .expect(200);
      expect(
        (trash.body as { data: { id: string }[] }).data.map((t) => t.id),
      ).toContain(secondId);
      // Node masih terhapus → 409 (R-007); pulihkan node dulu.
      await http().delete(`/api/v1/rab/nodes/${besi.id}`).set(auth).expect(204);
      await http()
        .post(`/api/v1/purchases/${secondId}/restore`)
        .set(auth)
        .expect(409);
      await http()
        .post(`/api/v1/rab/nodes/${besi.id}/restore`)
        .set(auth)
        .expect(204);
      await http()
        .post(`/api/v1/purchases/${secondId}/restore`)
        .set(auth)
        .expect(204);
      const restored = await http()
        .get(`/api/v1/purchases/${secondId}`)
        .set(auth)
        .expect(200);
      expect(restored.body).toMatchObject({ total: 1_800 });
      expect((restored.body as { lines: unknown[] }).lines).toHaveLength(1);
      expect(await purchasedAmount(p)).toBe(7_800);

      // Vendor terhapus tak boleh dipilih (FR-DEL-4).
      await raw.vendor.update({
        where: { id: vendorD },
        data: { deletedAt: new Date() },
      });
      await http()
        .post(`/api/v1/projects/${p}/purchases`)
        .set(auth)
        .send({ ...second, acknowledgeWarnings: true })
        .expect(400);
    });
  });
});
