<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { banners, type BannerKind } from '#lib/feedback/banner.svelte.ts';

	// Teks per jenis; `action` = tombol opsional (handler dari banners.show, kecuali `update`).
	const text: Record<BannerKind, { msg: string; tone: string; action?: string }> = {
		offline: { msg: 'Tidak ada koneksi. Perubahan belum tersimpan akan gagal sampai tersambung kembali.', tone: 'bg-warning-tint border-warning' },
		session: { msg: 'Sesi berakhir. Masuk lagi untuk melanjutkan.', tone: 'bg-danger-tint border-danger', action: 'Masuk lagi' },
		update: { msg: 'Versi baru Acme ERP tersedia.', tone: 'bg-info-tint border-info', action: 'Muat ulang' },
		rebuild: { msg: 'Pembaruan situs gagal.', tone: 'bg-danger-tint border-danger', action: 'Coba lagi' }
	};
	const loginHref = () => `${resolve('/(auth)/login')}?next=${encodeURIComponent(page.url.pathname + page.url.search)}`;
</script>

{#each banners.list as b (b.kind)}
	{@const t = text[b.kind]}
	<div role={b.kind === 'offline' ? 'status' : 'alert'} data-banner={b.kind} class="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm md:px-6 {t.tone}">
		<p>{t.msg}</p>
		<div class="flex items-center gap-1">
		{#if b.kind === 'session'}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- sudah lewat resolve() di loginHref -->
			<a href={loginHref()} class="font-semibold underline">{t.action}</a>
		{:else if t.action}
			<button type="button" class="h-11 font-semibold underline md:h-8" onclick={b.kind === 'update' ? () => location.reload() : b.onAction}>{t.action}</button>
		{/if}
		{#if b.kind !== 'offline'}
			<button type="button" aria-label="Tutup" class="flex size-11 items-center justify-center rounded-md hover:bg-row-hover md:size-8" onclick={() => banners.hide(b.kind)}><X class="size-4" aria-hidden="true" /></button>
		{/if}
		</div>
	</div>
{/each}
