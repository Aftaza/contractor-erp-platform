// Test performa (Postgres nyata) untuk `recompute_project_progress()` pada
// pohon berukuran nyata — acuan ukuran: docs/reference/ekspor_rab_docs.xlsx
// (RAB pabrik semen 2025, 214 baris, 7 section, kedalaman
// campur 1–3 level milestone; lihat docs/reference/rab-format-analysis.md
// §1, §3). Fixture di bawah men-generate ~200 node dengan bentuk & rentang
// harga/volume yang meniru dokumen itu (bukan data mainan seragam) —
// membaca file .xlsx asli langsung tak perlu untuk uji performa trigger,
// parsing file itu sendiri adalah scope WP-15 (rab-import).
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Ambang wajar untuk recompute atas ~200 node di dev machine biasa.
// Generous supaya tak flaky di CI yang lebih lambat dari mesin dev.
const THRESHOLD_MS = 3000;

describe('performa agregasi progress (~200 node, kedalaman campur)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('recompute pada pohon ~200 node selesai di bawah ambang wajar', async () => {
    const project = await prisma.project.create({
      data: {
        name: 'WP-02 test — performa 200 node',
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
      },
    });

    const units = [
      'M3',
      'KG',
      'Ls',
      'EA',
      'M2',
      'TITIK',
      'LONJOR',
      'SET',
      'BH',
      'LOT',
    ];
    let nodeCount = 0;

    // 7 section (meniru I, II, III, IV, VII, VIII, X di dokumen sampel)
    for (let s = 0; s < 7; s++) {
      const section = await prisma.rabNode.create({
        data: {
          projectId: project.id,
          nodeType: 'section',
          name: `Section ${s + 1}`,
          sortOrder: s,
        },
      });
      nodeCount++;

      // Sebagian section: item langsung di L1 (mis. PEKERJAAN PERSIAPAN)
      if (s % 3 === 0) {
        for (let i = 0; i < 5; i++) {
          await prisma.rabNode.create({
            data: {
              projectId: project.id,
              parentId: section.id,
              nodeType: 'item',
              name: `Section ${s + 1} - Item L1 #${i + 1}`,
              volume: 5 + i * 3.25,
              unit: units[(s + i) % units.length],
              materialPrice: BigInt(50_000 + i * 137_000),
              laborPrice: BigInt(10_000 + i * 8_000),
              progressPercent: (i * 25) % 101,
            },
          });
          nodeCount++;
        }
        continue;
      }

      // Sebagian section: section → subgroup → item (mis. PEKERJAAN SLOOF)
      const subgroupCount = 3;
      for (let sg = 0; sg < subgroupCount; sg++) {
        const subgroup = await prisma.rabNode.create({
          data: {
            projectId: project.id,
            parentId: section.id,
            nodeType: 'subgroup',
            name: `Sub ${s + 1}.${sg + 1}`,
          },
        });
        nodeCount++;

        if (sg === 0) {
          // langsung item di L2
          for (let i = 0; i < 5; i++) {
            await prisma.rabNode.create({
              data: {
                projectId: project.id,
                parentId: subgroup.id,
                nodeType: 'item',
                name: `Sub ${s + 1}.${sg + 1} - Item L2 #${i + 1}`,
                volume: 2 + i * 1.5,
                unit: units[(s + sg + i) % units.length],
                materialPrice: BigInt(80_000 + i * 45_000),
                laborPrice: BigInt(15_000 + i * 5_000),
                progressPercent: (i * 33) % 101,
              },
            });
            nodeCount++;
          }
        } else {
          // section → subgroup → phase → item (mis. PEKERJAAN PONDASI → FOOTING)
          const phaseCount = 3;
          for (let p = 0; p < phaseCount; p++) {
            const phase = await prisma.rabNode.create({
              data: {
                projectId: project.id,
                parentId: subgroup.id,
                nodeType: 'phase',
                name: `Footing F${p + 1}`,
              },
            });
            nodeCount++;

            for (let i = 0; i < 5; i++) {
              await prisma.rabNode.create({
                data: {
                  projectId: project.id,
                  parentId: phase.id,
                  nodeType: 'item',
                  name: `Footing F${p + 1} - Item L3 #${i + 1}`,
                  volume: 1 + i * 0.8,
                  unit: units[(s + p + i) % units.length],
                  materialPrice: BigInt(120_000 + i * 90_000),
                  laborPrice: BigInt(20_000 + i * 12_000),
                  progressPercent: (i * 17) % 101,
                },
              });
              nodeCount++;
            }
          }
        }
      }
    }

    // ~200 node, bukan data mainan 5-10 baris.
    expect(nodeCount).toBeGreaterThanOrEqual(190);

    const approveStart = Date.now();
    await prisma.project.update({
      where: { id: project.id },
      data: { rabStatus: 'approved' },
    });
    const approveMs = Date.now() - approveStart;
    expect(approveMs).toBeLessThan(THRESHOLD_MS);

    // recompute lagi lewat UPDATE satu leaf (jalur paling sering dipakai UI)
    const oneItem = await prisma.rabNode.findFirstOrThrow({
      where: { projectId: project.id, nodeType: 'item' },
    });
    const updateStart = Date.now();
    await prisma.rabNode.update({
      where: { id: oneItem.id },
      data: { progressPercent: 99 },
    });
    const updateMs = Date.now() - updateStart;
    expect(updateMs).toBeLessThan(THRESHOLD_MS);

    const project2 = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    expect(Number(project2.progress)).toBeGreaterThanOrEqual(0);
    expect(Number(project2.progress)).toBeLessThanOrEqual(100);

    await prisma.project.delete({ where: { id: project.id } });
  }, 30_000);
});
