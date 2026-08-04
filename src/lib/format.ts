/** Money is kobo everywhere; only the view divides by 100. */
export function naira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function nairaExact(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function shortDate(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return shortDate(date);
}

type Tone = "success" | "warning" | "danger" | "neutral";

export function statusTone(status: string): Tone {
  switch (status) {
    case "paid":
    case "settled":
    case "completed":
    case "tier1":
      return "success";
    case "pending":
    case "processing":
    case "partial":
      return "warning";
    case "failed":
    case "expired":
    case "refunded":
      return "danger";
    default:
      return "neutral";
  }
}

export const TONE_CLASS: Record<Tone, string> = {
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/12 text-warning border-warning/25",
  danger: "bg-destructive/12 text-destructive border-destructive/25",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
