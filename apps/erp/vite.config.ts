import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
	define: {
		// REL-1: APP_VERSION disuntik CI; lokal jatuh ke package.json.
		// ENV-2: APP_ENV=staging menampilkan pita STAGING. Keduanya variabel build, bukan runtime.
		__APP_VERSION__: JSON.stringify(process.env.APP_VERSION ?? pkg.version),
		__APP_ENV__: JSON.stringify(process.env.APP_ENV ?? '')
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// SPA murni (SRS §2.4): tanpa server Node; Caddy menyajikan build/ dan
			// jatuh ke 200.html untuk route yang tak cocok file statis.
			adapter: adapter({ fallback: '200.html' })
		})
	],
	server: {
		// Dev meniru produksi: API satu origin di /api (cookie SameSite=Lax, tanpa CORS).
		proxy: { '/api': process.env.API_ORIGIN ?? 'http://localhost:3001' }
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
