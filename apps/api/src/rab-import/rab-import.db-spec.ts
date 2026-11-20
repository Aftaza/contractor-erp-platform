// acme-backend/src/rab-import/rab-import.db-spec.ts
//
// Integrasi (Postgres nyata, master §9.2) — WP-15, database test
// `acme_test_wp15` (fase-1-vertikal-rab.md §2.1). Membuktikan:
//
//   (a) template kanonik contoh → pohon benar di DB (jumlah node & kedalaman)
//   (b) file cacat ditolak dengan pesan yang menyebut nomor baris (≥2 jenis)
//   (c) impor menulis SAAT rab_status='draft'
//   (d) impor DITOLAK saat rab_status='approved' (master §5.5)
//
// Pola sama seperti src/rab/rab.db-spec.ts: `auditContextStorage`
// mensimulasikan konteks request TANPA boot HTTP+guard — gerbang
// role/RolesGuard sudah diverifikasi terpisah oleh harness matriks (master
// §9.3, test/authz/).
//
// Jalankan (WAJIB prefix DATABASE_URL inline — fase-1 §2.1):
//   DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/acme_test_wp15" \
//     npx jest --config test/jest-db.json --runInBand src/rab-import/rab-import.db-spec.ts
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import * as XLSX from 'xlsx';
import { auditContextStorage } from '../audit/audit-context';
import { withAuditExtension } from '../audit/audit.extension';
import { PolicyService } from '../policy/policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { RabService } from '../rab/rab.service';
import { RabImportService } from './rab-import.service';

const raw = new PrismaClient();
const prisma = withAuditExtension(raw);
const rabService = new RabService(
  prisma as unknown as PrismaService,
  new PolicyService(),
);
const service = new RabImportService(
  prisma as unknown as PrismaService,
  rabService,
);

const TEMPLATE_PATH = path.resolve(
  __dirname,
  '../../../../docs/reference/template-rab-acme.xlsx',
);

function templateBuffer(): Buffer {
  return readFileSync(TEMPLATE_PATH);
}

/** Bangun buffer xlsx dari matriks baris mentah — dipakai kasus file cacat. */
function sheetBuffer(rows: unknown[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'RAB');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

const HEADER = [
  'Level',
  'Tipe',
  'Nama Pekerjaan',
  'Volume',
  'Satuan',
  'Harga Material',
  'Harga Upah',
  'Total',
];

function mockFile(buffer: Buffer): Express.Multer.File {
  return { buffer } as Express.Multer.File;
}

describe('RabImportService — integrasi Postgres nyata (WP-15)', () => {
  let userId: string;
  const projectIds: string[] = [];

  beforeAll(async () => {
    const user = await raw.user.create({
      data: {
        email: `wp15-${randomUUID()}@acme.local`,
        passwordHash: 'x',
        fullName: 'WP-15 Test User',
        role: 'pimpinan',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (projectIds.length > 0) {
      await raw.project.deleteMany({ where: { id: { in: projectIds } } });
    }
    await raw.auditLog.deleteMany({ where: { userId } });
    await raw.user.delete({ where: { id: userId } });
    await raw.$disconnect();
  });

  function withUser<T>(fn: () => Promise<T>): Promise<T> {
    return auditContextStorage.run({ userId, clientIp: '127.0.0.1' }, fn);
  }

  async function createDraftProject() {
    const project = await raw.project.create({
      data: {
        name: `WP-15 ${randomUUID()}`,
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
      },
    });
    projectIds.push(project.id);
    return project;
  }

  it('template kanonik contoh → pohon benar (11 node, kedalaman maks 4) saat rab_status=draft (DoD a, c)', async () => {
    const project = await createDraftProject();
    expect(project.rabStatus).toBe('draft');

    const result = await withUser(() =>
      service.import(project.id, mockFile(templateBuffer()), 'pimpinan'),
    );

    expect(result.totalNodes).toBe(11);
    expect(result.sectionCount).toBe(2);
    expect(result.subgroupCount).toBe(2);
    expect(result.phaseCount).toBe(2);
    expect(result.itemCount).toBe(5);

    const tree = await rabService.getTree(project.id);
    expect(tree).toHaveLength(2); // 2 root section

    // Kedalaman maksimal 4: section(1) -> subgroup(2) -> phase(3) -> item(4).
    const sectionII = tree.find((n) => n.name.startsWith('II'))!;
    const pondasi = sectionII.children.find(
      (n) => n.name === 'Pekerjaan Pondasi',
    )!;
    const footingF1 = pondasi.children.find((n) => n.name === 'Footing F1')!;
    expect(footingF1.children.length).toBeGreaterThan(0);
    expect(footingF1.children[0].nodeType).toBe('item');

    // Item langsung di bawah subgroup tanpa phase (Pekerjaan Sloof) — kedalaman 3.
    const sloof = sectionII.children.find((n) => n.name === 'Pekerjaan Sloof')!;
    expect(sloof.children[0].nodeType).toBe('item');

    // Trigger DB mengisi total, tak dihitung aplikasi.
    const itemNode = footingF1.children.find(
      (n) => n.name === 'Lean Concrete K-125',
    )!;
    expect(itemNode.total).toBe(10_000_000n);
  });

  it('rab_status=approved → impor ditolak SEBELUM menulis apa pun, walau pemanggil pimpinan (DoD d, master §5.5)', async () => {
    const project = await createDraftProject();
    await withUser(() =>
      rabService.create(
        project.id,
        { nodeType: 'section', name: 'S' },
        'pimpinan',
      ),
    );
    await withUser(() => rabService.approve(project.id, userId));

    await expect(
      withUser(() =>
        service.import(project.id, mockFile(templateBuffer()), 'pimpinan'),
      ),
    ).rejects.toThrow('draft');

    const tree = await rabService.getTree(project.id);
    expect(tree).toHaveLength(1); // hanya section awal, impor tak menambah apa pun
  });

  it('file tanpa kolom Level (struktur salah) ditolak, pesan menyebut baris 1 (DoD b — jenis 1)', async () => {
    const project = await createDraftProject();
    const badHeader = [
      'Nomor',
      'Jenis',
      'Nama',
      'Vol',
      'Sat',
      'Mat',
      'Upah',
      'Total',
    ];
    const buf = sheetBuffer([
      badHeader,
      [1, 'section', 'X', '', '', '', '', ''],
    ]);

    await expect(
      withUser(() => service.import(project.id, mockFile(buf), 'pimpinan')),
    ).rejects.toThrow(/Baris 1/);
  });

  it('total tak cocok dengan (material+upah)×volume ditolak, pesan menyebut baris (DoD b — jenis 2)', async () => {
    const project = await createDraftProject();
    const rows = [
      HEADER,
      [1, 'section', 'S', '', '', '', '', ''],
      [2, 'item', 'Item salah total', 10, 'm3', 100_000, 0, 999], // seharusnya 1.000.000
    ];
    const buf = sheetBuffer(rows);

    await expect(
      withUser(() => service.import(project.id, mockFile(buf), 'pimpinan')),
    ).rejects.toThrow(/Baris 3/);
  });

  it('baris yatim (level melompat, parent tak ada) ditolak dengan nomor baris (DoD b — jenis 3)', async () => {
    const project = await createDraftProject();
    const rows = [
      HEADER,
      [1, 'section', 'S', '', '', '', '', ''],
      [3, 'phase', 'Melompat ke level 3', '', '', '', '', ''], // seharusnya level 2 dulu
    ];
    const buf = sheetBuffer(rows);

    await expect(
      withUser(() => service.import(project.id, mockFile(buf), 'pimpinan')),
    ).rejects.toThrow(/Baris 3.*yatim/);
  });
});
