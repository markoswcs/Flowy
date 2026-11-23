import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium transition-[transform,colors,box-shadow] duration-200 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // The Flowy purple, solid, with a soft glow.
        default:
          "bg-primary text-primary-foreground shadow-[0_8px_20px_-10px] shadow-primary/70 hover:bg-primary/90",
        secondary:
          "bg-primary/15 text-foreground hover:bg-primary/25",
        outline:
          "border border-primary/35 bg-primary/[0.06] text-foreground hover:border-primary/60 hover:bg-primary/15",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "h-auto min-h-0 px-0 flowy-ink underline-offset-4 hover:underline",
      },
      size: {
        sm: "min-h-9 px-3 text-xs",
        default: "min-h-10 px-4",
        lg: "min-h-11 px-5",
        icon: "size-10 shrink-0 px-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, loading = false, disabled, children, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
