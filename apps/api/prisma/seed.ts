// Seed minimal (WP-02, master §10 & fase-0 WP-02): SATU akun pimpinan,
// must_change_password = true. Password argon2id, diambil dari env var —
// TAK PERNAH literal di kode. Tak ada akun seed lain (master §10 melarang
// kredensial default di repo).
//
// Jalankan: SEED_PIMPINAN_EMAIL=... SEED_PIMPINAN_PASSWORD=... SEED_PIMPINAN_NAME=... npx prisma db seed
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_PIMPINAN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_PIMPINAN_PASSWORD;
  const fullName = process.env.SEED_PIMPINAN_NAME ?? 'Pimpinan';

  if (!email || !password) {
    throw new Error(
      'SEED_PIMPINAN_EMAIL dan SEED_PIMPINAN_PASSWORD wajib di-set sebagai env var. ' +
        'Tak ada password default di kode (master §10).',
    );
  }
  if (password.length < 12) {
    throw new Error(
      'SEED_PIMPINAN_PASSWORD terlalu pendek (minimal 12 karakter).',
    );
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Akun pimpinan "${email}" sudah ada — dilewati.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      role: 'pimpinan',
      mustChangePassword: true,
    },
  });

  console.log(
    `Akun pimpinan dibuat: ${user.email} (${user.id}). Wajib ganti password saat login pertama.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
