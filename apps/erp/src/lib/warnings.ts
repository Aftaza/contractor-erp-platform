import { ApiError } from '#lib/api.ts';

/** Peringatan non-blokir dari API (FR-NTF-7). */
export interface ApiWarning {
	code: string;
	message: string;
	ref?: unknown;
}

/** Pola A: 422 `{ error: "Warnings", warnings: [...] }` → daftar; selain itu null. */
export function warningsFrom(e: unknown): ApiWarning[] | null {
	if (!(e instanceof ApiError) || e.status !== 422 || e.body.error !== 'Warnings') return null;
	const w = (e.body as unknown as { warnings?: ApiWarning[] }).warnings;
	return Array.isArray(w) && w.length ? w : null;
}
