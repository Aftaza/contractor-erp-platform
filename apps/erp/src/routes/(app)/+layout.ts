import { error, redirect } from '@sveltejs/kit';
import { api, ApiError } from '#lib/api.ts';
import type { components } from '@acme/api-types';
import type { LayoutLoad } from './$types';

export type Me = components['schemas']['MeResponseDto'];

// Guard UX saja — backend tetap penjaga sebenarnya (AR-4).
export const load: LayoutLoad = async ({ fetch, url }) => {
	try {
		const me = await api<Me>('/auth/me', {}, fetch);
		if (me.mustChangePassword) redirect(307, '/change-password');
		return { me };
	} catch (e) {
		if (e instanceof ApiError && e.status === 401) {
			redirect(307, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
		}
		// 403 & kegagalan API lain → +error.svelte dengan status aslinya.
		if (e instanceof ApiError) error(e.status, e.body.message);
		throw e;
	}
};
