import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "card rounded-[14px] border border-border bg-card p-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
