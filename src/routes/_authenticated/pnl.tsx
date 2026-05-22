import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { NoCompanyEmpty } from "@/components/NoCompanyEmpty";
import { PageHeader } from "@/components/PageHeader";
import { Money } from "@/components/Money";
import { useCompanyRecords } from "@/hooks/useCompanyRecords";
import { FY_MONTHS, type FyMonth } from "@/lib/months";

export const Route = createFileRoute("/_authenticated/pnl")({
  component: PnLPage,
});

type IncomeRow = { amount: number; month: string | null };
type ExpenseRow = { amount: number; month: string | null; paid_by_name?: string; category?: string | null };
type RecoverableRow = { amount: number; month: string | null; status: string };
type ToolRow = { monthly_cost: number; billing_cycle: string; status: string };

const TAX_RATE = 0.3;

function emptyMonthMap(): Record<string, number> {
  return FY_MONTHS.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as Record<string, number>);
}

function PnLPage() {
  const { currentCompany, financialYear } = useCompany();
  const { data: income = [] } = useCompanyRecords<IncomeRow>("income");
  const { data: expenses = [] } = useCompanyRecords<ExpenseRow>("expenses");
  const { data: recoverables = [] } = useCompanyRecords<RecoverableRow>("client_recoverables");
  const { data: tools = [] } = useCompanyRecords<ToolRow>("tools_subscriptions");

  const data = useMemo(() => {
    const incByMonth = emptyMonthMap();
    const expByMonth = emptyMonthMap();
    const expByCategoryMonth: Record<string, Record<string, number>> = {};
    const withdrawalsByMember: Record<string, Record<string, number>> = {};
    const writeOffsByMonth = emptyMonthMap();
    const members = new Set<string>();
    const categories = new Set<string>();

    income.forEach((r) => {
      const m = (r.month ?? "") as FyMonth;
      if (!FY_MONTHS.includes(m)) return;
      incByMonth[m] += Number(r.amount ?? 0);
    });

    expenses.forEach((r) => {
      const m = (r.month ?? "") as FyMonth;
      if (!FY_MONTHS.includes(m)) return;
      const amt = Number(r.amount ?? 0);
      expByMonth[m] += amt;
      const cat = r.category ?? "Uncategorized";
      categories.add(cat);
      expByCategoryMonth[cat] = expByCategoryMonth[cat] ?? emptyMonthMap();
      expByCategoryMonth[cat][m] += amt;
      const who = r.paid_by_name ?? "Business";
      members.add(who);
      withdrawalsByMember[who] = withdrawalsByMember[who] ?? emptyMonthMap();
      withdrawalsByMember[who][m] += amt;
    });

    recoverables.forEach((r) => {
      if (r.status !== "Written off") return;
      const m = (r.month ?? "") as FyMonth;
      if (!FY_MONTHS.includes(m)) return;
      writeOffsByMonth[m] += Number(r.amount ?? 0);
    });

    // SaaS monthly equivalent — repeat across all 12 months
    const saasMonthly = tools
      .filter((t) => t.status === "Active")
      .reduce((sum, t) => {
        const cost = Number(t.monthly_cost ?? 0);
        const cycle = t.billing_cycle;
        if (cycle === "Annual") return sum + cost / 12;
        if (cycle === "Quarterly") return sum + cost / 3;
        if (cycle === "Lifetime") return sum;
        return sum + cost;
      }, 0);
    const saasByMonth: Record<string, number> = FY_MONTHS.reduce(
      (acc, m) => ({ ...acc, [m]: saasMonthly }),
      {} as Record<string, number>,
    );

    const taxByMonth: Record<string, number> = {};
    const netByMonth: Record<string, number> = {};
    const marginByMonth: Record<string, number | null> = {};
    FY_MONTHS.forEach((m) => {
      taxByMonth[m] = (incByMonth[m] ?? 0) * TAX_RATE;
      netByMonth[m] =
        (incByMonth[m] ?? 0) -
        (expByMonth[m] ?? 0) -
        (saasByMonth[m] ?? 0) -
        (writeOffsByMonth[m] ?? 0) -
        (taxByMonth[m] ?? 0);
      marginByMonth[m] = incByMonth[m] > 0 ? (netByMonth[m] / incByMonth[m]) * 100 : null;
    });

    return {
      incByMonth,
      expByMonth,
      expByCategoryMonth,
      withdrawalsByMember,
      writeOffsByMonth,
      saasByMonth,
      taxByMonth,
      netByMonth,
      marginByMonth,
      members: [...members],
      categories: [...categories].sort(),
    };
  }, [income, expenses, recoverables, tools]);

  if (!currentCompany) return <NoCompanyEmpty />;

  const sum = (r: Record<string, number>) => FY_MONTHS.reduce((a, m) => a + (r[m] ?? 0), 0);
  const totalInc = sum(data.incByMonth);
  const totalExp = sum(data.expByMonth);
  const totalSaas = sum(data.saasByMonth);
  const totalWriteOffs = sum(data.writeOffsByMonth);
  const totalTax = sum(data.taxByMonth);
  const totalNet = totalInc - totalExp - totalSaas - totalWriteOffs - totalTax;
  const totalMargin = totalInc > 0 ? (totalNet / totalInc) * 100 : null;

  const stickyLeft = "sticky left-0 z-10";

  return (
    <div className="space-y-6">
      <PageHeader title="Monthly P&L" subtitle={`FY ${financialYear} · Full income statement`} />

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className={`${stickyLeft} bg-gray-50/50 px-4 py-3 text-left`}>Line</th>
              {FY_MONTHS.map((m) => (
                <th key={m} className="px-3 py-3 text-right">{m}</th>
              ))}
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {/* Income */}
            <tr className="border-b border-gray-50">
              <td className={`${stickyLeft} bg-white px-4 py-3 font-medium text-emerald-700`}>Income</td>
              {FY_MONTHS.map((m) => (
                <td key={m} className="px-3 py-3 text-right tabular-nums">
                  <Money amount={data.incByMonth[m]} tone="success" className="text-xs" />
                </td>
              ))}
              <td className="px-4 py-3 text-right"><Money amount={totalInc} tone="success" /></td>
            </tr>

            {/* Expenses */}
            <tr className="border-b border-gray-50">
              <td className={`${stickyLeft} bg-white px-4 py-3 font-medium text-rose-700`}>Expenses</td>
              {FY_MONTHS.map((m) => (
                <td key={m} className="px-3 py-3 text-right tabular-nums">
                  <Money amount={data.expByMonth[m]} tone="danger" className="text-xs" />
                </td>
              ))}
              <td className="px-4 py-3 text-right"><Money amount={totalExp} tone="danger" /></td>
            </tr>

            {/* Expense categories */}
            {data.categories.map((cat) => {
              const row = data.expByCategoryMonth[cat];
              const rowTotal = sum(row);
              return (
                <tr key={cat} className="border-b border-gray-50 bg-rose-50/20">
                  <td className={`${stickyLeft} bg-rose-50/20 px-4 py-2 pl-8 text-xs text-rose-700`}>↳ {cat}</td>
                  {FY_MONTHS.map((m) => (
                    <td key={m} className="px-3 py-2 text-right text-xs tabular-nums text-rose-700">
                      {row[m] ? (
                        <Money amount={row[m]} className="text-rose-700 text-[11px]" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right text-xs">
                    <Money amount={rowTotal} className="text-rose-700 text-[11px]" />
                  </td>
                </tr>
              );
            })}

            {/* Withdrawals by member */}
            {data.members.map((member) => {
              const row = data.withdrawalsByMember[member];
              return (
                <tr key={member} className="border-b border-gray-50 bg-purple-50/30">
                  <td className={`${stickyLeft} bg-purple-50/30 px-4 py-2 pl-8 text-xs text-purple-700`}>
                    ↳ Paid by {member}
                  </td>
                  {FY_MONTHS.map((m) => (
                    <td key={m} className="px-3 py-2 text-right text-xs tabular-nums text-purple-700">
                      {row[m] ? (
                        <Money amount={row[m]} className="text-purple-700 text-[11px]" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right text-xs">
                    <Money amount={sum(row)} className="text-purple-700 text-[11px]" />
                  </td>
                </tr>
              );
            })}

            {/* SaaS / Tool costs */}
            <tr className="border-b border-gray-50">
              <td className={`${stickyLeft} bg-white px-4 py-3 font-medium text-amber-700`}>SaaS / Tool costs</td>
              {FY_MONTHS.map((m) => (
                <td key={m} className="px-3 py-3 text-right tabular-nums">
                  <Money amount={data.saasByMonth[m]} tone="warning" className="text-xs" />
                </td>
              ))}
              <td className="px-4 py-3 text-right"><Money amount={totalSaas} tone="warning" /></td>
            </tr>

            {/* Client write-offs */}
            <tr className="border-b border-gray-50">
              <td className={`${stickyLeft} bg-white px-4 py-3 font-medium text-rose-700`}>Client write-offs</td>
              {FY_MONTHS.map((m) => (
                <td key={m} className="px-3 py-3 text-right tabular-nums">
                  {data.writeOffsByMonth[m] ? (
                    <Money amount={data.writeOffsByMonth[m]} tone="danger" className="text-xs" />
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              ))}
              <td className="px-4 py-3 text-right"><Money amount={totalWriteOffs} tone="danger" /></td>
            </tr>

            {/* Tax provision */}
            <tr className="border-b border-gray-50">
              <td className={`${stickyLeft} bg-white px-4 py-3 font-medium text-gray-700`}>
                Tax provision <span className="text-xs text-gray-400">(est 30%)</span>
              </td>
              {FY_MONTHS.map((m) => (
                <td key={m} className="px-3 py-3 text-right tabular-nums">
                  <Money amount={data.taxByMonth[m]} tone="muted" className="text-xs" />
                </td>
              ))}
              <td className="px-4 py-3 text-right"><Money amount={totalTax} tone="muted" /></td>
            </tr>

            {/* Net profit */}
            <tr className="bg-gray-50/50 font-semibold">
              <td className={`${stickyLeft} bg-gray-50/50 px-4 py-3`}>Net profit</td>
              {FY_MONTHS.map((m) => {
                const net = data.netByMonth[m];
                return (
                  <td key={m} className="px-3 py-3 text-right tabular-nums">
                    <Money amount={net} tone={net >= 0 ? "success" : "danger"} className="text-xs" />
                  </td>
                );
              })}
              <td className="px-4 py-3 text-right">
                <Money amount={totalNet} tone={totalNet >= 0 ? "success" : "danger"} />
              </td>
            </tr>

            {/* Margin */}
            <tr className="bg-gray-50/50">
              <td className={`${stickyLeft} bg-gray-50/50 px-4 py-3 text-sm text-gray-600`}>Profit margin %</td>
              {FY_MONTHS.map((m) => {
                const margin = data.marginByMonth[m];
                return (
                  <td key={m} className="px-3 py-3 text-right text-xs tabular-nums">
                    {margin === null ? (
                      <span className="text-gray-300">—</span>
                    ) : (
                      <span className={margin >= 0 ? "text-emerald-700 font-medium" : "text-rose-700 font-medium"}>
                        {margin.toFixed(1)}%
                      </span>
                    )}
                  </td>
                );
              })}
              <td className="px-4 py-3 text-right text-sm">
                {totalMargin === null ? (
                  <span className="text-gray-400">—</span>
                ) : (
                  <span className={totalMargin >= 0 ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}>
                    {totalMargin.toFixed(1)}%
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
