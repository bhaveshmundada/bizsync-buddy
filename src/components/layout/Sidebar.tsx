import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  IndianRupee,
  Receipt,
  ArrowLeftRight,
  FileText,
  Wrench,
  TrendingUp,
  HeartPulse,
  Settings,
  LogOut,
} from "lucide-react";
import { CompanySwitcher } from "./CompanySwitcher";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FINANCIAL_YEARS } from "@/lib/months";
import { MemberAvatar } from "@/components/MemberAvatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/income", label: "Income", icon: IndianRupee },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/recoverables", label: "Client spend", icon: ArrowLeftRight },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/tools", label: "Tools & SaaS", icon: Wrench },
  { to: "/pnl", label: "Monthly P&L", icon: TrendingUp },
  { to: "/health", label: "Health check", icon: HeartPulse },
] as const;

export function Sidebar() {
  const { currentCompany, financialYear, setFinancialYear } = useCompany();
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [signingOut, setSigningOut] = useState(false);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-100 bg-white lg:flex">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">RevenueX</div>
          <div className="text-[10px] uppercase tracking-wide text-gray-400">Command Center</div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-3 py-3">
        <CompanySwitcher />
        {currentCompany && (
          <div className="mt-2">
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-gray-400">Financial year</label>
            <Select value={financialYear} onValueChange={(v) => setFinancialYear(v as typeof FINANCIAL_YEARS[number])}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINANCIAL_YEARS.map((fy) => (
                  <SelectItem key={fy} value={fy} className="text-xs">FY {fy}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? path === item.to : path === item.to || path.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-emerald-50 font-medium text-emerald-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 p-2">
        <Link
          to="/settings"
          className={`mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            path.startsWith("/settings")
              ? "bg-emerald-50 font-medium text-emerald-700"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50">
            <MemberAvatar name={currentCompany?.display_name || user?.email || "You"} size="md" showName={false} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-gray-900">{currentCompany?.display_name || "You"}</div>
              <div className="truncate text-[10px] text-gray-400">{user?.email}</div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            <DropdownMenuItem
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
