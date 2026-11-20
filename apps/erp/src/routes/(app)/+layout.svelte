<script lang="ts">
	import AppShell from '#lib/components/layout/AppShell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<AppShell me={data.me} {children} />
