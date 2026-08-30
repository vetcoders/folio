import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-[var(--radius-sm)] bg-surface-2 px-3 text-sm text-fg placeholder:text-subtle",
          "shadow-[var(--shadow-border)] outline-none transition-[box-shadow] duration-150",
          "focus-visible:shadow-[0_0_0_1px_var(--color-focus)]",
          className,
        )}
        {...props}
      />
    );
  },
);
