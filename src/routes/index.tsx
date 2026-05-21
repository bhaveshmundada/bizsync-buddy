import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const { user, loading } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-white px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-4xl font-bold text-gray-900">RevenueX</h1>
        <p className="mt-2 text-sm uppercase tracking-widest text-emerald-600">
          Financial Command Center
        </p>
        <p className="mt-6 text-base text-gray-600">
          Multi-company financial management for agency founders. Build in progress —
          auth, onboarding, and dashboard pages are being wired up next.
        </p>
        <p className="mt-6 text-xs text-gray-400">
          {loading ? "Checking session…" : user ? `Signed in as ${user.email}` : "Not signed in"}
        </p>
      </div>
    </div>
  );
}
