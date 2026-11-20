// Banner global (SRS §3.11): tetap tampil sampai kondisinya selesai.
export type BannerKind = 'offline' | 'session' | 'update' | 'rebuild';

let active = $state<{ kind: BannerKind; onAction?: () => void }[]>([]);

export const banners = {
	get list() {
		return active;
	},
	show(kind: BannerKind, onAction?: () => void) {
		active = [...active.filter((b) => b.kind !== kind), { kind, onAction }];
	},
	hide(kind: BannerKind) {
		active = active.filter((b) => b.kind !== kind);
	}
};

/** Pemicu nyata satu-satunya saat ini: offline. Sesi/versi/rebuild dipanggil dari fitur terkait lewat `banners.show`. */
export function watchOnline(): () => void {
	const sync = () => (navigator.onLine ? banners.hide('offline') : banners.show('offline'));
	sync();
	addEventListener('online', sync);
	addEventListener('offline', sync);
	return () => {
		removeEventListener('online', sync);
		removeEventListener('offline', sync);
	};
}
