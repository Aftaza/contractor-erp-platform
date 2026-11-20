// Test integrasi (Postgres nyata) untuk `recompute_project_progress()`
// (WP-02, master §4.4): agregasi value-weighted, kedalaman campur (leaf di
// L1 DAN L3 — rab-format-analysis.md §3), dan aturan "hanya aktif saat
// rab_status='approved'".
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('agregasi progress (recompute_project_progress)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('progress TIDAK berubah saat rab_status draft, walau leaf diisi progress', async () => {
    const project = await prisma.project.create({
      data: {
        name: 'WP-02 test — draft tak teragregasi',
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
        // rab_status default 'draft'
      },
    });

    const item = await prisma.rabNode.create({
      data: {
        projectId: project.id,
        nodeType: 'item',
        name: 'Item draft',
        volume: 10,
        unit: 'M3',
        materialPrice: 100000n,
        progressPercent: 100,
      },
    });

    const stillDraft = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    expect(Number(stillDraft.progress)).toBe(0);

    // update progress lagi selagi draft — tetap tak berubah
    await prisma.rabNode.update({
      where: { id: item.id },
      data: { progressPercent: 75 },
    });
    const afterUpdate = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    expect(Number(afterUpdate.progress)).toBe(0);

    await prisma.project.delete({ where: { id: project.id } });
  });

  it('pohon kedalaman campur (leaf di L1 dan L3) → progress value-weighted benar setelah approve', async () => {
    const project = await prisma.project.create({
      data: {
        name: 'WP-02 test — kedalaman campur',
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
      },
    });

    // Struktur (meniru rab-format-analysis.md §3):
    //   Section A (L1)
    //     Item L1  (leaf langsung di L1)          volume=10, material=100.000 → total=1.000.000, progress=100
    //     Subgroup A (L2)
    //       Phase A (L3)
    //         Item L3a (leaf di L3)                volume=20, material=50.000  → total=1.000.000, progress=0
    //         Item L3b (leaf di L3)                volume=5,  material=200.000 → total=1.000.000, progress=40
    //
    // Ekspektasi manual (value-weighted by total, sampai root):
    //   Σ(total)   = 1.000.000 + 1.000.000 + 1.000.000 = 3.000.000
    //   Σ(total*progress) = 1.000.000*100 + 1.000.000*0 + 1.000.000*40 = 140.000.000
    //   progress_root = 140.000.000 / 3.000.000 = 46.666... ≈ 46.67

    const sectionA = await prisma.rabNode.create({
      data: { projectId: project.id, nodeType: 'section', name: 'Section A' },
    });
    await prisma.rabNode.create({
      data: {
        projectId: project.id,
        parentId: sectionA.id,
        nodeType: 'item',
        name: 'Item L1',
        volume: 10,
        unit: 'M3',
        materialPrice: 100000n,
        progressPercent: 100,
      },
    });
    const subgroupA = await prisma.rabNode.create({
      data: {
        projectId: project.id,
        parentId: sectionA.id,
        nodeType: 'subgroup',
        name: 'Subgroup A',
      },
    });
    const phaseA = await prisma.rabNode.create({
      data: {
        projectId: project.id,
        parentId: subgroupA.id,
        nodeType: 'phase',
        name: 'Phase A',
      },
    });
    await prisma.rabNode.create({
      data: {
        projectId: project.id,
        parentId: phaseA.id,
        nodeType: 'item',
        name: 'Item L3a',
        volume: 20,
        unit: 'M2',
        materialPrice: 50000n,
        progressPercent: 0,
      },
    });
    await prisma.rabNode.create({
      data: {
        projectId: project.id,
        parentId: phaseA.id,
        nodeType: 'item',
        name: 'Item L3b',
        volume: 5,
        unit: 'EA',
        materialPrice: 200000n,
        progressPercent: 40,
      },
    });

    // Approve — trigger project_recompute_on_approve_trg harus langsung
    // menghitung progress dari pohon yang sudah ada.
    await prisma.project.update({
      where: { id: project.id },
      data: { rabStatus: 'approved' },
    });

    const approved = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    expect(Number(approved.progress)).toBeCloseTo(46.67, 1);

    await prisma.project.delete({ where: { id: project.id } });
  });

  it('mengubah progress satu leaf setelah approve → agregasi ter-update lewat trigger UPDATE', async () => {
    const project = await prisma.project.create({
      data: {
        name: 'WP-02 test — update setelah approve',
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
        rabStatus: 'approved',
      },
    });

    const item1 = await prisma.rabNode.create({
      data: {
        projectId: project.id,
        nodeType: 'item',
        name: 'Item 1',
        volume: 1,
        unit: 'EA',
        materialPrice: 100000n,
        progressPercent: 0,
      },
    });
    await prisma.rabNode.create({
      data: {
        projectId: project.id,
        nodeType: 'item',
        name: 'Item 2',
        volume: 1,
        unit: 'EA',
        materialPrice: 100000n,
        progressPercent: 0,
      },
    });

    const before = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    expect(Number(before.progress)).toBe(0);

    await prisma.rabNode.update({
      where: { id: item1.id },
      data: { progressPercent: 100 },
    });

    const after = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    // total sama (100.000 tiap item), 1 dari 2 selesai 100% → weighted = 50%
    expect(Number(after.progress)).toBe(50);

    await prisma.project.delete({ where: { id: project.id } });
  });

  it('menghapus satu leaf setelah approve → agregasi ter-update lewat trigger DELETE', async () => {
    const project = await prisma.project.create({
      data: {
        name: 'WP-02 test — delete setelah approve',
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
        rabStatus: 'approved',
      },
    });

    await prisma.rabNode.create({
      data: {
        projectId: project.id,
        nodeType: 'item',
        name: 'Item selesai',
        volume: 1,
        unit: 'EA',
        materialPrice: 100000n,
        progressPercent: 100,
      },
    });
    const belumSelesai = await prisma.rabNode.create({
      data: {
        projectId: project.id,
        nodeType: 'item',
        name: 'Item belum',
        volume: 1,
        unit: 'EA',
        materialPrice: 100000n,
        progressPercent: 0,
      },
    });

    const before = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    expect(Number(before.progress)).toBe(50);

    await prisma.rabNode.delete({ where: { id: belumSelesai.id } });

    const after = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    expect(Number(after.progress)).toBe(100);

    await prisma.project.delete({ where: { id: project.id } });
  });
});
