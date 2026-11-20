<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import LogOut from '@lucide/svelte/icons/log-out';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { api } from '#lib/api.ts';
	import { Banners } from '#lib/components/ui/banner/index.ts';
	import { ConfirmDialog } from '#lib/components/ui/confirm-dialog/index.ts';
	import { NotificationBell } from '#lib/components/ui/notification-bell/index.ts';
	import { Toaster } from '#lib/components/ui/toast/index.ts';
	import { watchOnline } from '#lib/feedback/banner.svelte.ts';
	import { notifications, startPolling } from '#lib/feedback/notifications.svelte.ts';
	import { menuFor, routeIds, type NavItem, type Role } from '#lib/nav.ts';

	let { me, children }: { me: { name: string; role: Role }; children: Snippet } = $props();

	const ROLE_LABEL: Record<Role, string> = {
		pimpinan: 'Pimpinan',
		admin: 'Admin',
		staff_gudang: 'Staff Gudang'
	};

	// Kunci glob = halaman yang ada; item menu tanpa halaman disembunyikan.
	const exists = routeIds(Object.keys(import.meta.glob('/src/routes/(app)/**/+page.svelte')));
	const menu = $derived(menuFor(me.role, exists));

	// shortcut: id route dari nav.ts berupa string, bukan literal RouteId; cast satu kali di sini.
	const href = (i: NavItem) => resolve(i.id as '/(app)/dashboard');
	const isActive = (i: NavItem) => (() => {
		const p = page.url.pathname;
		const h = href(i);
		return p === h || p.startsWith(h + '/');
	})();
	const current = $derived([...menu.groups.flatMap((g) => g.items), ...menu.more].find(isActive));

	const closePopover = (e: Event) =>
		(e.currentTarget as HTMLElement).closest<HTMLElement>('[popover]')?.hidePopover();

	$effect(() => {
		// untrack: banners.hide membaca state; tanpa ini efek memicu dirinya sendiri.
		const stops = untrack(() => [watchOnline(), startPolling()]);
		return () => stops.forEach((stop) => stop());
	});
	// Segera setelah navigasi (FR-NTF-4); 'enter' = muat awal, sudah ditangani startPolling.
	afterNavigate(({ type }) => type !== 'enter' && notifications.refresh());

	async function logout() {
		await api('/auth/logout', { method: 'POST' }).catch(() => {});
		await goto(resolve('/(auth)/login'));
	}
</script>

{#snippet link(i: NavItem, cls: string)}
	<a href={href(i)} class={cls} aria-current={isActive(i) ? 'page' : undefined} onclick={closePopover}>
		<i.icon class="size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
		{@render itemLabel(i)}
	</a>
{/snippet}

{#snippet itemLabel(i: NavItem)}<span>{i.label}</span>{/snippet}

<a
	href="#konten"
	class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-surface"
	>Lewati ke konten</a
>

<div class="min-h-dvh md:pl-16 lg:pl-60">
	<!-- Sidebar: ciut 64 px (720–1023), penuh 240 px (≥ 1024). shortcut: tanpa tombol ciut/overlay manual, tambahkan bila dibutuhkan. -->
	<aside class="fixed inset-y-0 left-0 z-20 hidden w-16 flex-col border-r border-border bg-surface md:flex lg:w-60">
		<a
			href={resolve('/(app)/dashboard')}
			aria-label="Acme ERP — ke Dashboard"
			class="flex h-14 items-center justify-center border-b border-border font-bold lg:justify-start lg:px-4"
		>
			<span class="text-brand-red">Acme</span><span class="ml-1 hidden lg:inline">ERP</span>
		</a>
		<nav aria-label="Menu utama" class="flex-1 py-2 lg:overflow-y-auto">
			{#each menu.groups as g (g.name)}
				<p class="hidden px-4 pt-3 pb-1 text-[0.8125rem] font-medium text-text-muted lg:block">{g.name}</p>
				<ul class="px-2">
					{#each g.items as i (i.id)}
						<li>
							<a
								href={href(i)}
								title={i.label}
								aria-current={isActive(i) ? 'page' : undefined}
								class="group relative flex h-10 items-center justify-center gap-3 rounded-md text-text transition-colors duration-150 hover:bg-row-hover motion-reduce:transition-none aria-[current=page]:bg-row-hover aria-[current=page]:font-semibold aria-[current=page]:before:absolute aria-[current=page]:before:inset-y-1 aria-[current=page]:before:-left-2 aria-[current=page]:before:w-[3px] aria-[current=page]:before:bg-brand-red lg:justify-start lg:px-3"
							>
								<i.icon class="size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
								<span class="sr-only lg:not-sr-only">{i.label}</span>
								<!-- Mode rail: label muncul saat hover/fokus keyboard (title saja tak terjangkau keyboard). -->
								<span
									aria-hidden="true"
									class="pointer-events-none absolute left-full z-30 ml-2 hidden rounded-md bg-ink px-2 py-1 text-[0.8125rem] whitespace-nowrap text-surface max-lg:group-hover:block max-lg:group-focus-visible:block"
									>{i.label}</span
								>
							</a>
						</li>
					{/each}
				</ul>
			{/each}
		</nav>
		<p class="hidden border-t border-border px-4 py-3 text-[0.8125rem] text-text-muted lg:block">
			v{__APP_VERSION__}
		</p>
	</aside>

	<div class="flex min-h-dvh flex-col">
		{#if __APP_ENV__ === 'staging'}
			<div class="bg-warning px-4 py-1 text-center text-[0.8125rem] font-semibold text-surface">
				STAGING — data uji
			</div>
		{/if}

		<header class="sticky top-0 z-10 flex h-[52px] items-center justify-between border-b border-border bg-surface px-4 md:h-14 md:px-6">
			<div class="min-w-0 truncate">
				<span class="font-bold md:hidden"><span class="text-brand-red">Acme</span> ERP</span>
				<span class="hidden font-semibold md:inline">{current?.label ?? 'Acme ERP'}</span>
			</div>
			<div class="flex items-center gap-1">
			<NotificationBell />
			<button
				type="button"
				popovertarget="menu-akun"
				aria-label="Menu akun {me.name}"
				class="flex h-11 items-center gap-2 rounded-md px-2 text-sm hover:bg-row-hover md:h-10"
			>
				<span class="max-w-32 truncate">{me.name}</span>
				<ChevronDown class="size-4" aria-hidden="true" />
			</button>
			</div>
			<div
				id="menu-akun"
				popover
				class="m-0 inset-auto top-14 right-2 w-60 rounded-lg border border-border bg-surface p-1 text-sm shadow-popover"
			>
				<div class="px-3 py-2">
					<p class="font-semibold">{me.name}</p>
					<p class="text-[0.8125rem] text-text-muted">{ROLE_LABEL[me.role]} · v{__APP_VERSION__}</p>
				</div>
				{#each menu.more.filter((i) => i.label === 'Akun Saya') as i (i.id)}
					{@render link(i, 'flex h-11 items-center gap-3 rounded-md px-3 hover:bg-row-hover')}
				{/each}
				<button type="button" onclick={logout} class="flex h-11 w-full items-center gap-3 rounded-md px-3 text-left hover:bg-row-hover">
					<LogOut class="size-5" strokeWidth={1.75} aria-hidden="true" /> Keluar
				</button>
			</div>
		</header>
		<Banners />

		<main id="konten" class="flex-1 p-4 md:p-6">
			{@render children()}
		</main>

		<footer class="px-4 pb-24 text-[0.8125rem] text-text-muted md:px-6 md:pb-4">
			Acme ERP v{__APP_VERSION__}
		</footer>
	</div>

	<Toaster />
	<ConfirmDialog />

	<!-- Bottom bar < 720 px; "Lainnya" = sheet bawah (popover native: Esc & klik luar menutup). -->
	<nav
		aria-label="Menu utama"
		class="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
	>
		{#each menu.bottom as i (i.id)}
			{@render link(
				i,
				'flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-t-[3px] border-transparent text-[0.6875rem] text-text-muted aria-[current=page]:border-brand-red aria-[current=page]:font-semibold aria-[current=page]:text-text'
			)}
		{/each}
		<button
			type="button"
			popovertarget="menu-lainnya"
			class="flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-t-[3px] border-transparent text-[0.6875rem] text-text-muted"
		>
			<Ellipsis class="size-5" strokeWidth={1.75} aria-hidden="true" /> Lainnya
		</button>
	</nav>
	<div
		id="menu-lainnya"
		role="group"
		aria-label="Menu lainnya"
		popover
		class="m-0 inset-auto bottom-0 left-0 max-h-[80dvh] w-full overflow-y-auto rounded-t-lg border border-border bg-surface p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-dialog backdrop:bg-ink/40"
	>
		<p class="px-3 py-2 text-[0.8125rem] font-medium text-text-muted">Lainnya</p>
		{#each menu.more as i (i.id)}
			{@render link(i, 'flex h-11 items-center gap-3 rounded-md px-3 hover:bg-row-hover aria-[current=page]:font-semibold')}
		{/each}
		<button type="button" onclick={logout} class="flex h-11 w-full items-center gap-3 rounded-md px-3 text-left hover:bg-row-hover">
			<LogOut class="size-5" strokeWidth={1.75} aria-hidden="true" /> Keluar
		</button>
		<p class="px-3 pt-2 text-[0.8125rem] text-text-muted">Acme ERP v{__APP_VERSION__}</p>
	</div>
</div>
