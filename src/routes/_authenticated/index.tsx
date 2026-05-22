import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { NoCompanyEmpty } from "@/components/NoCompanyEmpty";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { Money } from "@/components/Money";
import { useCompanyRecords } from "@/hooks/useCompanyRecords";
import { MemberAvatar } from "@/components/MemberAvatar";
import { relativeTime, formatINRCompact } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { InsightsSection } from "@/components/InsightsSection";
import { FY_MONTHS, type FyMonth } from "@/lib/months";
import { Activity, TrendingUp } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/")({
  component: OverviewPage,
});

type Row = { id: string; amount: number; created_at: string; added_by: string; month?: string | null; status?: string; paid_by_name?: string; description?: string; client_name?: string; tool_name?: string; monthly_cost?: number; billing_cycle?: string };

function OverviewPage() {
  const { currentCompany, financialYear, companies } = useCompany();
  const { data: income = [] } = useCompanyRecords<Row>("income");
  const { data: expenses = [] } = useCompanyRecords<Row>("expenses");
  const { data: recoverables = [] } = useCompanyRecords<Row>("client_recoverables");
  const { data: invoices = [] } = useCompanyRecords<Row>("invoices");
  const { data: tools = [] } = useCompanyRecords<Row>("tools_subscriptions");
  const { data: members = [] } = useCompanyRecords<{ user_id: string; display_name: string }>("company_members", { fyScoped: false });

  const totals = useMemo(() => {
    const sum = (rows: Row[]) => rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const totalIncome = sum(income);
    const totalExpenses = sum(expenses);
    const pendingRecov = sum(recoverables.filter((r) => r.status === "Pending"));
    const pendingInvoices = sum(invoices.filter((i) => i.status === "Pending" || i.status === "Overdue" || i.status === "Partial"));
    const monthlyTools = tools.reduce((s, t) => {
      const c = Number(t.monthly_cost ?? 0);
      if (t.billing_cycle === "Annual") return s + c / 12;
      if (t.billing_cycle === "Quarterly") return s + c / 3;
      return s + c;
    }, 0);
    return { totalIncome, totalExpenses, profit: totalIncome - totalExpenses, pendingRecov, pendingInvoices, monthlyTools };
  }, [income, expenses, recoverables, invoices, tools]);

  const chartData = useMemo(() => {
    const incByMonth: Record<string, number> = {};
    const expByMonth: Record<string, number> = {};
    FY_MONTHS.forEach((m) => { incByMonth[m] = 0; expByMonth[m] = 0; });
    income.forEach((r) => {
      const m = r.month as FyMonth;
      if (m && FY_MONTHS.includes(m)) incByMonth[m] += Number(r.amount ?? 0);
    });
    expenses.forEach((r) => {
      const m = r.month as FyMonth;
      if (m && FY_MONTHS.includes(m)) expByMonth[m] += Number(r.amount ?? 0);
    });
    return FY_MONTHS.map((m) => ({
      month: m,
      Revenue: incByMonth[m],
      Expenses: expByMonth[m],
      "Net profit": incByMonth[m] - expByMonth[m],
    }));
  }, [income, expenses]);

  if (!currentCompany) return <NoCompanyEmpty />;

  const memberMap = new Map(members.map((m) => [m.user_id, m.display_name]));
  type Feed = { id: string; kind: string; amount: number; who: string; when: string; what: string };
  const feed: Feed[] = [
    ...income.map((r) => ({ id: r.id, kind: "income", amount: Number(r.amount), who: memberMap.get(r.added_by) ?? "Someone", when: r.created_at, what: r.client_name ?? "Income" })),
    ...expenses.map((r) => ({ id: r.id, kind: "expense", amount: Number(r.amount), who: memberMap.get(r.added_by) ?? "Someone", when: r.created_at, what: r.description ?? "Expense" })),
  ]
    .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
    .slice(0, 8);

  const isPartner = companies.find((c) => c.id === currentCompany.id) && members.length > 1;

  return (
    <div className="space-y-6">
      <PageHeader title={`${currentCompany.name}`} subtitle={`FY ${financialYear} · Overview`} />

      <InsightsSection
        income={income}
        expenses={expenses}
        recoverables={recoverables}
        invoices={invoices}
        tools={tools}
        isPartner={!!isPartner}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total income" value={<Money amount={totals.totalIncome} tone="success" />} tone="success" hint="Money received in this FY" />
        <MetricCard label="Total expenses" value={<Money amount={totals.totalExpenses} tone="danger" />} tone="danger" hint="All expenses recorded in this FY" />
        <MetricCard label="Net profit" value={<Money amount={totals.profit} tone={totals.profit >= 0 ? "success" : "danger"} />} tone={totals.profit >= 0 ? "success" : "danger"} hint="Income minus expenses" />
        <MetricCard label="Pending receivables" value={<Money amount={totals.pendingInvoices + totals.pendingRecov} tone="warning" />} tone="warning" hint="Invoices + client spend awaiting payment" />
      </div>

      {/* Monthly trend chart */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-gray-900">Monthly trend</h3>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => formatINRCompact(v)}
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatINRCompact(value), name]}
              contentStyle={{ borderRadius: 8, border: "1px solid #f3f4f6", fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="Revenue" fill="#a7f3d0" radius={[4, 4, 0, 0]} barSize={20} />
            <Bar dataKey="Expenses" fill="#fecdd3" radius={[4, 4, 0, 0]} barSize={20} />
            <Line
              type="monotone"
              dataKey="Net profit"
              stroke="#059669"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 3, fill: "#059669" }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900">Quick snapshot</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-gray-400">Monthly tool spend</div>
              <div className="mt-1 font-semibold tabular-nums text-gray-900"><Money amount={totals.monthlyTools} /></div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-gray-400">Invoices outstanding</div>
              <div className="mt-1 font-semibold tabular-nums text-gray-900">{invoices.filter((i) => i.status !== "Paid").length}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-gray-400">Client spend pending</div>
              <div className="mt-1 font-semibold tabular-nums text-gray-900"><Money amount={totals.pendingRecov} /></div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-gray-400">Profit margin</div>
              <div className="mt-1 font-semibold tabular-nums text-gray-900">
                {totals.totalIncome > 0 ? `${((totals.profit / totals.totalIncome) * 100).toFixed(0)}%` : "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-900">{isPartner ? "Team activity" : "Recent activity"}</h3>
          </div>
          {feed.length === 0 ? (
            <EmptyState title="No activity yet" description="Add income or expenses to get started." />
          ) : (
            <ul className="space-y-3 text-xs">
              {feed.map((f) => (
                <li key={f.id} className="flex items-start gap-2">
                  <MemberAvatar name={f.who} size="xs" showName={false} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-gray-700">
                      <span className="font-medium">{f.who}</span>{" "}
                      <span className="text-gray-500">added {f.kind}</span>{" "}
                      <span className="font-medium text-gray-900">· {f.what}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <Money amount={f.amount} tone={f.kind === "income" ? "success" : "danger"} className="text-[11px]" />
                      <span>· {relativeTime(f.when)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
