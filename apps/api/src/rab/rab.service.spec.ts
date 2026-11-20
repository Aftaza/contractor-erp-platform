// acme-backend/src/rab/rab.service.spec.ts
//
// Unit test (Prisma + PolicyService mock — master §9.1) untuk RabService.
// Test yang butuh Postgres nyata (trigger `total`, agregasi progress, audit)
// ada di rab.db-spec.ts.
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { NodeType, RabStatus } from '@prisma/client';
import { PolicyService } from '../policy/policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { RabService } from './rab.service';

/** Bentuk argumen `{ data: ... }` yang benar-benar dibaca test di bawah (mock.calls) — pola sama seperti projects.service.spec.ts. */
type MutateArgs = { data: Record<string, unknown> };

type MockPrisma = {
  project: {
    findUnique: jest.Mock;
    update: jest.Mock<Promise<unknown>, [MutateArgs]>;
  };
  rabNode: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock<Promise<unknown>, [MutateArgs]>;
    update: jest.Mock<Promise<unknown>, [MutateArgs]>;
    delete: jest.Mock;
    count: jest.Mock;
    aggregate: jest.Mock;
  };
};

function makePrismaMock(): MockPrisma {
  return {
    project: {
      findUnique: jest.fn(),
      update: jest.fn<Promise<unknown>, [MutateArgs]>(),
    },
    rabNode: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn<Promise<unknown>, [MutateArgs]>(),
      update: jest.fn<Promise<unknown>, [MutateArgs]>(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  };
}

const PROJECT_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const BASE_PROJECT = {
  id: PROJECT_ID,
  rabStatus: RabStatus.draft as RabStatus,
  ppnEnabled: false,
  ppnRate: { toString: () => '11' } as unknown,
};

function project(overrides: Partial<typeof BASE_PROJECT> = {}) {
  return { ...BASE_PROJECT, ...overrides };
}

const SECTION_ID = 'bbbbbbbb-0000-4000-8000-000000000002';
const BASE_SECTION = {
  id: SECTION_ID,
  projectId: PROJECT_ID,
  parentId: null,
  nodeType: NodeType.section,
  name: 'Pekerjaan Persiapan',
};

const ITEM_ID = 'cccccccc-0000-4000-8000-000000000003';
function baseItem(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    projectId: PROJECT_ID,
    parentId: SECTION_ID,
    nodeType: NodeType.item,
    name: 'Pasir Urug',
    volume: { toNumber: () => 10 } as unknown,
    unit: 'm3',
    materialPrice: 100_000n,
    laborPrice: null,
    progressPercent: 0,
    ...overrides,
  };
}

describe('RabService', () => {
  let prisma: MockPrisma;
  let policy: PolicyService;
  let service: RabService;

  beforeEach(() => {
    prisma = makePrismaMock();
    policy = new PolicyService();
    service = new RabService(prisma as unknown as PrismaService, policy);
  });

  describe('create', () => {
    it('root tanpa parentId wajib nodeType section', async () => {
      prisma.project.findUnique.mockResolvedValue(project());

      await expect(
        service.create(
          PROJECT_ID,
          {
            nodeType: NodeType.item,
            name: 'X',
            volume: 1,
            unit: 'm3',
            materialPrice: 1000,
          },
          'pimpinan',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('parentId menunjuk node item → ditolak (item tak boleh punya anak)', async () => {
      prisma.project.findUnique.mockResolvedValue(project());
      prisma.rabNode.findUnique.mockResolvedValue(baseItem());

      await expect(
        service.create(
          PROJECT_ID,
          { parentId: ITEM_ID, nodeType: NodeType.item, name: 'Anak' },
          'pimpinan',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('parentId dari proyek lain → ditolak', async () => {
      prisma.project.findUnique.mockResolvedValue(project());
      prisma.rabNode.findUnique.mockResolvedValue({
        ...BASE_SECTION,
        projectId: 'proyek-lain',
      });

      await expect(
        service.create(
          PROJECT_ID,
          { parentId: SECTION_ID, nodeType: NodeType.subgroup, name: 'X' },
          'pimpinan',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('node item tanpa volume/unit → ditolak', async () => {
      prisma.project.findUnique.mockResolvedValue(project());
      prisma.rabNode.findUnique.mockResolvedValue(BASE_SECTION);

      await expect(
        service.create(
          PROJECT_ID,
          {
            parentId: SECTION_ID,
            nodeType: NodeType.item,
            name: 'Pasir',
            materialPrice: 1000,
          },
          'pimpinan',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('node item tanpa materialPrice maupun laborPrice → ditolak', async () => {
      prisma.project.findUnique.mockResolvedValue(project());
      prisma.rabNode.findUnique.mockResolvedValue(BASE_SECTION);

      await expect(
        service.create(
          PROJECT_ID,
          {
            parentId: SECTION_ID,
            nodeType: NodeType.item,
            name: 'Pasir',
            volume: 10,
            unit: 'm3',
          },
          'pimpinan',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('node grup (section/subgroup/phase) dengan field harga → ditolak', async () => {
      prisma.project.findUnique.mockResolvedValue(project());

      await expect(
        service.create(
          PROJECT_ID,
          {
            nodeType: NodeType.section,
            name: 'Section punya harga?',
            materialPrice: 1000,
          },
          'pimpinan',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('node item valid → diteruskan ke Prisma dengan harga sebagai BigInt', async () => {
      prisma.project.findUnique.mockResolvedValue(project());
      prisma.rabNode.findUnique.mockResolvedValue(BASE_SECTION);
      prisma.rabNode.create.mockResolvedValue(baseItem());

      await service.create(
        PROJECT_ID,
        {
          parentId: SECTION_ID,
          nodeType: NodeType.item,
          name: 'Pasir Urug',
          volume: 10,
          unit: 'm3',
          materialPrice: 100_000,
        },
        'pimpinan',
      );

      const call = prisma.rabNode.create.mock.calls[0][0];
      expect(call.data.materialPrice).toBe(100_000n);
      expect(call.data.volume).toBe(10);
    });

    it('admin ditolak ForbiddenException saat rab_status approved', async () => {
      prisma.project.findUnique.mockResolvedValue(
        project({ rabStatus: RabStatus.approved }),
      );

      await expect(
        service.create(
          PROJECT_ID,
          { nodeType: NodeType.section, name: 'X' },
          'admin',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('pimpinan tetap lolos saat rab_status approved', async () => {
      prisma.project.findUnique.mockResolvedValue(
        project({ rabStatus: RabStatus.approved }),
      );
      prisma.rabNode.create.mockResolvedValue(BASE_SECTION);

      await expect(
        service.create(
          PROJECT_ID,
          { nodeType: NodeType.section, name: 'X' },
          'pimpinan',
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('update', () => {
    it('PATCH hanya name pada item yang sudah valid tak melanggar bentuk pohon', async () => {
      prisma.rabNode.findUnique.mockResolvedValueOnce(baseItem()); // existing
      prisma.project.findUnique.mockResolvedValue(project());
      prisma.rabNode.update.mockResolvedValue(baseItem({ name: 'Baru' }));

      await expect(
        service.update(ITEM_ID, { name: 'Baru' }, 'pimpinan'),
      ).resolves.toBeDefined();
      const call = prisma.rabNode.update.mock.calls[0][0];
      expect(call.data.name).toBe('Baru');
    });

    it('parentId baru = keturunan node sendiri → ditolak (cegah siklus)', async () => {
      const child = baseItem({
        id: 'dddddddd-0000-4000-8000-000000000004',
        nodeType: NodeType.subgroup,
        parentId: SECTION_ID,
      });
      prisma.rabNode.findUnique
        .mockResolvedValueOnce({ ...BASE_SECTION }) // existing = SECTION
        .mockResolvedValueOnce(child); // parent baru (dicek nodeType != item)
      prisma.project.findUnique.mockResolvedValue(project());
      prisma.rabNode.findMany.mockResolvedValue([BASE_SECTION, child]);

      await expect(
        service.update(SECTION_ID, { parentId: child.id }, 'pimpinan'),
      ).rejects.toThrow(BadRequestException);
    });

    it('admin ditolak ForbiddenException saat rab_status approved', async () => {
      prisma.rabNode.findUnique.mockResolvedValueOnce(baseItem());
      prisma.project.findUnique.mockResolvedValue(
        project({ rabStatus: RabStatus.approved }),
      );

      await expect(
        service.update(ITEM_ID, { name: 'X' }, 'admin'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('admin lolos saat rab_status masih draft', async () => {
      prisma.rabNode.findUnique.mockResolvedValueOnce(baseItem());
      prisma.project.findUnique.mockResolvedValue(project());
      prisma.rabNode.update.mockResolvedValue(baseItem());

      await expect(
        service.update(ITEM_ID, { name: 'X' }, 'admin'),
      ).resolves.toBeDefined();
    });
  });

  describe('updateProgress', () => {
    it('node grup (bukan item) → ditolak', async () => {
      prisma.rabNode.findUnique.mockResolvedValue(BASE_SECTION);

      await expect(
        service.updateProgress(SECTION_ID, { progressPercent: 50 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('node yang punya anak → ditolak (bukan leaf)', async () => {
      prisma.rabNode.findUnique.mockResolvedValue(baseItem());
      prisma.rabNode.count.mockResolvedValue(1);

      await expect(
        service.updateProgress(ITEM_ID, { progressPercent: 50 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('leaf item valid → diteruskan ke Prisma', async () => {
      prisma.rabNode.findUnique.mockResolvedValue(baseItem());
      prisma.rabNode.count.mockResolvedValue(0);
      prisma.rabNode.update.mockResolvedValue(
        baseItem({ progressPercent: 75 }),
      );

      await service.updateProgress(ITEM_ID, { progressPercent: 75 });
      expect(prisma.rabNode.update).toHaveBeenCalledWith({
        where: { id: ITEM_ID },
        data: { progressPercent: 75 },
      });
    });
  });

  describe('approve', () => {
    it('sudah approved → ditolak 400 (bukan approve ganda)', async () => {
      prisma.project.findUnique.mockResolvedValue(
        project({ rabStatus: RabStatus.approved }),
      );

      await expect(service.approve(PROJECT_ID, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('draft → approved, hanya menulis rab_status/rab_approved_* (progress milik trigger)', async () => {
      prisma.project.findUnique.mockResolvedValue(project());
      prisma.project.update.mockResolvedValue(
        project({ rabStatus: RabStatus.approved }),
      );

      await service.approve(PROJECT_ID, 'user-1');
      const call = prisma.project.update.mock.calls[0][0];
      expect(call.data.rabStatus).toBe(RabStatus.approved);
      expect(call.data.rabApprovedBy).toBe('user-1');
      expect(call.data).not.toHaveProperty('progress');
    });
  });

  describe('summary — master §5.6', () => {
    it('PPN nonaktif: subtotal langsung dari Σ total item', async () => {
      prisma.project.findUnique.mockResolvedValue(
        project({ ppnEnabled: false }),
      );
      prisma.rabNode.aggregate.mockResolvedValue({
        _sum: { total: 1_234_567n },
      });

      const result = await service.summary(PROJECT_ID);
      expect(result.subtotal).toBe(1_234_567);
      expect(result.ppnAmount).toBe(0);
      expect(result.grandTotal).toBe(1_300_000);
    });

    it('tanpa node item sama sekali → subtotal 0, tak melempar error', async () => {
      prisma.project.findUnique.mockResolvedValue(project());
      prisma.rabNode.aggregate.mockResolvedValue({ _sum: { total: null } });

      const result = await service.summary(PROJECT_ID);
      expect(result.subtotal).toBe(0);
      expect(result.grandTotal).toBe(0);
    });
  });
});
