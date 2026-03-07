import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "card rounded-2xl border border-border bg-card p-4 transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
