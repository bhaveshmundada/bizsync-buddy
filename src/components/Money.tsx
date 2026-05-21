import { formatINR } from "@/lib/format";

export function Money({
  amount,
  className = "",
  tone,
}: {
  amount: number | string | null | undefined;
  className?: string;
  tone?: "success" | "danger" | "warning" | "muted" | "default";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "danger"
        ? "text-rose-700"
        : tone === "warning"
          ? "text-amber-700"
          : tone === "muted"
            ? "text-gray-500"
            : "text-gray-900";
  return <span className={`font-semibold tabular-nums ${toneClass} ${className}`}>{formatINR(amount)}</span>;
}
