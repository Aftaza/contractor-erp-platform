<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	// Varian mengikuti DESIGN.md §Buttons: tinggi 44 px di HP, 40 px mulai md.
	export const buttonVariants = tv({
		base: 'inline-flex h-11 md:h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0',
		variants: {
			variant: {
				primary: 'bg-ink text-surface hover:bg-ink-hover',
				secondary: 'border border-border-strong bg-surface text-text hover:bg-row-hover',
				danger: 'bg-danger text-surface hover:bg-danger/90'
			}
		},
		defaultVariants: { variant: 'primary' }
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
</script>

<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.ts';

	let {
		class: className,
		variant,
		type = 'button',
		children,
		ref = $bindable(),
		...rest
	}: HTMLButtonAttributes & { variant?: ButtonVariant; ref?: HTMLButtonElement } = $props();
</script>

<button bind:this={ref} {type} class={cn(buttonVariants({ variant }), className)} {...rest}>
	{@render children?.()}
</button>
