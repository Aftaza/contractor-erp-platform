// Integrasi dokumen privat (W1-11, SRS §3.9 FR-DOC-1..8, SEC-12) — app Nest
// sungguhan + Postgres. Membuktikan: G 403, magic byte palsu & ukuran lebih
// ditolak tanpa sisa berkas, nama traversal tak keluar direktori, unduh stream
// + audit, soft delete P, rujukan bukti pengeluaran, dan beban 3×50 MB.
//
//   DATABASE_URL=… npx jest --config test/jest-db.json --runInBand src/documents
import { randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { authCookie } from '../../test/auth-cookie';
import { AppModule } from '../app.module';
import { configureApp } from '../config/app-setup';
import { MAX_DOCUMENT_FILE_BYTES } from './document-file.util';

const raw = new PrismaClient();
const uploadsDir = mkdtempSync(join(tmpdir(), 'acme-docs-test-'));
process.env.UPLOADS_DIR = uploadsDir;
const privateDir = join(uploadsDir, 'private');
const tempDir = join(privateDir, '.tmp');
const fixtures = mkdtempSync(join(tmpdir(), 'acme-docs-fixture-'));

const PDF = Buffer.from('%PDF-1.7\n%isi uji\n%%EOF\n');
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/** Berkas PDF sintetis berukuran `bytes`, ditulis per chunk (tanpa buffer besar). */
function bigPdf(name: string, bytes: number): string {
  const path = join(fixtures, name);
  const fd = openSync(path, 'w');
  writeSync(fd, PDF);
  const chunk = Buffer.alloc(1024 * 1024, 0x20);
  for (let left = bytes - PDF.length; left > 0; left -= chunk.length) {
    writeSync(fd, chunk, 0, Math.min(chunk.length, left));
  }
  closeSync(fd);
  return path;
}

describe('documents — dokumen privat (W1-11)', () => {
  let app: INestApplication<App>;
  const userIds: string[] = [];
  const projectIds: string[] = [];
  const users = {} as Record<Role, { id: string; token: string }>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    for (const role of [Role.pimpinan, Role.admin, Role.staff_gudang]) {
      users[role] = await createUserAndLogin(role);
    }
  }, 60_000);

  afterAll(async () => {
    await raw.expense.deleteMany({ where: { projectId: { in: projectIds } } });
    await raw.document.deleteMany({ where: { uploadedBy: { in: userIds } } });
    await raw.project.deleteMany({ where: { id: { in: projectIds } } });
    await raw.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await raw.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await raw.user.deleteMany({ where: { id: { in: userIds } } });
    await raw.$disconnect();
    await app.close();
    rmSync(uploadsDir, { recursive: true, force: true });
    rmSync(fixtures, { recursive: true, force: true });
  });

  async function createUserAndLogin(role: Role) {
    const email = `w111-docs-${randomUUID()}@acme.local`;
    const password = 'PasswordAwal-123!';
    const user = await raw.user.create({
      data: {
        email,
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        fullName: `W1-11 ${role}`,
        role,
        mustChangePassword: false,
      },
    });
    userIds.push(user.id);
    const res = await http()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return { id: user.id, token: authCookie(res, 'access_token') };
  }

  async function createProject(): Promise<string> {
    const p = await raw.project.create({
      data: {
        name: `W1-11 ${randomUUID()}`,
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
      },
    });
    projectIds.push(p.id);
    return p.id;
  }

  const as = (role: Role) => `Bearer ${users[role].token}`;

  interface Doc {
    id: string;
    files: { id: string; originalName: string; mime: string; size: number }[];
  }

  async function upload(
    fields: Record<string, string>,
    role: Role = Role.admin,
  ): Promise<Doc> {
    let req = http().post('/api/v1/documents').set('Authorization', as(role));
    for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
    const res = await req
      .attach('files', PDF, {
        filename: 'nota.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    return res.body as Doc;
  }

  it('staff_gudang 403 di semua endpoint dokumen; admin 403 hapus/pulihkan', async () => {
    const doc = await upload({ title: 'Kontrak', category: 'kontrak' });
    const fileId = doc.files[0].id;
    const G = as(Role.staff_gudang);
    await http().get('/api/v1/documents').set('Authorization', G).expect(403);
    await http()
      .get(`/api/v1/documents/${doc.id}`)
      .set('Authorization', G)
      .expect(403);
    await http()
      .post('/api/v1/documents')
      .set('Authorization', G)
      .attach('files', PDF, 'a.pdf')
      .expect(403);
    await http()
      .patch(`/api/v1/documents/${doc.id}`)
      .set('Authorization', G)
      .send({ title: 'x' })
      .expect(403);
    await http()
      .post(`/api/v1/documents/${doc.id}/files`)
      .set('Authorization', G)
      .attach('files', PDF, 'a.pdf')
      .expect(403);
    await http()
      .get(`/api/v1/documents/${doc.id}/files/${fileId}`)
      .set('Authorization', G)
      .expect(403);
    await http()
      .delete(`/api/v1/documents/${doc.id}`)
      .set('Authorization', G)
      .expect(403);
    await http()
      .delete(`/api/v1/documents/${doc.id}`)
      .set('Authorization', as(Role.admin))
      .expect(403);
    await http()
      .post(`/api/v1/documents/${doc.id}/restore`)
      .set('Authorization', as(Role.admin))
      .expect(403);
    // Guard menolak sebelum multer menulis apa pun.
    expect(readdirSync(tempDir)).toEqual([]);
  });

  it('multi-file: magic byte menentukan mime, nama traversal disanitasi, berkas hanya di private/<id>, audit ber-user', async () => {
    const projectId = await createProject();
    const res = await http()
      .post('/api/v1/documents')
      .set('Authorization', as(Role.admin))
      .field('title', 'Berkas tender')
      .field('category', 'tender')
      .field('projectId', projectId)
      .attach('files', PDF, {
        filename: '../../../etc/evil.pdf',
        contentType: 'application/octet-stream',
      })
      .attach('files', PNG_1X1, {
        filename: '..\\..\\foto.png',
        contentType: 'image/png',
      })
      .expect(201);
    const doc = res.body as Doc;

    expect(doc.files.map((f) => [f.originalName, f.mime])).toEqual([
      ['evil.pdf', 'application/pdf'],
      ['foto.png', 'image/png'],
    ]);
    for (const f of doc.files) {
      expect(readFileSync(join(privateDir, f.id)).length).toBe(f.size);
    }
    // Tak ada yang tertulis di luar private/, dan tak ada sisa .tmp.
    expect(readdirSync(uploadsDir)).toEqual(['private']);
    expect(readdirSync(tempDir)).toEqual([]);
    expect(existsSync(join(uploadsDir, '..', 'etc', 'evil.pdf'))).toBe(false);

    const audits = await raw.auditLog.findMany({
      where: {
        action: 'INSERT',
        recordId: { in: [doc.id, ...doc.files.map((f) => f.id)] },
      },
    });
    expect(audits).toHaveLength(3);
    expect(audits.every((a) => a.userId === users[Role.admin].id)).toBe(true);

    const list = await http()
      .get(`/api/v1/documents?projectId=${projectId}`)
      .set('Authorization', as(Role.pimpinan))
      .expect(200);
    expect((list.body as { data: Doc[] }).data.map((d) => d.id)).toEqual([
      doc.id,
    ]);
  });

  it('magic byte palsu (.pdf berisi EXE) → 400, tanpa dokumen & tanpa sisa berkas', async () => {
    const title = `palsu-${randomUUID()}`;
    await http()
      .post('/api/v1/documents')
      .set('Authorization', as(Role.admin))
      .field('title', title)
      .field('category', 'kontrak')
      .attach('files', PDF, 'baik.pdf')
      .attach('files', Buffer.from('MZ\x90\x00\x03'), {
        filename: 'nota.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
    expect(await raw.document.count({ where: { title } })).toBe(0);
    expect(readdirSync(tempDir)).toEqual([]);
  });

  it('validasi DTO gagal setelah multer menulis → sisa sementara tetap dibersihkan', async () => {
    await http()
      .post('/api/v1/documents')
      .set('Authorization', as(Role.admin))
      .field('title', 'x')
      .field('category', 'bukan-kategori')
      .attach('files', PDF, 'a.pdf')
      .expect(400);
    expect(readdirSync(tempDir)).toEqual([]);
  });

  it('berkas > 50 MB → 413, tanpa sisa berkas', async () => {
    const path = bigPdf('besar.pdf', MAX_DOCUMENT_FILE_BYTES + 1);
    await http()
      .post('/api/v1/documents')
      .set('Authorization', as(Role.admin))
      .field('title', 'terlalu besar')
      .field('category', 'gambar')
      .attach('files', path)
      .expect(413);
    expect(readdirSync(tempDir)).toEqual([]);
  }, 30_000);

  it('unduh: stream utuh, header aman, audit DOWNLOAD ber-user', async () => {
    const doc = await upload({ title: 'Invoice', category: 'invoice' });
    const file = doc.files[0];
    const res = await http()
      .get(`/api/v1/documents/${doc.id}/files/${file.id}`)
      .set('Authorization', as(Role.pimpinan))
      .responseType('blob')
      .expect(200);
    expect(Buffer.compare(res.body as Buffer, PDF)).toBe(0);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="nota.pdf"',
    );
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBe('private, no-store');

    const audit = await raw.auditLog.findFirst({
      where: { action: 'DOWNLOAD', recordId: file.id },
    });
    expect(audit?.userId).toBe(users[Role.pimpinan].id);
    expect(audit?.tableName).toBe('document_files');

    // fileId dokumen lain / acak → 404.
    await http()
      .get(`/api/v1/documents/${doc.id}/files/${randomUUID()}`)
      .set('Authorization', as(Role.pimpinan))
      .expect(404);
  });

  it('tambah berkas, soft delete pimpinan (audit ber-user), lalu pulihkan', async () => {
    const doc = await upload({ title: 'BAST', category: 'bast' });
    const added = await http()
      .post(`/api/v1/documents/${doc.id}/files`)
      .set('Authorization', as(Role.admin))
      .attach('files', PNG_1X1, 'foto.png')
      .expect(201);
    expect((added.body as Doc).files).toHaveLength(2);

    await http()
      .delete(`/api/v1/documents/${doc.id}`)
      .set('Authorization', as(Role.pimpinan))
      .expect(204);
    await http()
      .get(`/api/v1/documents/${doc.id}`)
      .set('Authorization', as(Role.pimpinan))
      .expect(404);
    await http()
      .get(`/api/v1/documents/${doc.id}/files/${doc.files[0].id}`)
      .set('Authorization', as(Role.pimpinan))
      .expect(404);
    const audit = await raw.auditLog.findFirst({
      where: { action: 'UPDATE', recordId: doc.id, tableName: 'documents' },
    });
    expect(audit?.userId).toBe(users[Role.pimpinan].id);

    await http()
      .post(`/api/v1/documents/${doc.id}/restore`)
      .set('Authorization', as(Role.pimpinan))
      .expect(200);
    await http()
      .get(`/api/v1/documents/${doc.id}`)
      .set('Authorization', as(Role.admin))
      .expect(200);
  });

  it('validUntil hanya untuk legalitas; filter expiring ≤ 60 hari', async () => {
    await http()
      .post('/api/v1/documents')
      .set('Authorization', as(Role.admin))
      .field('title', 'x')
      .field('category', 'kontrak')
      .field('validUntil', '2027-01-01')
      .attach('files', PDF, 'a.pdf')
      .expect(400);

    const soon = new Date(Date.now() + 10 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const later = new Date(Date.now() + 200 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const near = await upload({
      title: 'NIB',
      category: 'legalitas',
      validUntil: soon,
    });
    const far = await upload({
      title: 'SIUJK',
      category: 'legalitas',
      validUntil: later,
    });
    const res = await http()
      .get('/api/v1/documents?expiring=true&perPage=100')
      .set('Authorization', as(Role.pimpinan))
      .expect(200);
    const ids = (res.body as { data: Doc[] }).data.map((d) => d.id);
    expect(ids).toContain(near.id);
    expect(ids).not.toContain(far.id);

    await http()
      .patch(`/api/v1/documents/${near.id}`)
      .set('Authorization', as(Role.admin))
      .send({ category: 'lainnya' })
      .expect(400);
  });

  it('pengeluaran: receiptDocumentId wajib dokumen bukti proyek sama', async () => {
    const projectId = await createProject();
    const otherProject = await createProject();
    const bukti = await upload({ title: 'Nota', category: 'bukti', projectId });
    const buktiLain = await upload({
      title: 'Nota lain',
      category: 'bukti',
      projectId: otherProject,
    });
    const kontrak = await upload({
      title: 'K',
      category: 'kontrak',
      projectId,
    });
    const body = (receiptDocumentId: string) => ({
      description: 'Semen',
      amount: 100000,
      expenseDate: '2026-02-01',
      category: 'material',
      receiptDocumentId,
    });
    const post = (id: string) =>
      http()
        .post(`/api/v1/projects/${projectId}/expenses`)
        .set('Authorization', as(Role.admin))
        .send(body(id));

    await post(kontrak.id).expect(400);
    await post(buktiLain.id).expect(400);
    await post(randomUUID()).expect(400);
    const ok = await post(bukti.id).expect(201);
    expect((ok.body as { receiptDocumentId: string }).receiptDocumentId).toBe(
      bukti.id,
    );
    await http()
      .patch(`/api/v1/expenses/${(ok.body as { id: string }).id}`)
      .set('Authorization', as(Role.admin))
      .send({ receiptDocumentId: kontrak.id })
      .expect(400);
  });

  it('beban SEC-12: 3 unggahan 50 MB paralel tanpa lonjakan RSS > 300 MB', async () => {
    const paths = [1, 2, 3].map((i) =>
      bigPdf(`beban-${i}.pdf`, MAX_DOCUMENT_FILE_BYTES),
    );
    global.gc?.();
    const before = process.memoryUsage().rss;
    let peak = before;
    const timer = setInterval(() => {
      peak = Math.max(peak, process.memoryUsage().rss);
    }, 10);
    try {
      await Promise.all(
        paths.map((p, i) =>
          http()
            .post('/api/v1/documents')
            .set('Authorization', as(Role.admin))
            .field('title', `beban ${i}`)
            .field('category', 'gambar')
            .attach('files', p)
            .expect(201),
        ),
      );
    } finally {
      clearInterval(timer);
    }
    const mb = (n: number) => Math.round(n / 1024 / 1024);
    // Satu proses = server + klien supertest; angka mencakup keduanya (batas atas).
    console.info(
      `RSS sebelum ${mb(before)} MB, puncak ${mb(peak)} MB, lonjakan ${mb(peak - before)} MB`,
    );
    expect(peak - before).toBeLessThan(300 * 1024 * 1024);
  }, 120_000);
});
