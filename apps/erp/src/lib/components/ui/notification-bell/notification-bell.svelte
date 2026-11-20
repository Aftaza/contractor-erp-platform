<script lang="ts">
	import { goto } from '$app/navigation';
	import Bell from '@lucide/svelte/icons/bell';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Info from '@lucide/svelte/icons/info';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import OctagonAlert from '@lucide/svelte/icons/octagon-alert';
	import { notifications } from '#lib/feedback/notifications.svelte.ts';
	import { toast } from '#lib/feedback/toast.svelte.ts';
	import type { AppNotification } from '#lib/notifications-api.ts';

	const icons = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: OctagonAlert } as const;
	const tone = { info: 'text-info', success: 'text-success', warning: 'text-warning', danger: 'text-danger' } as const;
	const label = { info: 'Info', success: 'Berhasil', warning: 'Peringatan', danger: 'Bahaya' } as const; // ikon + teks, bukan warna saja

	let onlyUnread = $state(false);
	const shown = $derived(onlyUnread ? notifications.items.filter((n) => !n.isRead) : notifications.items);
	const badge = $derived(notifications.count > 99 ? '99+' : String(notifications.count));

	const rtf = new Intl.RelativeTimeFormat('id', { numeric: 'auto' });
	function ago(iso: string) {
		const s = (new Date(iso).getTime() - Date.now()) / 1000;
		for (const [unit, sec] of [['day', 86400], ['hour', 3600], ['minute', 60]] as const) {
			if (Math.abs(s) >= sec) return rtf.format(Math.round(s / sec), unit);
		}
		return 'baru saja';
	}

	async function open(n: AppNotification) {
		try {
			if (!n.isRead) await notifications.read(n.id);
		} catch {
			toast.error('Gagal menandai notifikasi dibaca');
		}
		document.getElementById('panel-notifikasi')?.hidePopover();
		// shortcut: link dari API diasumsikan path internal ERP (FR-NTF-3); validasi awalan '/' bila link bisa berasal dari input pengguna.
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- path dinamis dari server
		if (n.link) await goto(n.link);
	}

	async function readAll() {
		try {
			await notifications.readAll();
		} catch {
			toast.error('Gagal menandai semua dibaca');
		}
	}
</script>

<button
	type="button"
	popovertarget="panel-notifikasi"
	aria-label="Notifikasi{notifications.count ? `, ${notifications.count} belum dibaca` : ''}"
	class="relative flex size-11 items-center justify-center rounded-md hover:bg-row-hover md:size-10"
>
	<Bell class="size-5" strokeWidth={1.75} aria-hidden="true" />
	{#if notifications.count > 0}
		<span aria-hidden="true" class="absolute top-1 right-1 min-w-5 rounded-full bg-danger px-1 text-center text-[0.6875rem] leading-5 font-semibold text-surface">{badge}</span>
	{/if}
</button>
<!-- Perubahan jumlah diumumkan sopan; hanya teks berubah saat angka berubah. -->
<span class="sr-only" role="status" aria-live="polite">{notifications.count ? `${notifications.count} notifikasi belum dibaca` : ''}</span>

<div
	id="panel-notifikasi"
	popover
	role="dialog"
	aria-label="Pusat notifikasi"
	ontoggle={(e) => e.newState === 'open' && notifications.load()}
	class="m-0 inset-auto top-14 right-2 max-h-[min(36rem,80dvh)] w-[min(25rem,calc(100vw-1rem))] overflow-y-auto rounded-lg border border-border bg-surface p-0 text-sm shadow-popover"
>
	<div class="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
		<div class="flex gap-1" role="group" aria-label="Filter">
			{#each [[false, 'Semua'], [true, 'Belum dibaca']] as [v, text] (text)}
				<button type="button" aria-pressed={onlyUnread === v} onclick={() => (onlyUnread = v as boolean)} class="h-11 rounded-md px-2 hover:bg-row-hover md:h-8 aria-pressed:bg-row-hover aria-pressed:font-semibold">{text}</button>
			{/each}
		</div>
		<button type="button" onclick={readAll} disabled={!notifications.count} class="h-11 rounded-md px-2 underline md:h-8 hover:bg-row-hover disabled:opacity-50">Tandai semua dibaca</button>
	</div>
	{#if shown.length}
		<ul>
			{#each shown as n (n.id)}
				{@const Icon = icons[n.type]}
				<li class="border-b border-border last:border-0">
					<button type="button" onclick={() => open(n)} class="flex min-h-11 w-full items-start gap-3 px-3 py-2 text-left hover:bg-row-hover {n.isRead ? '' : 'bg-info-tint/40'}">
						<Icon class="mt-0.5 size-5 shrink-0 {tone[n.type]}" aria-hidden="true" />
						<span class="min-w-0 flex-1">
							<span class="sr-only">{label[n.type]}{n.isRead ? '' : ', belum dibaca'}. </span>
							<span class="block {n.isRead ? '' : 'font-semibold'}">{n.title}</span>
							<span class="block text-text-muted">{n.message}</span>
							<span class="block text-[0.8125rem] text-text-muted">{ago(n.createdAt)}</span>
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="p-4 text-text-muted">{onlyUnread ? 'Tidak ada notifikasi yang belum dibaca.' : 'Belum ada notifikasi.'}</p>
	{/if}
</div>
