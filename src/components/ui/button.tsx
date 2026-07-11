import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

type Variant = "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
type Size = "default" | "sm" | "lg" | "icon";

function classes(variant: Variant = "default", size: Size = "default", extra?: string) {
  const v: Record<Variant, string> = {
    default: "",
    outline: "nb-btn--outline",
    ghost: "nb-btn--ghost",
    destructive: "nb-btn--danger",
    secondary: "nb-btn--outline",
    link: "nb-btn--ghost",
  };
  const s: Record<Size, string> = {
    default: "",
    sm: "nb-btn--sm",
    lg: "",
    icon: "nb-btn--icon",
  };
  return ["nb-btn", v[variant], s[size], extra].filter(Boolean).join(" ");
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={classes(variant, size, className)} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

// Compatibility shim for other shadcn files that import buttonVariants.
function buttonVariants(opts?: { variant?: Variant; size?: Size; className?: string }) {
  return classes(opts?.variant, opts?.size, opts?.className);
}

export { Button, buttonVariants };
