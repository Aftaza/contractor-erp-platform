import { error } from '@sveltejs/kit';

// Demo hanya untuk dev dan build e2e (VITE_E2E=1 di playwright.config.ts); produksi → 404.
// import.meta.env.DEV (Vite) dipakai karena `$app/environment` tak tersedia di Kit 3.
export const load = () => {
	if (!import.meta.env.DEV && !import.meta.env.VITE_E2E) error(404);
};
