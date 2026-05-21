import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  sub,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "success" | "danger" | "warning" | "info" | "partner";
  sub?: ReactNode;
}) {
  const accent =
    tone === "success"
      ? "text-emerald-700"
      : tone === "danger"
        ? "text-rose-700"
        : tone === "warning"
          ? "text-amber-700"
          : tone === "info"
            ? "text-blue-700"
            : tone === "partner"
              ? "text-purple-700"
              : "text-gray-900";
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
        {hint && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-gray-300 hover:text-gray-500">
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{hint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${accent}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}
