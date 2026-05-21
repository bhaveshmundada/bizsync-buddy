import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { formatINR } from "@/lib/format";

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  sub,
  index = 0,
  animateNumber,
  format = "inr",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "success" | "danger" | "warning" | "info" | "partner";
  sub?: ReactNode;
  index?: number;
  animateNumber?: number;
  format?: "inr" | "number" | "percent";
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

  const counted = useCountUp(typeof animateNumber === "number" ? animateNumber : 0, 400);
  const displayValue =
    typeof animateNumber === "number"
      ? format === "inr"
        ? formatINR(Math.round(counted))
        : format === "percent"
          ? `${counted.toFixed(1)}%`
          : Math.round(counted).toLocaleString("en-IN")
      : value;

  return (
    <div
      className="rx-fade-in rounded-xl border border-gray-100 bg-white p-5 transition-shadow hover:shadow-sm"
      style={{ animationDelay: `${index * 50}ms` }}
    >
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
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${accent}`}>{displayValue}</div>
      {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}
