import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading } = useAuth();
  const { loading: companiesLoading } = useCompany();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || (user && companiesLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden pb-16 lg:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}
