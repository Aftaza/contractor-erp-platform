// Integrasi Postgres nyata — soft delete berkaskade, pulihkan, Tempat Sampah
// (SRS §3.10 FR-DEL-1..8, R-007). Jalankan lewat `npm run test:db`.
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { auditContextStorage } from '../audit/audit-context';
import { ClientsService } from '../clients/clients.service';
import { withAuditExtension } from '../audit/audit.extension';
import { ExpensesService } from '../expenses/expenses.service';
import { PolicyService } from '../policy/policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { RabService } from '../rab/rab.service';
import { ReportsService } from '../reports/reports.service';
import { TerminPaymentsService } from '../termins/termin-payments.service';
import { TerminsService } from '../termins/termins.service';
import { ToolsService } from '../tools/tools.service';
import { TrashService } from './trash.service';

const raw = new PrismaClient();
const prisma = withAuditExtension(raw) as unknown as PrismaService;
const projects = new ProjectsService(prisma);
const clients = new ClientsService(prisma);
const rab = new RabService(prisma, new PolicyService());
const expenses = new ExpensesService(prisma);
const termins = new TerminsService(prisma);
const payments = new TerminPaymentsService(prisma, termins);
const tools = new ToolsService(prisma);
const reports = new ReportsService(prisma);
const trash = new TrashService(prisma);

describe('Soft delete & pulihkan (FR-DEL)', () => {
  let userId: string;
  const projectIds: string[] = [];
  const toolIds: string[] = [];

  beforeAll(async () => {
    const user = await raw.user.create({
      data: {
        email: `w101-${randomUUID()}@acme.local`,
        passwordHash: 'x',
        fullName: 'W1-01 Pimpinan',
        role: 'pimpinan',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    // Urutan hard delete untuk FK RESTRICT (R-007).
    const inProjects = { projectId: { in: projectIds } };
    await raw.purchaseLine.deleteMany({ where: { purchaseNote: inProjects } });
    await raw.purchaseNote.deleteMany({ where: inProjects });
    await raw.terminPayment.deleteMany({ where: { termin: inProjects } });
    await raw.document.deleteMany({ where: inProjects });
    await raw.projectTool.deleteMany({ where: { toolId: { in: toolIds } } });
    await raw.project.deleteMany({
      where: { parentId: { in: projectIds } },
    });
    await raw.project.deleteMany({ where: { id: { in: projectIds } } });
    await raw.tool.deleteMany({ where: { id: { in: toolIds } } });
    await raw.auditLog.deleteMany({ where: { userId } });
    await raw.user.delete({ where: { id: userId } });
    await raw.$disconnect();
  });

  const asUser = <T>(fn: () => Promise<T>) =>
    auditContextStorage.run({ userId, clientIp: '127.0.0.1' }, fn);

  async function createProject(parentId?: string) {
    const p = await raw.project.create({
      data: {
        name: `W1-01 ${randomUUID()}`,
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
        contractValue: 1_000_000_000n,
        parentId,
      },
    });
    if (!parentId) projectIds.push(p.id);
    return p;
  }

  /** Proyek lengkap: section→2 item, termin+pembayaran, pengeluaran, nota+baris, addendum, dokumen, sub-proyek. */
  async function seedFullProject() {
    const project = await createProject();
    const sub = await createProject(project.id);
    const section = await raw.rabNode.create({
      data: { projectId: project.id, nodeType: 'section', name: 'A' },
    });
    const item = (name: string, price: bigint) =>
      raw.rabNode.create({
        data: {
          projectId: project.id,
          parentId: section.id,
          nodeType: 'item',
          name,
          volume: 1,
          unit: 'ls',
          materialPrice: price,
        },
      });
    const item1 = await item('Item 1', 100_000_000n);
    const item2 = await item('Item 2', 300_000_000n);
    const termin = await raw.termin.create({
      data: {
        projectId: project.id,
        name: 'DP',
        type: 'dp',
        amount: 100_000_000n,
        status: 'Lunas',
      },
    });
    const payment = await raw.terminPayment.create({
      data: {
        terminId: termin.id,
        paymentDate: new Date('2026-02-01'),
        amount: 100_000_000n,
      },
    });
    const expense = await raw.expense.create({
      data: {
        projectId: project.id,
        description: 'Sewa crane',
        amount: 4_500_000n,
        expenseDate: new Date('2026-02-01'),
        category: 'sewa_alat',
      },
    });
    const note = await raw.purchaseNote.create({
      data: { projectId: project.id, noteDate: new Date('2026-02-02') },
    });
    const line = await raw.purchaseLine.create({
      data: {
        purchaseNoteId: note.id,
        rabNodeId: item1.id,
        quantity: 1,
        unitPrice: 50_000_000n,
      },
    });
    const addendum = await raw.projectAddendum.create({
      data: {
        projectId: project.id,
        number: 'ADD-1',
        addendumDate: new Date('2026-03-01'),
        contractValue: 1_100_000_000n,
        reason: 'Tambah lingkup',
      },
    });
    const document = await raw.document.create({
      data: { title: 'Kontrak', category: 'kontrak', projectId: project.id },
    });
    return {
      project,
      sub,
      section,
      item1,
      item2,
      termin,
      payment,
      expense,
      note,
      line,
      addendum,
      document,
    };
  }

  async function stamps(s: Awaited<ReturnType<typeof seedFullProject>>) {
    const pick = (
      r: { deletedAt: Date | null; deletedBy: string | null } | null,
    ) => [r?.deletedAt?.getTime() ?? null, r?.deletedBy ?? null] as const;
    return [
      pick(await raw.project.findUnique({ where: { id: s.project.id } })),
      pick(await raw.project.findUnique({ where: { id: s.sub.id } })),
      pick(await raw.rabNode.findUnique({ where: { id: s.section.id } })),
      pick(await raw.rabNode.findUnique({ where: { id: s.item1.id } })),
      pick(await raw.termin.findUnique({ where: { id: s.termin.id } })),
      pick(await raw.terminPayment.findUnique({ where: { id: s.payment.id } })),
      pick(await raw.expense.findUnique({ where: { id: s.expense.id } })),
      pick(await raw.purchaseNote.findUnique({ where: { id: s.note.id } })),
      pick(await raw.purchaseLine.findUnique({ where: { id: s.line.id } })),
      pick(
        await raw.projectAddendum.findUnique({ where: { id: s.addendum.id } }),
      ),
      pick(await raw.document.findUnique({ where: { id: s.document.id } })),
    ];
  }

  it('hapus proyek: seluruh turunan dapat penanda deleted_at+deleted_by yang SAMA; pulihkan memulihkan semuanya (FR-DEL-3)', async () => {
    const s = await seedFullProject();
    await asUser(() => projects.remove(s.project.id, userId));

    const deleted = await stamps(s);
    const [first] = deleted;
    expect(first[0]).not.toBeNull();
    expect(first[1]).toBe(userId);
    for (const st of deleted) expect(st).toEqual(first);

    await expect(projects.findOne(s.project.id)).rejects.toThrow(
      NotFoundException,
    );
    await expect(projects.findOne(s.sub.id)).rejects.toThrow(NotFoundException);
    await expect(rab.getTree(s.project.id)).rejects.toThrow(NotFoundException);

    // Tempat Sampah hanya menampilkan akar (proyek), bukan turunan kaskade.
    const listed = await trash.findAll({ perPage: 100 });
    const mine = listed.data.filter(
      (i) => i.id === s.project.id || i.projectId === s.project.id,
    );
    expect(mine.map((i) => i.type)).toEqual(['project']);
    expect(mine[0].deletedByName).toBe('W1-01 Pimpinan');

    // Audit mencatat pelaku untuk SETIAP tabel kaskade — raw SQL + setAuditContext,
    // tak bergantung AUDITED_MODELS extension (FR-DEL-8).
    const audited: [string, string][] = [
      ['projects', s.project.id],
      ['projects', s.sub.id],
      ['rab_nodes', s.item1.id],
      ['termins', s.termin.id],
      ['termin_payments', s.payment.id],
      ['expenses', s.expense.id],
      ['purchase_notes', s.note.id],
      ['purchase_lines', s.line.id],
      ['project_addenda', s.addendum.id],
      ['documents', s.document.id],
    ];
    for (const [tableName, recordId] of audited) {
      const log = await raw.auditLog.findFirst({
        where: { tableName, recordId, action: 'UPDATE' },
        orderBy: { createdAt: 'desc' },
      });
      expect([tableName, log?.userId]).toEqual([tableName, userId]);
      expect((log?.newData as { deleted_by?: string } | null)?.deleted_by).toBe(
        userId,
      );
    }

    // Pulih: rab_nodes sebelum purchase_lines (R-007) — tak boleh melempar.
    await asUser(() => trash.restore('project', s.project.id));
    for (const st of await stamps(s)) expect(st).toEqual([null, null]);
    expect((await projects.findOne(s.sub.id)).id).toBe(s.sub.id);
    for (const [tableName, recordId] of audited) {
      const log = await raw.auditLog.findFirst({
        where: { tableName, recordId, action: 'UPDATE' },
        orderBy: { createdAt: 'desc' },
      });
      expect([tableName, log?.userId]).toEqual([tableName, userId]);
      expect(
        (log?.newData as { deleted_at?: string | null } | null)?.deleted_at,
      ).toBeNull();
    }
  });

  it('baris yang terhapus LEBIH DULU tetap di Tempat Sampah setelah proyek dipulihkan', async () => {
    const s = await seedFullProject();
    await asUser(() => expenses.remove(s.expense.id, userId));
    await asUser(() => projects.remove(s.project.id, userId));
    await asUser(() => trash.restore('project', s.project.id));

    const exp = await raw.expense.findUnique({ where: { id: s.expense.id } });
    expect(exp?.deletedAt).not.toBeNull();
    const listed = await trash.findAll({ type: 'expense', perPage: 100 });
    expect(listed.data.some((i) => i.id === s.expense.id)).toBe(true);
    expect(listed.data.every((i) => i.type === 'expense')).toBe(true);
  });

  it('hapus node grup: turunan & baris nota ikut; pulihkan anak saat induk terhapus → 409; pulihkan grup → node lalu baris nota (R-007)', async () => {
    const s = await seedFullProject();
    await asUser(() => rab.remove(s.section.id, 'admin', userId)); // draft → admin boleh

    expect(
      (await raw.rabNode.findUnique({ where: { id: s.item1.id } }))?.deletedAt,
    ).not.toBeNull();
    expect(
      (await raw.purchaseLine.findUnique({ where: { id: s.line.id } }))
        ?.deletedAt,
    ).not.toBeNull();
    expect(await rab.getTree(s.project.id)).toEqual([]);
    expect((await rab.summary(s.project.id)).subtotal).toBe(0);

    await expect(trash.restore('rab_node', s.item1.id)).rejects.toThrow(
      ConflictException,
    );

    await asUser(() => trash.restore('rab_node', s.section.id));
    expect(
      (await raw.purchaseLine.findUnique({ where: { id: s.line.id } }))
        ?.deletedAt,
    ).toBeNull();
    expect((await rab.summary(s.project.id)).subtotal).toBe(400_000_000);
  });

  it('hapus termin: pembayarannya ikut; pulihkan anak proyek terhapus → 409', async () => {
    const s = await seedFullProject();
    await asUser(() => termins.remove(s.termin.id, userId));
    expect(
      (await raw.terminPayment.findUnique({ where: { id: s.payment.id } }))
        ?.deletedAt,
    ).not.toBeNull();
    expect((await termins.findAll(s.project.id, {})).data).toEqual([]);

    await asUser(() => projects.remove(s.project.id, userId));
    await expect(trash.restore('termin', s.termin.id)).rejects.toThrow(
      ConflictException,
    );
    await expect(
      termins.create(
        s.project.id,
        { name: 'T', type: 'termin', amount: 1 },
        userId,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('pembayaran termin: hapus → Tempat Sampah; pulihkan ditolak 422 bila jadi kelebihan bayar, lalu pulih & status Lunas', async () => {
    const s = await seedFullProject();
    await asUser(() => payments.remove(s.payment.id, userId));
    const listed = await trash.findAll({
      type: 'termin_payment',
      perPage: 100,
    });
    expect(listed.data.find((i) => i.id === s.payment.id)?.projectId).toBe(
      s.project.id,
    );

    const other = await asUser(() =>
      payments.create(
        s.termin.id,
        { paymentDate: '2026-02-03', amount: 100_000_000 },
        userId,
      ),
    );
    expect(other.status).toBe('Lunas');
    await expect(payments.restore(s.payment.id)).rejects.toThrow(
      'melebihi nominal termin',
    );

    const [otherPayment] = await payments.findAll(s.termin.id);
    await asUser(() => payments.remove(otherPayment.id, userId));
    await asUser(() => payments.restore(s.payment.id));
    const [restored] = (await termins.findAll(s.project.id, {})).data;
    expect(restored.totalPaid).toBe(100_000_000);
    expect(restored.status).toBe('Lunas');

    await asUser(() => termins.remove(s.termin.id, userId));
    await expect(payments.restore(otherPayment.id)).rejects.toThrow(
      ConflictException,
    );
  });

  it('dokumen terhapus tampil di Tempat Sampah (jenis document); dokumen proyek terhapus kaskade tidak', async () => {
    const s = await seedFullProject();
    const loose = await raw.document.create({
      data: {
        title: `Akta ${randomUUID()}`,
        category: 'legalitas',
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });
    await asUser(() => projects.remove(s.project.id, userId));
    const ids = (
      await trash.findAll({ type: 'document', perPage: 100 })
    ).data.map((i) => i.id);
    expect(ids).toContain(loose.id);
    expect(ids).not.toContain(s.document.id);
    await raw.document.delete({ where: { id: loose.id } });
  });

  it('agregat mengabaikan terhapus: progress, ringkasan keuangan, laporan (FR-DEL-2)', async () => {
    const s = await seedFullProject();
    await raw.rabNode.update({
      where: { id: s.item1.id },
      data: { progressPercent: 100 },
    });
    await raw.project.update({
      where: { id: s.project.id },
      data: { rabStatus: 'approved' },
    });
    // 100 jt @100% + 300 jt @0% → 25%.
    expect(Number((await projects.findOne(s.project.id)).progress)).toBe(25);

    await asUser(() => rab.remove(s.item2.id, 'pimpinan', userId));
    expect(Number((await projects.findOne(s.project.id)).progress)).toBe(100);

    const before = await expenses.financeSummary(s.project.id);
    await asUser(() => expenses.remove(s.expense.id, userId));
    const after = await expenses.financeSummary(s.project.id);
    expect(before.realisasiBiaya - after.realisasiBiaya).toBe(4_500_000);

    await asUser(() => projects.remove(s.project.id, userId));
    const rows = await reports.projects({ perPage: 100 });
    expect(rows.data.some((r) => r.projectId === s.project.id)).toBe(false);
    await expect(expenses.financeSummary(s.project.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('klien terhapus: proyek tetap menampilkan nama + clientDeleted; tak bisa dipilih untuk proyek baru (FR-DEL-4)', async () => {
    const client = await raw.client.create({
      data: { name: `Klien ${randomUUID()}` },
    });
    const project = await createProject();
    await raw.project.update({
      where: { id: project.id },
      data: { clientId: client.id },
    });
    await asUser(() => clients.remove(client.id, userId));
    const found = await projects.findOne(project.id);
    expect(found.clientName).toBe(client.name);
    expect(found.clientDeleted).toBe(true);
    await expect(
      projects.update(project.id, { clientId: client.id }),
    ).rejects.toThrow('client_id tidak ditemukan');
    await raw.project.update({
      where: { id: project.id },
      data: { clientId: null },
    });
    await raw.client.delete({ where: { id: client.id } });
  });

  it('alat: hapus ditolak saat pemakaian approved/handed_over; pulihkan kode bentrok → 409 (FR-DEL-4/5)', async () => {
    const code = `W101-${randomUUID().slice(0, 8)}`;
    const tool = await raw.tool.create({ data: { code, name: 'Genset' } });
    toolIds.push(tool.id);
    const project = await createProject();
    await raw.projectTool.create({
      data: {
        projectId: project.id,
        toolId: tool.id,
        approvalStatus: 'handed_over',
      },
    });
    await expect(tools.remove(tool.id, userId)).rejects.toThrow(
      ConflictException,
    );

    // Pemakaian pada proyek terhapus tak lagi menahan alat.
    await asUser(() => projects.remove(project.id, userId));
    await asUser(() => tools.remove(tool.id, userId));
    await expect(tools.findOne(tool.id)).rejects.toThrow(NotFoundException);

    // Kode bebas dipakai alat baru (indeks unik parsial) → pulihkan bentrok.
    const twin = await raw.tool.create({ data: { code, name: 'Genset 2' } });
    toolIds.push(twin.id);
    await expect(trash.restore('tool', tool.id)).rejects.toThrow(
      ConflictException,
    );
    await expect(trash.restore('tool', twin.id)).rejects.toThrow(
      NotFoundException,
    );
  });
});
