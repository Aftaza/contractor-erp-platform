// SEC-6: migrasi 20261111140000_users_email_lowercase (Postgres nyata) —
// email lama ber-huruf kapital dinormalkan, bentrok lower(trim()) menggagalkan migrasi,
// dan login berhasil dengan huruf apa pun.
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { configureApp } from '../config/app-setup';

const prisma = new PrismaClient();
const [guard, normalize] = readFileSync(
  join(
    __dirname,
    '../../prisma/migrations/20261111140000_users_email_lowercase/migration.sql',
  ),
  'utf8',
).split('\n\n');
const ids: string[] = [];

async function mkUser(email: string, passwordHash: string) {
  const u = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: 'Email Test',
      role: Role.staff_gudang,
      mustChangePassword: false,
    },
  });
  ids.push(u.id);
  return u;
}

describe('migrasi email lowercase (users)', () => {
  beforeAll(() =>
    prisma.$executeRawUnsafe('DROP INDEX IF EXISTS users_email_lower_key'),
  );
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email))',
    );
    await prisma.$disconnect();
  });

  it('bentrok lower(trim(email)) -> migrasi gagal, data tak diubah', async () => {
    const k = randomUUID();
    await mkUser(`Dup-${k}@acme.local`, 'x');
    await mkUser(`dup-${k}@acme.local`, 'x');
    await expect(prisma.$executeRawUnsafe(guard)).rejects.toThrow(/bentrok/);
    await prisma.user.deleteMany({ where: { id: { in: ids.splice(0) } } });
  });

  it('email kapital lama dinormalkan & bisa login dengan huruf apa pun', async () => {
    const password = 'PasswordAwal-123!';
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    const lower = `old-${randomUUID()}@acme.local`;
    const u = await mkUser(
      lower.toUpperCase().replace('@ACME.LOCAL', '@acme.local'),
      hash,
    );
    await prisma.$executeRawUnsafe(guard);
    await prisma.$executeRawUnsafe(normalize);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).email,
    ).toBe(lower);

    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app: INestApplication<App> = mod.createNestApplication();
    configureApp(app);
    await app.init();
    try {
      for (const e of [lower, lower.toUpperCase(), ` ${lower} `]) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: e, password })
          .expect(200);
      }
    } finally {
      await app.close();
    }
  });
});
