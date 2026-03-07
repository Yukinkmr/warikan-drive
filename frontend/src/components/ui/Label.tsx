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
        "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted",
        className
      )}
    >
      {children}
    </div>
  );
}
