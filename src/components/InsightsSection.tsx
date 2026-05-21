import { Link } from "@tanstack/react-router";
import { AlertTriangle, TrendingDown, Wrench, Users, FileWarning, Scale, CheckCircle2, ArrowRight } from "lucide-react";
import { formatINR } from "@/lib/format";
import { FY_MONTHS } from "@/lib/months";

type Severity = "danger" | "warning" | "success";

export type Insight = {
  id: string;
  severity: Severity;
  icon: typeof AlertTriangle;
  title: string;
  action: string;
  href: string;
};

type Row = {
  id: string;
  amount: number;
  created_at: string;
  status?: string;
  client_name?: string;
  paid_by_name?: string;
  category?: string;
  month?: string;
  due_date?: string | null;
  billing_cycle?: string;
  monthly_cost?: number;
};

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function computeInsights(args: {
  income: Row[];
  expenses: Row[];
  recoverables: Row[];
  invoices: Row[];
  tools: Row[];
  isPartner: boolean;
}): Insight[] {
  const { income, expenses, recoverables, invoices, tools, isPartner } = args;
  const insights: Insight[] = [];

  const totalIncome = income.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, r) => s + Number(r.amount || 0), 0);
  const monthlyTools = tools.reduce((s, t) => {
    const c = Number(t.monthly_cost || 0);
    if (t.billing_cycle === "Annual") return s + c / 12;
    if (t.billing_cycle === "Quarterly") return s + c / 3;
    if (t.billing_cycle === "Lifetime") return s;
    return s + c;
  }, 0);

  // 1. SaaS > 15% of revenue (annualized)
  if (totalIncome > 0) {
    const toolDrag = (monthlyTools * 12) / totalIncome;
    if (toolDrag > 0.15) {
      insights.push({
        id: "tool-drag",
        severity: "danger",
        icon: Wrench,
        title: `Tool costs are ${(toolDrag * 100).toFixed(0)}% of revenue — eating into profit.`,
        action: "Review the Tools page",
        href: "/tools",
      });
    }
  }

  // 2. Stuck recoverables per client > ₹10k, 30+ days
  const byClient = new Map<string, { amount: number; oldest: number }>();
  for (const r of recoverables) {
    if (r.status !== "Pending") continue;
    const age = daysSince(r.created_at);
    if (age < 30) continue;
    const key = r.client_name || "Unknown";
    const existing = byClient.get(key) || { amount: 0, oldest: 0 };
    existing.amount += Number(r.amount || 0);
    existing.oldest = Math.max(existing.oldest, age);
    byClient.set(key, existing);
  }
  for (const [client, { amount, oldest }] of byClient) {
    if (amount >= 10000) {
      insights.push({
        id: `recov-${client}`,
        severity: "danger",
        icon: AlertTriangle,
        title: `${formatINR(amount)} stuck with ${client} for ${oldest}+ days. Time to follow up.`,
        action: "Open client spend",
        href: "/recoverables",
      });
    }
  }

  // 3. Overdue invoices > 30 days
  const now = Date.now();
  const overdueAmt = invoices.reduce((s, i) => {
    if (i.status === "Paid") return s;
    const due = i.due_date ? new Date(i.due_date).getTime() : null;
    if (due && now - due > 30 * 86400000) return s + Number(i.amount || 0);
    return s;
  }, 0);
  if (overdueAmt > 0) {
    insights.push({
      id: "overdue",
      severity: "danger",
      icon: FileWarning,
      title: `${formatINR(overdueAmt)} in invoices overdue 30+ days. Send reminders today.`,
      action: "Open invoices",
      href: "/invoices",
    });
  }

  // 4. Margin drop month-over-month (use last two months with any activity)
  const monthIdx = (m?: string) => (m ? FY_MONTHS.indexOf(m as (typeof FY_MONTHS)[number]) : -1);
  const monthly: { idx: number; inc: number; exp: number }[] = FY_MONTHS.map((m, idx) => ({
    idx,
    inc: income.filter((r) => r.month === m).reduce((s, r) => s + Number(r.amount || 0), 0),
    exp: expenses.filter((r) => r.month === m).reduce((s, r) => s + Number(r.amount || 0), 0),
  })).filter((x) => x.inc > 0 || x.exp > 0);
  if (monthly.length >= 2) {
    const last = monthly[monthly.length - 1];
    const prev = monthly[monthly.length - 2];
    const lastMargin = last.inc > 0 ? ((last.inc - last.exp) / last.inc) * 100 : 0;
    const prevMargin = prev.inc > 0 ? ((prev.inc - prev.exp) / prev.inc) * 100 : 0;
    if (prev.inc > 0 && last.inc > 0 && prevMargin - lastMargin >= 5) {
      insights.push({
        id: "margin-drop",
        severity: "warning",
        icon: TrendingDown,
        title: `Margin dropped from ${prevMargin.toFixed(0)}% (${FY_MONTHS[prev.idx]}) to ${lastMargin.toFixed(0)}% (${FY_MONTHS[last.idx]}). Check what changed.`,
        action: "Open P&L",
        href: "/pnl",
      });
    }
    void monthIdx;
  }

  // 5. Client concentration > 40%
  if (totalIncome > 0) {
    const clientTotals = new Map<string, number>();
    for (const r of income) {
      const k = r.client_name || "Unknown";
      clientTotals.set(k, (clientTotals.get(k) || 0) + Number(r.amount || 0));
    }
    for (const [client, amt] of clientTotals) {
      const pct = (amt / totalIncome) * 100;
      if (pct > 40) {
        insights.push({
          id: `concentration-${client}`,
          severity: "warning",
          icon: Users,
          title: `${client} is ${pct.toFixed(0)}% of your revenue. Consider diversifying.`,
          action: "Open income",
          href: "/income",
        });
      }
    }
  }

  // 6. Partner withdrawal imbalance (>20% gap)
  if (isPartner) {
    const withdrawals = expenses.filter(
      (e) => e.category === "Founder salary" || /withdraw/i.test(e.category || "") || /withdraw/i.test(e.paid_by_name || ""),
    );
    const byPerson = new Map<string, number>();
    for (const w of withdrawals) {
      const k = w.paid_by_name || "Unknown";
      byPerson.set(k, (byPerson.get(k) || 0) + Number(w.amount || 0));
    }
    const entries = Array.from(byPerson.entries()).sort((a, b) => b[1] - a[1]);
    if (entries.length >= 2) {
      const [top, second] = entries;
      const gap = top[1] - second[1];
      const base = Math.max(second[1], 1);
      if (gap / base > 0.2 && gap >= 10000) {
        insights.push({
          id: "withdrawal-gap",
          severity: "warning",
          icon: Scale,
          title: `Withdrawal imbalance: ${top[0]} has withdrawn ${formatINR(gap)} more than ${second[0]}.`,
          action: "Open expenses",
          href: "/expenses",
        });
      }
    }
  }

  // Sort: danger first, then warning
  insights.sort((a, b) => {
    const order = { danger: 0, warning: 1, success: 2 };
    return order[a.severity] - order[b.severity];
  });

  const top = insights.slice(0, 3);

  if (top.length === 0) {
    top.push({
      id: "all-good",
      severity: "success",
      icon: CheckCircle2,
      title: "All systems healthy. Keep it up! 💚",
      action: "Open health check",
      href: "/health",
    });
  }

  return top;
}

const toneClasses: Record<Severity, { wrap: string; icon: string; pill: string }> = {
  danger: {
    wrap: "border-rose-100 bg-rose-50/50",
    icon: "bg-rose-100 text-rose-700",
    pill: "text-rose-700 hover:text-rose-800",
  },
  warning: {
    wrap: "border-amber-100 bg-amber-50/50",
    icon: "bg-amber-100 text-amber-700",
    pill: "text-amber-700 hover:text-amber-800",
  },
  success: {
    wrap: "border-emerald-100 bg-emerald-50/50",
    icon: "bg-emerald-100 text-emerald-700",
    pill: "text-emerald-700 hover:text-emerald-800",
  },
};

export function InsightsSection(props: Parameters<typeof computeInsights>[0]) {
  const insights = computeInsights(props);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">Insights for you</h3>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {insights.map((ins, i) => {
          const t = toneClasses[ins.severity];
          const Icon = ins.icon;
          return (
            <div
              key={ins.id}
              className={`rx-fade-in flex gap-3 rounded-xl border p-4 ${t.wrap}`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t.icon}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug text-gray-900">{ins.title}</p>
                <Link
                  to={ins.href}
                  className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${t.pill}`}
                >
                  {ins.action}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
