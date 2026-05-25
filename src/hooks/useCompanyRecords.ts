import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

type TableName = "income" | "expenses" | "client_recoverables" | "invoices" | "tools_subscriptions" | "company_activity" | "company_members";

export function useCompanyRecords<T = Record<string, unknown>>(table: TableName, opts: { fyScoped?: boolean; orderBy?: string; ascending?: boolean } = {}) {
  const { currentCompany, financialYear } = useCompany();
  const { fyScoped = true, orderBy = "created_at", ascending = false } = opts;

  return useQuery({
    queryKey: [table, currentCompany?.id, fyScoped ? financialYear : null],
    enabled: !!currentCompany,
    queryFn: async (): Promise<T[]> => {
      const selectCols = table === "company_members" ? "user_id, display_name, role, id, joined_at" : "*";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase.from(table).select(selectCols).eq("company_id", currentCompany!.id);
      if (fyScoped && table !== "company_activity" && table !== "company_members" && table !== "tools_subscriptions") {
        q = q.eq("financial_year", financialYear);
      }
      q = q.order(orderBy, { ascending });
      const { data, error } = await q;
      console.log(`[useCompanyRecords] ${table}`, { company: currentCompany?.id, count: data?.length, error });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}
