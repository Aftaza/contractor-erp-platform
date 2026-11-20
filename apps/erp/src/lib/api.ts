// Client API dari browser. API disajikan satu origin di /api/v1 (Caddy di
// produksi, proxy Vite di dev), jadi cookie httpOnly ikut otomatis dan tak
// perlu CORS. Otorisasi tetap di backend — client ini tak menjaga apa pun.

export const API_BASE = '/api/v1';

/** Bentuk error seragam backend (master plan §3.1). */
export interface ApiErrorBody {
	statusCode: number;
	error: string;
	message: string;
	requestId: string;
}

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly body: ApiErrorBody
	) {
		super(body.message);
		this.name = 'ApiError';
	}
}

type ApiInit = Omit<RequestInit, 'body'> & { body?: unknown };

// Satu refresh untuk banyak request 401 yang datang bersamaan — refresh token
// dirotasi backend, jadi dua refresh paralel akan saling membatalkan.
let refreshing: Promise<boolean> | null = null;

function refreshSession(fetchFn: typeof fetch): Promise<boolean> {
	refreshing ??= fetchFn(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'same-origin' })
		.then((r) => r.ok)
		.catch(() => false)
		.finally(() => (refreshing = null));
	return refreshing;
}

async function send(path: string, init: ApiInit, fetchFn: typeof fetch): Promise<Response> {
	const isForm = init.body instanceof FormData;
	return fetchFn(`${API_BASE}${path}`, {
		...init,
		credentials: 'same-origin',
		headers: {
			// FormData: biarkan fetch menyusun Content-Type + boundary sendiri.
			...(isForm || init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
			...init.headers
		},
		body: isForm ? (init.body as FormData) : init.body === undefined ? undefined : JSON.stringify(init.body)
	});
}

/**
 * Panggil API. 401 di luar /auth/* → coba refresh sekali lalu ulangi.
 * `fetchFn` diisi `fetch` dari `load` SvelteKit agar navigasi tetap terlacak.
 */
export async function api<T>(path: string, init: ApiInit = {}, fetchFn: typeof fetch = fetch): Promise<T> {
	let res = await send(path, init, fetchFn);

	if (res.status === 401 && !path.startsWith('/auth/') && (await refreshSession(fetchFn))) {
		res = await send(path, init, fetchFn);
	}

	if (!res.ok) {
		let body: ApiErrorBody;
		try {
			body = (await res.json()) as ApiErrorBody;
		} catch {
			body = { statusCode: res.status, error: res.statusText || 'Error', message: 'Gagal menghubungi server', requestId: '' };
		}
		throw new ApiError(res.status, body);
	}

	if (res.status === 204) return undefined as T;
	return (await res.json()) as T;
}
