import { expect, test, type Page } from '@playwright/test';

async function setup(page: Page, onCount?: () => void) {
	await page.route('**/api/v1/auth/me', (r) =>
		r.fulfill({ json: { id: '1', name: 'Budi', email: 'b@acme.example', role: 'pimpinan', mustChangePassword: false } })
	);
	await page.route('**/api/v1/notifications/unread-count', (r) => {
		onCount?.();
		return r.fulfill({ json: { count: 2 } });
	});
	await page.route('**/api/v1/notifications?*', (r) =>
		r.fulfill({
			json: {
				data: [{ id: 'n1', userId: '1', type: 'warning', title: 'Pengajuan alat', message: 'Crane diajukan', isRead: false, link: null, createdAt: new Date().toISOString() }],
				meta: { page: 1, perPage: 20, total: 1 }
			}
		})
	);
	await page.goto('/umpan-balik-demo');
	await expect(page.getByRole('heading', { name: 'Demo umpan balik' })).toBeVisible();
}

test('toast sukses muncul, error tetap sampai ditutup', async ({ page }) => {
	await setup(page);
	await page.getByRole('button', { name: 'Toast sukses' }).click();
	await expect(page.getByRole('status').getByText('Pengeluaran disimpan')).toBeVisible();
	await page.getByRole('button', { name: 'Toast error' }).click();
	const err = page.getByRole('alert').getByText('Gagal menyimpan');
	await expect(err).toBeVisible();
	await page.getByRole('alert').getByRole('button', { name: 'Tutup' }).click();
	await expect(err).toBeHidden();
});

test('Urungkan memanggil aksi', async ({ page }) => {
	await setup(page);
	await page.getByRole('button', { name: 'Toast Urungkan' }).click();
	await page.getByRole('button', { name: 'Urungkan', exact: true }).click();
	await expect(page.getByTestId('hasil')).toHaveText('diurungkan');
});

test('dialog: fokus awal Batal, Esc membatalkan', async ({ page }) => {
	await setup(page);
	await page.getByRole('button', { name: 'Hapus ringan' }).click();
	await expect(page.getByRole('dialog', { name: 'Hapus pengeluaran?' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Batal' })).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(page.getByTestId('hasil')).toHaveText('batal');
});

test('dialog hapus berat: tombol aktif setelah mengetik nama', async ({ page }) => {
	await setup(page);
	await page.getByRole('button', { name: 'Hapus berat' }).click();
	const ok = page.getByRole('button', { name: 'Hapus proyek' });
	await expect(page.getByRole('button', { name: 'Batal' })).toBeFocused();
	await expect(ok).toBeDisabled();
	await page.getByLabel(/Ketik/).fill('Gudang A');
	await expect(ok).toBeEnabled();
	await ok.click();
	await expect(page.getByTestId('hasil')).toHaveText('ya');
});

test('lonceng: badge, daftar, dan polling berhenti saat tab tersembunyi', async ({ page }) => {
	let hits = 0;
	await setup(page, () => hits++);
	await expect(page.getByRole('button', { name: 'Notifikasi, 2 belum dibaca' })).toBeVisible();
	await page.getByRole('button', { name: /^Notifikasi/ }).click();
	await expect(page.getByText('Crane diajukan')).toBeVisible();

	const hide = (state: 'hidden' | 'visible') =>
		page.evaluate((s) => {
			Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => s });
			document.dispatchEvent(new Event('visibilitychange'));
		}, state);
	await page.clock.install();
	await hide('hidden');
	const before = hits;
	await page.clock.fastForward(180_000);
	expect(hits).toBe(before);
	await hide('visible');
	await expect.poll(() => hits).toBe(before + 1);
	await page.clock.fastForward(60_000);
	await expect.poll(() => hits).toBe(before + 2);
});

test('peringatan pola A: Perbaiki fokus awal', async ({ page }) => {
	await setup(page);
	await page.getByRole('button', { name: 'Peringatan pola A' }).click();
	await expect(page.getByRole('button', { name: 'Perbaiki' })).toBeFocused();
	await page.getByRole('button', { name: 'Tetap Simpan' }).click();
	await expect(page.getByTestId('hasil')).toHaveText('tetap simpan');
});

test('banner offline muncul saat koneksi putus', async ({ page, context }) => {
	await setup(page);
	await context.setOffline(true);
	await expect(page.locator('[data-banner="offline"]')).toBeVisible();
	await context.setOffline(false);
	await expect(page.locator('[data-banner="offline"]')).toBeHidden();
});
