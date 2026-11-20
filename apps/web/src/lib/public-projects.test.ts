// src/lib/public-projects.test.ts
//
// Self-check WP-50 (DoD butir 3) — tanpa framework, tanpa fixture, tanpa
// dependency baru. Test runner bawaan Node:
//   node --test src/lib/public-projects.test.ts
//
// Yang dikunci: pemetaan DTO -> Project, `endDate: null` -> year kosong, dan
// SEMUA kegagalan fetch -> [] (bukan lempar). Butir terakhir itu yang menjaga
// company profile tetap tayang saat ERP mati (§2.8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapPublicProject,
  fetchPublicProjects,
  type PublicProjectDto,
} from './public-projects.ts';

const DTO: PublicProjectDto = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  title: 'Proyek ERP',
  summary: 'Ringkasan publik.',
  category: 'Sipil',
  images: ['/uploads/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp'],
  location: 'Surabaya',
  endDate: '2026-06-30',
};

test('DTO valid -> Project benar', () => {
  const p = mapPublicProject(DTO);

  assert.equal(p.title, 'Proyek ERP');
  assert.equal(p.year, '2026');
  assert.equal(p.cat, 'Sipil');
  assert.equal(p.location, 'Surabaya');
  // Nama klien memang tak ada di DTO publik (§2.6) — kartu memakai location.
  assert.equal(p.client, '');
  assert.ok(
    p.img.endsWith('/uploads/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp'),
  );
  assert.equal(p.imgs?.length, 1);
});

test('endDate null -> year kosong (bukan "null", bukan NaN)', () => {
  const p = mapPublicProject({ ...DTO, endDate: null });
  assert.equal(p.year, '');
});

test('category null -> jatuh ke Industri, images kosong -> img kosong', () => {
  const p = mapPublicProject({ ...DTO, category: null, images: [] });
  assert.equal(p.cat, 'Industri');
  assert.equal(p.img, '');
  assert.equal(p.imgs, undefined);
});

test('fetch gagal (jaringan mati) -> [], tidak melempar', async () => {
  const asli = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(new Error('ECONNREFUSED'));
  try {
    assert.deepEqual(await fetchPublicProjects(), []);
  } finally {
    globalThis.fetch = asli;
  }
});

test('status 500 -> []', async () => {
  const asli = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(new Response('boom', { status: 500 }));
  try {
    assert.deepEqual(await fetchPublicProjects(), []);
  } finally {
    globalThis.fetch = asli;
  }
});

test('JSON bentuk tak sesuai -> []', async () => {
  const asli = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(JSON.stringify({ tidakAdaKunciData: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  try {
    assert.deepEqual(await fetchPublicProjects(), []);
  } finally {
    globalThis.fetch = asli;
  }
});

test('response sehat -> baris termap, baris cacat dibuang', async () => {
  const asli = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          data: [DTO, { id: 'x' }, null],
          meta: { page: 1, perPage: 100, total: 3 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
  try {
    const rows = await fetchPublicProjects();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].title, 'Proyek ERP');
  } finally {
    globalThis.fetch = asli;
  }
});
