import * as React from "react";

type Variant = "default" | "secondary" | "destructive" | "outline" | "open" | "closed";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const map: Record<Variant, string> = {
    default: "",
    secondary: "nb-badge--secondary",
    destructive: "nb-badge--closed",
    outline: "nb-badge--secondary",
    open: "nb-badge--open",
    closed: "nb-badge--closed",
  };
  return (
    <div
      className={["nb-badge", map[variant], className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export { Badge };
