import { Building2, Plus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export function NoCompanyEmpty() {
  const { user } = useAuth();
  const { refreshCompanies, switchCompany } = useCompany();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!user || !name.trim() || !displayName.trim()) return;
    setBusy(true);
    try {
      const companyName = name.trim();
      const memberDisplayName = displayName.trim();

      const { error: insertError } = await supabase
        .from("companies")
        .insert({ name: companyName, created_by: user.id });
      if (insertError) throw insertError;

      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data: newCompany, error: fetchError } = await supabase
        .from("companies")
        .select("*")
        .eq("created_by", user.id)
        .eq("name", companyName)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (fetchError) throw fetchError;

      await supabase
        .from("company_members")
        .update({ display_name: memberDisplayName })
        .eq("company_id", newCompany.id)
        .eq("user_id", user.id);
      toast.success(`Created ${newCompany.name}`);
      await refreshCompanies();
      switchCompany(newCompany.id);
      setOpen(false);
      setName("");
      setDisplayName("");
    } catch (e: unknown) {
      console.error("Create company failed:", e);
      toast.error(e instanceof Error ? e.message : "Failed to create company");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <Building2 className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Create your first company</h2>
        <p className="mt-2 text-sm text-gray-500">
          Each company has its own books — income, expenses, invoices, tools.
          You can create more later and switch between them like WhatsApp accounts.
        </p>
        <Button onClick={() => setOpen(true)} className="mt-6 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-1 h-4 w-4" /> Create company
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create your company</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Company name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="RevenueX Digital" />
            </div>
            <div>
              <Label>Your display name in this company</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Priya" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={busy || !name.trim() || !displayName.trim()}>
              {busy ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
