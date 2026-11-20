import { expect, test, type Page } from '@playwright/test';

// Tanpa backend: /auth/me dipalsukan lewat page.route.
async function login(page: Page, role: string) {
	await page.route('**/api/v1/auth/me', (r) =>
		r.fulfill({ json: { id: '1', name: 'Budi', email: 'b@acme.example', role, mustChangePassword: false } })
	);
}

const sizes = [
	{ w: 360, h: 740, nav: 'bottom' },
	{ w: 390, h: 844, nav: 'bottom' },
	{ w: 744, h: 1133, nav: 'rail' },
	{ w: 820, h: 1180, nav: 'rail' },
	{ w: 1024, h: 768, nav: 'full' },
	{ w: 1440, h: 900, nav: 'full' }
] as const;

for (const s of sizes) {
	test(`navigasi ${s.nav} di ${s.w}px`, async ({ page }) => {
		await page.setViewportSize({ width: s.w, height: s.h });
		await login(page, 'pimpinan');
		await page.goto('/dashboard');
		const bottom = page.locator('nav[aria-label="Menu utama"]').last();
		const side = page.locator('aside');
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
		if (s.nav === 'bottom') {
			await expect(bottom).toBeVisible();
			await expect(side).toBeHidden();
			await expect(bottom.getByRole('button', { name: 'Lainnya' })).toBeVisible();
		} else {
			await expect(bottom).toBeHidden();
			await expect(side).toBeVisible();
			const width = (await side.boundingBox())!.width;
			expect(width).toBe(s.nav === 'rail' ? 64 : 240);
		}
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
		expect(overflow).toBeLessThanOrEqual(0);
	});
}

for (const role of ['pimpinan', 'admin', 'staff_gudang']) {
	test(`menu akun & keluar untuk ${role}`, async ({ page }) => {
		await page.setViewportSize({ width: 1024, height: 768 });
		await login(page, role);
		await page.route('**/api/v1/auth/logout', (r) => r.fulfill({ status: 204 }));
		await page.goto('/dashboard');
		await page.getByRole('button', { name: /Budi/ }).click();
		await expect(page.getByText(role === 'staff_gudang' ? 'Staff Gudang' : role === 'admin' ? 'Admin' : 'Pimpinan').last()).toBeVisible();
		await page.getByRole('button', { name: 'Keluar' }).click();
		await expect(page).toHaveURL(/\/login/);
	});
}

test('Lainnya membuka sheet berisi Keluar di HP', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await login(page, 'staff_gudang');
	await page.goto('/dashboard');
	await page.getByRole('button', { name: 'Lainnya' }).click();
	await expect(page.locator('#menu-lainnya').getByRole('button', { name: 'Keluar' })).toBeVisible();
});

test('halaman tak dikenal menampilkan 404 berbahasa Indonesia', async ({ page }) => {
	await login(page, 'admin');
	await page.goto('/tidak-ada');
	await expect(page.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible();
});

test('403 dari /auth/me tampil sebagai Akses ditolak', async ({ page }) => {
	await page.route('**/api/v1/auth/me', (r) =>
		r.fulfill({ status: 403, json: { statusCode: 403, error: 'Forbidden', message: 'Dilarang', requestId: '' } })
	);
	await page.goto('/dashboard');
	await expect(page.getByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
});

test('401 dari /auth/me mengarah ke /login?next=/dashboard', async ({ page }) => {
	await page.route('**/api/v1/auth/me', (r) =>
		r.fulfill({ status: 401, json: { statusCode: 401, error: 'Unauthorized', message: 'x', requestId: '' } })
	);
	await page.route('**/api/v1/auth/refresh', (r) => r.fulfill({ status: 401, json: {} }));
	await page.goto('/dashboard');
	await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});

test('skip link memfokuskan konten', async ({ page }) => {
	await login(page, 'admin');
	await page.goto('/dashboard');
	await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
	await page.keyboard.press('Tab');
	await expect(page.getByRole('link', { name: 'Lewati ke konten' })).toBeFocused();
});

test('staff_gudang tak punya Dokumen di DOM', async ({ page }) => {
	await login(page, 'staff_gudang');
	await page.goto('/dashboard');
	await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
	await expect(page.getByText('Dokumen')).toHaveCount(0);
});
