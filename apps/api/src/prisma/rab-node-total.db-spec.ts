// Test integrasi (Postgres nyata — master §9.2) untuk trigger
// `rab_node_set_total_trg` (WP-02): total = (material+labor) × volume,
// dihitung DB, tak pernah aplikasi. Butuh DATABASE_URL menunjuk Postgres
// nyata (lihat acme-backend/.env). Jalankan: npm run test:db
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('trigger total (rab_nodes)', () => {
  let projectId: string;

  beforeAll(async () => {
    const project = await prisma.project.create({
      data: {
        name: 'WP-02 test — total trigger',
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
      },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.$disconnect();
  });

  it('item dengan material+labor+volume → total dihitung trigger tanpa app mengirim total', async () => {
    const node = await prisma.rabNode.create({
      data: {
        projectId,
        nodeType: 'item',
        name: 'Lean Concrete K-125',
        volume: 182.946,
        unit: 'M3',
        materialPrice: 1418000n,
        laborPrice: 68000n,
      },
    });

    // total = (material+labor) * volume = 1.486.000 * 182.946 ≈ 271.857.756 → dibulatkan
    expect(node.total).toBe(BigInt(Math.round((1_418_000 + 68_000) * 182.946)));
  });

  it('item dengan hanya material_price (labor NULL) → total pakai COALESCE(0)', async () => {
    const node = await prisma.rabNode.create({
      data: {
        projectId,
        nodeType: 'item',
        name: 'Item material saja',
        volume: 10,
        unit: 'KG',
        materialPrice: 50000n,
      },
    });
    expect(node.total).toBe(500000n);
  });

  it('update volume → total ikut dihitung ulang', async () => {
    const node = await prisma.rabNode.create({
      data: {
        projectId,
        nodeType: 'item',
        name: 'Item untuk diupdate',
        volume: 5,
        unit: 'EA',
        materialPrice: 10000n,
        laborPrice: 2000n,
      },
    });
    expect(node.total).toBe(60000n); // (10000+2000)*5

    const updated = await prisma.rabNode.update({
      where: { id: node.id },
      data: { volume: 8 },
    });
    expect(updated.total).toBe(96000n); // (10000+2000)*8
  });

  it('node grup (section) tak punya total (NULL)', async () => {
    const section = await prisma.rabNode.create({
      data: { projectId, nodeType: 'section', name: 'Pekerjaan Persiapan' },
    });
    expect(section.total).toBeNull();
  });
});
