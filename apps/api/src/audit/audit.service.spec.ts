// acme-backend/src/audit/audit.service.spec.ts
//
// Unit test (Prisma mock — master §9.1) untuk AuditService. Test yang butuh
// Postgres nyata (kunci response 7 nama sesudah update user sungguhan) ada
// di audit.db-spec.ts.
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

interface FindManyArgs {
  where: { tableName?: string; userId?: string };
  skip: number;
  take: number;
  select: Record<string, boolean>;
}

function makePrismaMock() {
  return {
    auditLog: {
      findMany: jest
        .fn<Promise<unknown[]>, [FindManyArgs]>()
        .mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };
}

describe('AuditService', () => {
  it('default page=1, perPage=50', async () => {
    const prisma = makePrismaMock();
    const service = new AuditService(prisma as unknown as PrismaService);

    await service.findAll({});

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
  });

  it('perPage dibatasi maksimum 200 (§4 WP-22)', async () => {
    const prisma = makePrismaMock();
    const service = new AuditService(prisma as unknown as PrismaService);

    await service.findAll({ perPage: 500 });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });

  it('select EKSPLISIT tujuh kolom — TAK PERNAH memuat oldData/newData (§2.2)', async () => {
    const prisma = makePrismaMock();
    const service = new AuditService(prisma as unknown as PrismaService);

    await service.findAll({});

    const call = prisma.auditLog.findMany.mock.calls[0][0];
    expect(call.select).not.toHaveProperty('oldData');
    expect(call.select).not.toHaveProperty('newData');
    expect(Object.keys(call.select).sort()).toEqual(
      [
        'action',
        'createdAt',
        'id',
        'recordId',
        'tableName',
        'userEmail',
        'userRole',
      ].sort(),
    );
  });

  it('meneruskan filter tableName & userId ke where', async () => {
    const prisma = makePrismaMock();
    const service = new AuditService(prisma as unknown as PrismaService);

    await service.findAll({ tableName: 'projects', userId: 'u1' });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tableName: 'projects', userId: 'u1' },
      }),
    );
  });
});
