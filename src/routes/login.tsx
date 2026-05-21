import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email to confirm, then sign in.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Don't navigate here — the useEffect above will redirect once
        // AuthContext propagates the new session, avoiding a race with
        // the _authenticated layout's auth check.
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <TrendingUp className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-xl font-semibold text-gray-900">RevenueX</h1>
          <p className="text-xs uppercase tracking-widest text-emerald-600">Financial Command Center</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium ${mode === "login" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium ${mode === "signup" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            >
              Sign up
            </button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <Label>Your name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Priya Sharma" required />
              </div>
            )}
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-gray-400">
          Multi-company financial management for agency founders
        </p>
      </div>
    </div>
  );
}
