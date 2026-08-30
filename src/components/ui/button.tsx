import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[opacity,transform,background-color,color,box-shadow] duration-150 ease-out disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:not-disabled:scale-[0.96]",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-fg hover:opacity-90",
        ghost: "text-muted hover:bg-surface-2 hover:text-fg",
        outline: "shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)] text-fg",
        danger: "text-danger hover:bg-danger/10",
        solid: "bg-surface-2 text-fg hover:bg-border",
      },
      size: {
        default: "h-10 rounded-[var(--radius-sm)] px-3.5 text-sm",
        sm: "h-8 rounded-[var(--radius-xs)] px-2.5 text-[13px]",
        icon: "size-10 rounded-[var(--radius-sm)]",
        iconSm: "size-8 rounded-[var(--radius-xs)]",
      },
    },
    defaultVariants: { variant: "ghost", size: "default" },
  },
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, type = "button", ...props }: Props) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
