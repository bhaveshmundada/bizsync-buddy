import { Lightbulb, AlertTriangle, Info, Wrench } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "emerald" | "rose" | "amber" | "blue" | "purple";

const TONE: Record<Tone, { bg: string; border: string; icon: string; Icon: typeof Lightbulb }> = {
  emerald: { bg: "bg-emerald-50", border: "border-emerald-600", icon: "text-emerald-700", Icon: Lightbulb },
  rose: { bg: "bg-rose-50", border: "border-rose-600", icon: "text-rose-700", Icon: AlertTriangle },
  amber: { bg: "bg-amber-50", border: "border-amber-600", icon: "text-amber-700", Icon: AlertTriangle },
  blue: { bg: "bg-blue-50", border: "border-blue-600", icon: "text-blue-700", Icon: Info },
  purple: { bg: "bg-purple-50", border: "border-purple-600", icon: "text-purple-700", Icon: Wrench },
};

export function HintBox({ tone = "emerald", children }: { tone?: Tone; children: ReactNode }) {
  const t = TONE[tone];
  return (
    <div className={`flex gap-3 rounded-xl border-l-4 ${t.border} ${t.bg} px-4 py-3 text-sm text-gray-700`}>
      <t.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${t.icon}`} />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
