import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { NoCompanyEmpty } from "@/components/NoCompanyEmpty";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { Money } from "@/components/Money";
import { useCompanyRecords } from "@/hooks/useCompanyRecords";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/health")({
  component: HealthPage,
});

type R = { amount: number; status?: string; billing_cycle?: string; monthly_cost?: number };

function HealthPage() {
  const { currentCompany, financialYear } = useCompany();
  const { data: income = [] } = useCompanyRecords<R>("income");
  const { data: expenses = [] } = useCompanyRecords<R>("expenses");
  const { data: recov = [] } = useCompanyRecords<R>("client_recoverables");
  const { data: invoices = [] } = useCompanyRecords<R>("invoices");
  const { data: tools = [] } = useCompanyRecords<R>("tools_subscriptions", { fyScoped: false });

  const m = useMemo(() => {
    const sum = (r: R[]) => r.reduce((s, x) => s + Number(x.amount ?? 0), 0);
    const totalIncome = sum(income);
    const totalExpenses = sum(expenses);
    const profit = totalIncome - totalExpenses;
    const margin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;
    const monthlyTools = tools.filter((t) => (t.status ?? "Active") === "Active").reduce((s, t) => {
      const c = Number(t.monthly_cost ?? 0);
      if (t.billing_cycle === "Annual") return s + c / 12;
      if (t.billing_cycle === "Quarterly") return s + c / 3;
      if (t.billing_cycle === "Lifetime") return s;
      return s + c;
    }, 0);
    const monthlyIncome = totalIncome / 12;
    const toolDrag = monthlyIncome > 0 ? (monthlyTools / monthlyIncome) * 100 : 0;
    const pendingInv = sum(invoices.filter((i) => i.status !== "Paid"));
    const pendingRecov = sum(recov.filter((r) => r.status === "Pending"));
    const cashLocked = pendingInv + pendingRecov;
    const cashLockedPct = totalIncome > 0 ? (cashLocked / totalIncome) * 100 : 0;
    return { totalIncome, totalExpenses, profit, margin, monthlyTools, toolDrag, pendingInv, pendingRecov, cashLocked, cashLockedPct };
  }, [income, expenses, recov, invoices, tools]);

  if (!currentCompany) return <NoCompanyEmpty />;

  const summary = `Health snapshot for ${currentCompany.name} (FY ${financialYear}):
- Total income: ${formatINR(m.totalIncome)}
- Total expenses: ${formatINR(m.totalExpenses)}
- Net profit: ${formatINR(m.profit)} (margin ${m.margin.toFixed(1)}%)
- Monthly tool spend: ${formatINR(m.monthlyTools)} (${m.toolDrag.toFixed(1)}% of monthly income)
- Cash locked in pending payments: ${formatINR(m.cashLocked)} (${m.cashLockedPct.toFixed(1)}% of income)

What should I focus on to improve profitability over the next quarter? Be specific to these numbers.`;

  const margTone = m.margin >= 30 ? "success" : m.margin >= 15 ? "warning" : "danger";
  const dragTone = m.toolDrag <= 5 ? "success" : m.toolDrag <= 15 ? "warning" : "danger";
  const lockTone = m.cashLockedPct <= 10 ? "success" : m.cashLockedPct <= 25 ? "warning" : "danger";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Health check"
        subtitle="Quick diagnosis of your business health"
        actions={
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(summary); toast.success("Copied — paste into ChatGPT/Claude for advice"); }}>
            <Copy className="mr-1 h-3.5 w-3.5" /> Copy AI advice prompt
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Profit margin" value={`${m.margin.toFixed(1)}%`} tone={margTone} hint="≥30% healthy · 15–30% ok · <15% concerning" />
        <MetricCard label="Net profit (FY)" value={<Money amount={m.profit} tone={m.profit >= 0 ? "success" : "danger"} />} tone={m.profit >= 0 ? "success" : "danger"} />
        <MetricCard label="Tool drag" value={`${m.toolDrag.toFixed(1)}%`} tone={dragTone} hint="Monthly tool cost as % of monthly income. ≤5% lean · >15% bloated" />
        <MetricCard label="Cash locked" value={`${m.cashLockedPct.toFixed(1)}%`} tone={lockTone} sub={<Money amount={m.cashLocked} />} hint="Pending invoices + client spend as % of income" />
        <MetricCard label="Total income (FY)" value={<Money amount={m.totalIncome} tone="success" />} tone="success" />
        <MetricCard label="Total expenses (FY)" value={<Money amount={m.totalExpenses} tone="danger" />} tone="danger" />
        <MetricCard label="Monthly tool spend" value={<Money amount={m.monthlyTools} />} tone="info" />
        <MetricCard label="Pending receivables" value={<Money amount={m.pendingInv + m.pendingRecov} tone="warning" />} tone="warning" />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">What this means</h3>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li>• {m.margin >= 30 ? "Healthy margin — keep pricing where it is." : m.margin >= 15 ? "Margin is workable but tight. Consider raising prices on your strongest service." : "Margin is dangerously thin. Cut tool subscriptions or raise rates urgently."}</li>
          <li>• {m.toolDrag <= 5 ? "Tool spend is lean." : m.toolDrag <= 15 ? "Tool spend is normal — audit annually." : "Tool spend is bloated. Cancel anything you haven't opened in 30 days."}</li>
          <li>• {m.cashLockedPct <= 10 ? "Cash flow looks clean." : m.cashLockedPct <= 25 ? "Some pending — chase overdue invoices weekly." : "Too much cash is stuck. Make collections your top weekly task."}</li>
        </ul>
      </div>
    </div>
  );
}
