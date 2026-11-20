<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.ts';
	import { WarningPanel } from '#lib/components/ui/warning-panel/index.ts';
	import { banners } from '#lib/feedback/banner.svelte.ts';
	import { confirm } from '#lib/feedback/confirm.svelte.ts';
	import { toast } from '#lib/feedback/toast.svelte.ts';

	// shortcut: halaman demo saluran umpan balik (W2-02) untuk e2e/QA; hapus saat fitur nyata (W2-03+) memakai komponennya.
	let hasil = $state('');
	let panelA = $state(false);
	const warnings = [{ code: 'RAB_OVER', message: 'Nota melebihi volume RAB item ini.' }];
</script>

<svelte:head><title>Demo umpan balik — Acme ERP</title></svelte:head>

<h1 class="text-2xl font-bold tracking-tight">Demo umpan balik</h1>
<div class="mt-4 flex flex-wrap gap-2">
	<Button onclick={() => toast.success('Pengeluaran disimpan')}>Toast sukses</Button>
	<Button onclick={() => toast.error('Gagal menyimpan: server tidak merespons')}>Toast error</Button>
	<Button onclick={() => toast.success('Pengeluaran dihapus', { label: 'Urungkan', run: () => (hasil = 'diurungkan') })}>Toast Urungkan</Button>
	<Button variant="danger" onclick={async () => (hasil = (await confirm({ title: 'Hapus pengeluaran?', message: "Hapus pengeluaran 'Sewa crane'? Data dapat dipulihkan dari Tempat Sampah.", confirmLabel: 'Hapus pengeluaran' })) ? 'ya' : 'batal')}>Hapus ringan</Button>
	<Button variant="danger" onclick={async () => (hasil = (await confirm({ title: 'Hapus proyek?', message: 'Proyek berisi 120 node RAB.', confirmLabel: 'Hapus proyek', requireText: 'Gudang A' })) ? 'ya' : 'batal')}>Hapus berat</Button>
	<Button variant="secondary" onclick={() => banners.show('update')}>Banner versi baru</Button>
	<Button variant="secondary" onclick={() => (panelA = true)}>Peringatan pola A</Button>
</div>
<p class="mt-4" data-testid="hasil">{hasil}</p>
<div class="mt-4 space-y-4">
	{#if panelA}
		<WarningPanel {warnings} onfix={() => (panelA = false)} onforce={() => ((panelA = false), (hasil = 'tetap simpan'))} />
	{/if}
	<WarningPanel {warnings} severity="danger" />
</div>
