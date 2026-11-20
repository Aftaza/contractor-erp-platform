import { ApiError } from '#lib/api.ts';
import { banners } from './banner.svelte.ts';
import { getUnreadCount, listNotifications, markAllRead, markRead, type AppNotification } from '#lib/notifications-api.ts';

export const POLL_MS = 60_000;

let count = $state(0);
let items = $state<AppNotification[]>([]);
let timer: ReturnType<typeof setInterval> | undefined;

export const notifications = {
	get count() {
		return count;
	},
	get items() {
		return items;
	},
	async refresh() {
		// Gagal jaringan tak boleh mengganggu UI; banner offline yang melaporkannya.
		try {
			count = (await getUnreadCount()).count;
		} catch (e) {
			// api() sudah mencoba refresh; 401 di sini = sesi benar-benar berakhir.
			if (e instanceof ApiError && e.status === 401) banners.show('session');
		}
	},
	async load() {
		try {
			items = (await listNotifications()).data;
		} catch {
			/* abaikan */
		}
	},
	async read(id: string) {
		await markRead(id);
		items = items.map((n) => (n.id === id ? { ...n, isRead: true } : n));
		await this.refresh();
	},
	async readAll() {
		await markAllRead();
		items = items.map((n) => ({ ...n, isRead: true }));
		count = 0;
	}
};

/** Polling 60 dtk hanya saat tab terlihat (FR-NTF-4); kembali terlihat → refresh langsung. */
export function startPolling(): () => void {
	const sync = () => {
		clearInterval(timer);
		timer = undefined;
		if (document.visibilityState !== 'visible') return;
		void notifications.refresh();
		timer = setInterval(() => void notifications.refresh(), POLL_MS);
	};
	document.addEventListener('visibilitychange', sync);
	sync();
	return () => {
		document.removeEventListener('visibilitychange', sync);
		clearInterval(timer);
		timer = undefined;
	};
}
