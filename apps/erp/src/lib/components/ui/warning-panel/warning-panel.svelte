<script lang="ts">
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { Button } from '#lib/components/ui/button/index.ts';
	import type { ApiWarning } from '#lib/warnings.ts';

	// Pola A: beri `onfix` + `onforce` (tombol Perbaiki fokus awal / Tetap Simpan). Pola B: tanpa handler, hanya daftar.
	let {
		warnings,
		severity = 'warning',
		onfix,
		onforce,
		busy = false
	}: { warnings: ApiWarning[]; severity?: 'warning' | 'danger'; onfix?: () => void; onforce?: () => void; busy?: boolean } = $props();

	let fixBtn: HTMLButtonElement | undefined = $state();
	$effect(() => {
		if (onfix && warnings.length) fixBtn?.focus();
	});
</script>

{#if warnings.length}
	<section
		role={onfix ? 'alert' : 'region'}
		aria-label="Peringatan"
		class="rounded-lg border-l-4 p-4 text-sm {severity === 'danger' ? 'border-danger bg-danger-tint' : 'border-warning bg-warning-tint'}"
	>
		<div class="flex items-start gap-3">
			<TriangleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
			<ul class="min-w-0 flex-1 space-y-1">
				{#each warnings as w, i (i)}
					<li><span class="sr-only">Peringatan: </span>{w.message}
						{#if typeof w.ref === 'string' && w.ref.startsWith('/')}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- path internal dari API -->
							<a href={w.ref} class="underline">Lihat data</a>
						{/if}</li>
				{/each}
			</ul>
		</div>
		{#if onfix}
			<div class="mt-3 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
				<Button bind:ref={fixBtn} variant="primary" onclick={onfix}>Perbaiki</Button>
				<Button variant="secondary" disabled={busy} onclick={onforce}>Tetap Simpan</Button>
			</div>
		{/if}
	</section>
{/if}
