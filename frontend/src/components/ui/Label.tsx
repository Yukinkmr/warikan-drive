import { cn } from "@/lib/utils";

export function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5",
        className
      )}
    >
      {children}
    </div>
  );
}
