<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { api, ApiError } from '#lib/api.ts';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import { Button } from '#lib/components/ui/button/index.ts';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let pending = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		pending = true;
		error = '';
		try {
			await api('/auth/login', { method: 'POST', body: { email, password } });
			// Hanya path internal — cegah open redirect lewat ?next=https://...
			const next = page.url.searchParams.get('next');
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- next sudah divalidasi path internal
			await goto(next?.startsWith('/') && !next.startsWith('//') ? next : resolve('/(app)/dashboard'));
		} catch (e) {
			error = e instanceof ApiError ? e.message : 'Terjadi kesalahan tak terduga';
		} finally {
			pending = false;
		}
	}
</script>

<svelte:head><title>Masuk — Acme ERP</title></svelte:head>

<main class="flex min-h-dvh items-center justify-center p-4">
	<form onsubmit={submit} class="w-full max-w-sm space-y-4 rounded-lg border border-border bg-surface p-6">
		<h1 class="text-2xl font-bold tracking-tight">Masuk ke Acme ERP</h1>

		<label class="block text-[0.8125rem] font-medium">
			Email
			<input bind:value={email} type="email" required autocomplete="username" class="mt-1 h-11 md:h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-base md:text-[0.9375rem]" />
		</label>
		<label class="block text-[0.8125rem] font-medium">
			Password
			<input bind:value={password} type="password" required autocomplete="current-password" class="mt-1 h-11 md:h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-base md:text-[0.9375rem]" />
		</label>

		{#if error}<p role="alert" class="text-sm text-danger">{error}</p>{/if}

		<Button type="submit" disabled={pending} class="w-full">{#if pending}<LoaderCircle class="animate-spin motion-reduce:animate-none" aria-hidden="true" />{/if}{pending ? 'Memproses…' : 'Masuk'}</Button>
	</form>
</main>
