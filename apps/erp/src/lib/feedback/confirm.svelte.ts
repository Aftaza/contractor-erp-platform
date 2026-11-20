// Dialog konfirmasi (SRS §3.10/§3.11): `await confirm({...})` → true bila pengguna menyetujui.
export interface ConfirmOptions {
	title: string;
	message: string;
	/** Label tombol bernama aksi, mis. "Hapus pengeluaran". */
	confirmLabel: string;
	variant?: 'danger' | 'primary';
	/** Hapus berat: tombol aktif setelah pengguna mengetik teks ini persis (mis. nama proyek). */
	requireText?: string;
}

let current = $state<{ opts: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);

export const confirmState = {
	get current() {
		return current;
	}
};

export function confirm(opts: ConfirmOptions): Promise<boolean> {
	current?.resolve(false); // satu dialog sekaligus; yang lama dianggap batal
	return new Promise((resolve) => {
		current = { opts, resolve };
	});
}

export function settle(ok: boolean) {
	const c = current;
	current = null;
	c?.resolve(ok);
}
