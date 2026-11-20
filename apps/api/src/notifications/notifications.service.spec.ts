// acme-backend/src/notifications/notifications.service.spec.ts
//
// Unit test (Prisma mock — master §9.1) untuk NotificationsService. Test
// yang butuh Postgres nyata ada di notifications.db-spec.ts.
import { NotFoundException } from '@nestjs/common';
import { NotificationType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

type MockPrisma = {
  notification: {
    findMany: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    createMany: jest.Mock;
  };
  user: {
    findMany: jest.Mock;
  };
};

function makePrismaMock(): MockPrisma {
  return {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      createMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };
}

const OWNER_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const OTHER_USER_ID = 'bbbbbbbb-0000-4000-8000-000000000002';
const ROW_ID = 'cccccccc-0000-4000-8000-000000000003';

function baseNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: ROW_ID,
    userId: OWNER_ID,
    type: NotificationType.info,
    title: 'Judul',
    message: 'Pesan',
    isRead: false,
    link: null,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('NotificationsService', () => {
  let prisma: MockPrisma;
  let service: NotificationsService;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new NotificationsService(prisma as unknown as PrismaService);
  });

  describe('findAllForUser', () => {
    it('memfilter where:{userId} dan membungkus bentuk {data, meta} master §3.2', async () => {
      prisma.notification.findMany.mockResolvedValue([baseNotification()]);
      prisma.notification.count.mockResolvedValue(1);

      const result = await service.findAllForUser(OWNER_ID, {});

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: OWNER_ID } }),
      );
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: OWNER_ID },
      });
      expect(result.meta).toEqual({ page: 1, perPage: 25, total: 1 });
    });
  });

  describe('markRead', () => {
    it('melempar NotFoundException (404, BUKAN 403) kalau baris bukan milik pemanggil — tak membocorkan keberadaan', async () => {
      // Query di-scope where:{id, userId} — baris milik orang lain TAK
      // PERNAH ditemukan, jadi findFirst mengembalikan null persis seperti
      // baris yang benar-benar tak ada.
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markRead(ROW_ID, OTHER_USER_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: ROW_ID, userId: OTHER_USER_ID },
      });
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('menandai isRead=true untuk baris miliknya', async () => {
      prisma.notification.findFirst.mockResolvedValue(baseNotification());
      prisma.notification.update.mockResolvedValue(
        baseNotification({ isRead: true }),
      );

      const result = await service.markRead(ROW_ID, OWNER_ID);

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: ROW_ID },
        data: { isRead: true },
      });
      expect(result.isRead).toBe(true);
    });
  });

  describe('notifyRole', () => {
    it('membuat satu baris notifikasi per user AKTIF dengan role tsb', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);

      await service.notifyRole(Role.pimpinan, {
        type: NotificationType.info,
        title: 'Judul',
        message: 'Pesan',
        link: '/projects/x/tools',
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: Role.pimpinan, isActive: true },
        select: { id: true },
      });
      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'u1',
            type: NotificationType.info,
            title: 'Judul',
            message: 'Pesan',
            link: '/projects/x/tools',
          },
          {
            userId: 'u2',
            type: NotificationType.info,
            title: 'Judul',
            message: 'Pesan',
            link: '/projects/x/tools',
          },
        ],
      });
    });

    it('tak ada user aktif dengan role tsb → tak memanggil createMany sama sekali', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.notifyRole(Role.pimpinan, {
        type: NotificationType.info,
        title: 'Judul',
        message: 'Pesan',
      });

      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });
  });
});
