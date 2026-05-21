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
      let q = supabase.from(table).select("*").eq("company_id", currentCompany!.id);
      if (fyScoped && table !== "company_activity" && table !== "company_members" && table !== "tools_subscriptions") {
        q = q.eq("financial_year", financialYear);
      }
      q = q.order(orderBy, { ascending });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}
