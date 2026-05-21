import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { currentFY, FINANCIAL_YEARS, type FinancialYear } from "@/lib/months";

export type CompanyRole = "owner" | "admin" | "editor" | "viewer";

export interface CompanyWithRole {
  id: string;
  name: string;
  financial_year: string;
  currency: string;
  created_by: string;
  created_at: string;
  role: CompanyRole;
  display_name: string;
}

interface CompanyContextValue {
  companies: CompanyWithRole[];
  currentCompany: CompanyWithRole | null;
  currentUserRole: CompanyRole | null;
  switchCompany: (id: string) => void;
  refreshCompanies: () => void;
  financialYear: FinancialYear;
  setFinancialYear: (fy: FinancialYear) => void;
  loading: boolean;
  canEdit: boolean;
  canManage: boolean;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

const LS_COMPANY_KEY = "revx:current_company";
const LS_FY_KEY = "revx:current_fy";

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [currentId, setCurrentId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(LS_COMPANY_KEY) : null,
  );
  const [financialYear, setFinancialYearState] = useState<FinancialYear>(() => {
    if (typeof window === "undefined") return currentFY();
    const stored = localStorage.getItem(LS_FY_KEY);
    return (FINANCIAL_YEARS as readonly string[]).includes(stored ?? "")
      ? (stored as FinancialYear)
      : currentFY();
  });

  const { data: companies = [], isLoading, refetch } = useQuery({
    queryKey: ["companies", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CompanyWithRole[]> => {
      const { data, error } = await supabase
        .from("company_members")
        .select("role, display_name, companies(id, name, financial_year, currency, created_by, created_at)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? [])
        .filter((m) => m.companies)
        .map((m) => ({
          ...(m.companies as NonNullable<typeof m.companies>),
          role: m.role as CompanyRole,
          display_name: m.display_name,
        }));
    },
  });

  // Pick a sensible default current company
  useEffect(() => {
    if (!companies.length) return;
    if (!currentId || !companies.find((c) => c.id === currentId)) {
      setCurrentId(companies[0].id);
    }
  }, [companies, currentId]);

  useEffect(() => {
    if (currentId) localStorage.setItem(LS_COMPANY_KEY, currentId);
  }, [currentId]);

  useEffect(() => {
    localStorage.setItem(LS_FY_KEY, financialYear);
  }, [financialYear]);

  const currentCompany = useMemo(
    () => companies.find((c) => c.id === currentId) ?? null,
    [companies, currentId],
  );

  const switchCompany = (id: string) => {
    setCurrentId(id);
    // Invalidate all data queries so they refetch with new company
    qc.invalidateQueries();
  };

  const setFinancialYear = (fy: FinancialYear) => {
    setFinancialYearState(fy);
    qc.invalidateQueries();
  };

  const role = currentCompany?.role ?? null;
  const canEdit = role === "owner" || role === "admin" || role === "editor";
  const canManage = role === "owner" || role === "admin";

  return (
    <CompanyContext.Provider
      value={{
        companies,
        currentCompany,
        currentUserRole: role,
        switchCompany,
        refreshCompanies: () => refetch(),
        financialYear,
        setFinancialYear,
        loading: isLoading,
        canEdit,
        canManage,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used inside CompanyProvider");
  return ctx;
}
