import { statusTone, TONE_CLASS, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[statusTone(status)],
        className,
      )}
    >
      {titleCase(status)}
    </span>
  );
}
