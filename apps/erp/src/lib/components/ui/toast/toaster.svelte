<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Info from '@lucide/svelte/icons/info';
	import OctagonAlert from '@lucide/svelte/icons/octagon-alert';
	import { dismiss, pause, resume, toasts } from '#lib/feedback/toast.svelte.ts';

	const style = {
		success: 'border-success bg-success-tint',
		info: 'border-info bg-info-tint',
		error: 'border-danger bg-danger-tint'
	} as const;
	const icon = { success: CircleCheck, info: Info, error: OctagonAlert } as const;
</script>

<!-- Wadah live region selalu ada di DOM agar pembaca layar mengumumkan isi yang muncul. Bawah-tengah di HP (di atas bottom bar), kanan-bawah di desktop. -->
<div class="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:bottom-6 md:items-end">
	{#each [{ role: 'status', live: 'polite', kinds: ['success', 'info'] }, { role: 'alert', live: 'assertive', kinds: ['error'] }] as region (region.role)}
		<div role={region.role} aria-live={region.live as 'polite'} class="flex w-full flex-col gap-2 md:w-96">
			{#each toasts.filter((t) => region.kinds.includes(t.kind)) as t (t.id)}
				{@const Icon = icon[t.kind]}
				<div role="presentation" onmouseenter={() => pause(t.id)} onmouseleave={() => resume(t.id)} onfocusin={() => pause(t.id)} onfocusout={() => resume(t.id)} class="pointer-events-auto flex items-start gap-3 rounded-lg border-l-4 p-3 text-sm shadow-popover {style[t.kind]}">
					<Icon class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
					<p class="min-w-0 flex-1 break-words">
						{#if t.kind === 'error'}<span class="sr-only">Galat: </span>{/if}{t.message}
					</p>
					{#if t.action}
						{@const action = t.action}
						<button
							type="button"
							class="h-11 shrink-0 rounded-md px-2 font-semibold md:h-8 underline hover:bg-row-hover"
							onclick={() => {
								dismiss(t.id);
								action.run();
							}}>{action.label}</button
						>
					{/if}
					<button type="button" aria-label="Tutup" class="-my-2 flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-row-hover md:m-0 md:size-8" onclick={() => dismiss(t.id)}>
						<X class="size-4" aria-hidden="true" />
					</button>
				</div>
			{/each}
		</div>
	{/each}
</div>
