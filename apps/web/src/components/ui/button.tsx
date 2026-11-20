import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Varian sesuai DESIGN.md: primary = merah brand, secondary = putih + border ink; tinggi 48 px, sudut 2 px.
const buttonVariants = cva(
  "inline-flex h-12 items-center justify-center gap-2 rounded-sm px-6 text-base font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-brand-red-deep",
        secondary: "border-[1.5px] border-ink bg-white text-ink hover:bg-concrete",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Button({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant }), className)} {...props} />;
}

export { Button, buttonVariants };
