import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-border bg-card p-4",
        "shadow-[var(--tw-shadow)]",
        className
      )}
      style={{
        boxShadow:
          "var(--card) === #ffffff"
            ? "0 1px 4px rgba(0,0,0,0.07)"
            : "none",
      }}
      {...props}
    >
      {children}
    </div>
  );
}
