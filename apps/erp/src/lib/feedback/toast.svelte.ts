// Toast (SRS §3.11): sukses/info hilang 4 dtk, error tetap, maks 3, aksi opsional (Urungkan 10 dtk).
export type ToastKind = 'success' | 'info' | 'error';
export interface ToastAction {
	label: string;
	run: () => void;
}
export interface Toast {
	id: number;
	kind: ToastKind;
	message: string;
	action?: ToastAction;
}

export const MAX_TOASTS = 3;
const TTL = 4000;
const TTL_WITH_ACTION = 10_000;

export const toasts = $state<Toast[]>([]);
let seq = 0;
// eslint-disable-next-line svelte/prefer-svelte-reactivity -- bukan state UI
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export function dismiss(id: number) {
	clearTimeout(timers.get(id));
	timers.delete(id);
	const i = toasts.findIndex((t) => t.id === id);
	if (i >= 0) toasts.splice(i, 1);
}

function arm(id: number, action: boolean) {
	timers.set(id, setTimeout(() => dismiss(id), action ? TTL_WITH_ACTION : TTL));
}

/** Jeda timer saat hover/fokus (WCAG 2.2.1); lanjut dari awal saat dilepas. */
export function pause(id: number) {
	clearTimeout(timers.get(id));
	timers.delete(id);
}
export function resume(id: number) {
	const t = toasts.find((x) => x.id === id);
	if (t && t.kind !== 'error' && !timers.has(id)) arm(id, !!t.action);
}

function push(kind: ToastKind, message: string, action?: ToastAction) {
	const id = ++seq;
	toasts.push({ id, kind, message, action });
	while (toasts.length > MAX_TOASTS) dismiss(toasts[0].id);
	if (kind !== 'error') arm(id, !!action);
	return id;
}

export const toast = {
	success: (message: string, action?: ToastAction) => push('success', message, action),
	info: (message: string, action?: ToastAction) => push('info', message, action),
	error: (message: string, action?: ToastAction) => push('error', message, action)
};
