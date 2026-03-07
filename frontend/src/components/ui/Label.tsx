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
        "mb-1.5 block text-sm font-medium text-label",
        className
      )}
    >
      {children}
    </div>
  );
}
