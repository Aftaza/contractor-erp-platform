<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { confirmState, settle } from '#lib/feedback/confirm.svelte.ts';

	let dialog: HTMLDialogElement;
	let cancelBtn: HTMLButtonElement | undefined = $state();
	let typed = $state('');

	const cur = $derived(confirmState.current);
	const ready = $derived(!cur?.opts.requireText || typed.trim() === cur.opts.requireText);

	// Dialog tak boleh bertahan lintas navigasi / promise menggantung.
	beforeNavigate(() => settle(false));
	$effect(() => () => settle(false));

	// <dialog>.showModal(): fokus terkunci, inert di luar, Esc → event close.
	$effect(() => {
		if (cur) {
			typed = '';
			dialog.showModal();
			cancelBtn?.focus(); // fokus awal selalu pada Batal (SRS FR-DEL-7)
		} else if (dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	aria-labelledby="confirm-title"
	aria-describedby="confirm-desc"
	onclose={() => !dialog.open && settle(false)}
	class="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-0 text-text shadow-dialog backdrop:bg-ink/40"
>
	{#if cur}
		<div class="p-5">
			<h2 id="confirm-title" class="text-lg font-semibold">{cur.opts.title}</h2>
			<p id="confirm-desc" class="mt-2 text-text-muted">{cur.opts.message}</p>
			{#if cur.opts.requireText}
				<label class="mt-4 block text-sm font-medium">
					Ketik <strong class="font-semibold">{cur.opts.requireText}</strong> untuk mengonfirmasi
					<input
						bind:value={typed}
						autocomplete="off"
						class="mt-1 block h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base md:h-10 md:text-sm"
					/>
				</label>
			{/if}
		</div>
		<div class="flex flex-col-reverse gap-2 border-t border-border p-4 md:flex-row md:justify-end">
			<Button bind:ref={cancelBtn} variant="secondary" onclick={() => settle(false)}>Batal</Button>
			<Button variant={cur.opts.variant === 'primary' ? 'primary' : 'danger'} disabled={!ready} onclick={() => settle(true)}>
				{cur.opts.confirmLabel}
			</Button>
		</div>
	{/if}
</dialog>
