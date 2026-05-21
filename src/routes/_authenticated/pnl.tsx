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

type AmountRow = { amount: number; month: string | null; paid_by_name?: string };

function PnLPage() {
  const { currentCompany, financialYear } = useCompany();
  const { data: income = [] } = useCompanyRecords<AmountRow>("income");
  const { data: expenses = [] } = useCompanyRecords<AmountRow & { paid_by_name: string }>("expenses");

  const rows = useMemo(() => {
    const incByMonth: Record<string, number> = {};
    const expByMonth: Record<string, number> = {};
    const withdrawalsByMember: Record<string, Record<string, number>> = {};
    const members = new Set<string>();

    income.forEach((r) => {
      const m = (r.month ?? "") as FyMonth;
      if (!FY_MONTHS.includes(m)) return;
      incByMonth[m] = (incByMonth[m] ?? 0) + Number(r.amount ?? 0);
    });
    expenses.forEach((r) => {
      const m = (r.month ?? "") as FyMonth;
      if (!FY_MONTHS.includes(m)) return;
      expByMonth[m] = (expByMonth[m] ?? 0) + Number(r.amount ?? 0);
      const who = r.paid_by_name ?? "Business";
      members.add(who);
      withdrawalsByMember[who] = withdrawalsByMember[who] ?? {};
      withdrawalsByMember[who][m] = (withdrawalsByMember[who][m] ?? 0) + Number(r.amount ?? 0);
    });

    return { incByMonth, expByMonth, withdrawalsByMember, members: [...members] };
  }, [income, expenses]);

  if (!currentCompany) return <NoCompanyEmpty />;

  const totalInc = Object.values(rows.incByMonth).reduce((a, b) => a + b, 0);
  const totalExp = Object.values(rows.expByMonth).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Monthly P&L" subtitle={`FY ${financialYear} · Income vs expenses by month`} />

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50/50 px-4 py-3 text-left">Line</th>
              {FY_MONTHS.map((m) => <th key={m} className="px-3 py-3 text-right">{m}</th>)}
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-50">
              <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-emerald-700">Income</td>
              {FY_MONTHS.map((m) => <td key={m} className="px-3 py-3 text-right tabular-nums"><Money amount={rows.incByMonth[m] ?? 0} tone="success" className="text-xs" /></td>)}
              <td className="px-4 py-3 text-right"><Money amount={totalInc} tone="success" /></td>
            </tr>
            <tr className="border-b border-gray-50">
              <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-rose-700">Expenses</td>
              {FY_MONTHS.map((m) => <td key={m} className="px-3 py-3 text-right tabular-nums"><Money amount={rows.expByMonth[m] ?? 0} tone="danger" className="text-xs" /></td>)}
              <td className="px-4 py-3 text-right"><Money amount={totalExp} tone="danger" /></td>
            </tr>
            {rows.members.map((member) => (
              <tr key={member} className="border-b border-gray-50 bg-purple-50/30">
                <td className="sticky left-0 z-10 bg-purple-50/30 px-4 py-2 pl-8 text-xs text-purple-700">↳ Paid by {member}</td>
                {FY_MONTHS.map((m) => <td key={m} className="px-3 py-2 text-right text-xs tabular-nums text-purple-700">{rows.withdrawalsByMember[member]?.[m] ? <Money amount={rows.withdrawalsByMember[member][m]} className="text-purple-700 text-[11px]" /> : <span className="text-gray-300">—</span>}</td>)}
                <td className="px-4 py-2 text-right text-xs"><Money amount={Object.values(rows.withdrawalsByMember[member]).reduce((a, b) => a + b, 0)} className="text-purple-700 text-[11px]" /></td>
              </tr>
            ))}
            <tr className="bg-gray-50/50 font-semibold">
              <td className="sticky left-0 z-10 bg-gray-50/50 px-4 py-3">Net profit</td>
              {FY_MONTHS.map((m) => {
                const net = (rows.incByMonth[m] ?? 0) - (rows.expByMonth[m] ?? 0);
                return <td key={m} className="px-3 py-3 text-right tabular-nums"><Money amount={net} tone={net >= 0 ? "success" : "danger"} className="text-xs" /></td>;
              })}
              <td className="px-4 py-3 text-right"><Money amount={totalInc - totalExp} tone={totalInc - totalExp >= 0 ? "success" : "danger"} /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
