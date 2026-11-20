<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Dashboard — Acme ERP</title></svelte:head>

<h1 class="text-2xl font-bold tracking-tight">Dashboard</h1>
<p class="mt-2 text-text-muted">Masuk sebagai {data.me.name} ({data.me.role}). Halaman akan dimigrasikan dari ERP Next.js.</p>
