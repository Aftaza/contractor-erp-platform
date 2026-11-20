import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { confirm, confirmState, settle } from './confirm.svelte.ts';
import { toast, toasts } from './toast.svelte.ts';

vi.mock('#lib/notifications-api.ts', () => ({
	getUnreadCount: vi.fn().mockResolvedValue({ count: 3 }),
	listNotifications: vi.fn(),
	markRead: vi.fn(),
	markAllRead: vi.fn()
}));

describe('toast', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		toasts.splice(0);
		vi.useRealTimers();
	});

	it('sukses hilang 4 dtk; error tetap; Urungkan 10 dtk', () => {
		toast.success('a');
		toast.error('b');
		toast.info('c', { label: 'Urungkan', run: () => {} });
		vi.advanceTimersByTime(4000);
		expect(toasts.map((t) => t.message)).toEqual(['b', 'c']);
		vi.advanceTimersByTime(6000);
		expect(toasts.map((t) => t.message)).toEqual(['b']);
	});

	it('maksimal 3 bertumpuk, yang tertua dibuang', () => {
		for (const m of ['1', '2', '3', '4']) toast.error(m);
		expect(toasts.map((t) => t.message)).toEqual(['2', '3', '4']);
	});
});

describe('confirm()', () => {
	it('resolve true/false sesuai settle, dan menutup state', async () => {
		const p = confirm({ title: 't', message: 'm', confirmLabel: 'Hapus' });
		expect(confirmState.current?.opts.title).toBe('t');
		settle(true);
		await expect(p).resolves.toBe(true);
		expect(confirmState.current).toBeNull();
		const q = confirm({ title: 't', message: 'm', confirmLabel: 'Hapus' });
		settle(false);
		await expect(q).resolves.toBe(false);
	});

	it('dialog baru membatalkan yang lama', async () => {
		const a = confirm({ title: '1', message: '', confirmLabel: 'x' });
		const b = confirm({ title: '2', message: '', confirmLabel: 'x' });
		await expect(a).resolves.toBe(false);
		settle(true);
		await expect(b).resolves.toBe(true);
	});
});

describe('polling notifikasi', () => {
	let doc: EventTarget & { visibilityState: string };
	beforeEach(() => {
		vi.useFakeTimers();
		doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
		vi.stubGlobal('document', doc);
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('polling tiap 60 dtk hanya saat terlihat; kembali terlihat → refresh langsung', async () => {
		const { getUnreadCount } = await import('#lib/notifications-api.ts');
		const { startPolling, notifications } = await import('./notifications.svelte.ts');
		const calls = vi.mocked(getUnreadCount);
		calls.mockClear();
		const stop = startPolling();
		expect(calls).toHaveBeenCalledTimes(1); // segera saat mulai
		vi.advanceTimersByTime(60_000);
		expect(calls).toHaveBeenCalledTimes(2);

		doc.visibilityState = 'hidden';
		doc.dispatchEvent(new Event('visibilitychange'));
		vi.advanceTimersByTime(180_000);
		expect(calls).toHaveBeenCalledTimes(2); // berhenti

		doc.visibilityState = 'visible';
		doc.dispatchEvent(new Event('visibilitychange'));
		expect(calls).toHaveBeenCalledTimes(3); // refresh langsung
		await vi.advanceTimersByTimeAsync(0);
		expect(notifications.count).toBe(3);
		stop();
		vi.advanceTimersByTime(120_000);
		expect(calls).toHaveBeenCalledTimes(3);
	});
});

describe('toast jeda', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		toasts.splice(0);
		vi.useRealTimers();
	});
	it('pause menahan timer, resume menyalakan lagi', async () => {
		const { pause, resume } = await import('./toast.svelte.ts');
		const id = toast.success('x');
		pause(id);
		vi.advanceTimersByTime(10_000);
		expect(toasts).toHaveLength(1);
		resume(id);
		vi.advanceTimersByTime(4000);
		expect(toasts).toHaveLength(0);
	});
});
