<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { buttonVariants } from '#lib/components/ui/button/index.ts';

	const TEXT: Record<number, [string, string]> = {
		403: ['Akses ditolak', 'Anda tidak punya izin untuk membuka halaman ini.'],
		404: ['Halaman tidak ditemukan', 'Alamat yang Anda buka tidak ada atau sudah dipindahkan.']
	};
	const [title, hint] = $derived(
		TEXT[page.status] ?? ['Gagal memuat halaman', 'Terjadi masalah saat memuat data. Periksa koneksi, lalu coba lagi.']
	);
</script>

<svelte:head><title>{title} — Acme ERP</title></svelte:head>

<div class="mx-auto flex max-w-md flex-col gap-3 py-8">
	<p class="text-sm font-medium text-text-muted">Kode {page.status}</p>
	<h1 class="text-2xl font-bold tracking-tight">{title}</h1>
	<p class="text-text-muted">{hint}</p>
	<div class="mt-3 flex gap-2">
		<a href={resolve('/(app)/dashboard')} class={buttonVariants()}>Ke Dashboard</a>
		{#if page.status >= 500}
			<button type="button" class={buttonVariants({ variant: 'secondary' })} onclick={() => location.reload()}>
				Coba lagi
			</button>
		{/if}
	</div>
</div>
