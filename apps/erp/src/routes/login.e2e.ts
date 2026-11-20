import { expect, test } from '@playwright/test';

// Tanpa backend: memastikan build SPA + fallback 200.html merender route langsung.
test('halaman login tampil', async ({ page }) => {
	await page.goto('/login');
	await expect(page.getByRole('heading', { name: 'Masuk ke Acme ERP' })).toBeVisible();
});
