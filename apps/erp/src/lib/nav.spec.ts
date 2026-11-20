import { describe, expect, it } from 'vitest';
import { menuFor, NAV, routeIds } from './nav.ts';

const all = new Set([...NAV.map((i) => i.id), '/(app)/account']);
const labels = (r: Parameters<typeof menuFor>[0]) => {
	const m = menuFor(r, all);
	return { bottom: m.bottom.map((i) => i.label), more: m.more.map((i) => i.label) };
};

describe('menuFor', () => {
	it('pimpinan', () => {
		expect(labels('pimpinan')).toEqual({
			bottom: ['Dashboard', 'Proyek', 'Persetujuan', 'Laporan'],
			more: ['Alat', 'Klien', 'Vendor', 'Dokumen', 'Publikasi Situs', 'Pengguna', 'Audit Log', 'Tempat Sampah', 'Akun Saya']
		});
	});
	it('admin tanpa menu pimpinan/gudang', () => {
		expect(labels('admin')).toEqual({
			bottom: ['Dashboard', 'Proyek', 'Alat', 'Laporan'],
			more: ['Klien', 'Vendor', 'Dokumen', 'Akun Saya']
		});
	});
	it('staff_gudang', () => {
		expect(labels('staff_gudang')).toEqual({
			bottom: ['Dashboard', 'Alat', 'Serah Terima', 'Proyek'],
			more: ['Akun Saya']
		});
	});
	it('menyembunyikan item tanpa halaman', () => {
		const m = menuFor('pimpinan', routeIds(['/src/routes/(app)/dashboard/+page.svelte']));
		expect(m.groups.flatMap((g) => g.items.map((i) => i.label))).toEqual(['Dashboard']);
		expect(m.more).toEqual([]);
	});
});
