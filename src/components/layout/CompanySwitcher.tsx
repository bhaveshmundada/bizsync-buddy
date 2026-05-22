import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useCompany, type CompanyRole } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ROLE_BADGE: Record<CompanyRole, string> = {
  owner: "bg-emerald-50 text-emerald-700",
  admin: "bg-blue-50 text-blue-700",
  editor: "bg-amber-50 text-amber-700",
  viewer: "bg-gray-100 text-gray-600",
};

export function CompanySwitcher() {
  const { companies, currentCompany, switchCompany, refreshCompanies } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!currentCompany) {
    return (
      <Button size="sm" className="w-full" onClick={() => setCreateOpen(true)}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Create company
      </Button>
    );
  }

  const handleCreate = async () => {
    if (!name.trim() || !displayName.trim() || !user) return;
    setSaving(true);
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
      setCreateOpen(false);
      setName("");
      setDisplayName("");
      await refreshCompanies();
      switchCompany(newCompany.id);
      navigate({ to: "/" });
    } catch (e: unknown) {
      console.error("Create company failed:", e);
      toast.error(e instanceof Error ? e.message : "Failed to create company");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2 text-left hover:border-gray-200 hover:bg-gray-50">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-gray-900">{currentCompany.name}</div>
            <div className="mt-0.5">
              <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${ROLE_BADGE[currentCompany.role]}`}>
                {currentCompany.role}
              </span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {companies.map((c) => (
            <DropdownMenuItem key={c.id} onClick={() => switchCompany(c.id)} className="cursor-pointer">
              <div className="flex w-full items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{c.name}</div>
                  <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${ROLE_BADGE[c.role]}`}>
                    {c.role}
                  </span>
                </div>
                {c.id === currentCompany.id && <Check className="h-4 w-4 text-emerald-600" />}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)} className="cursor-pointer text-emerald-700">
            <Plus className="mr-2 h-4 w-4" /> Create new company
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new company</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Company name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. RevenueX Digital" />
            </div>
            <div>
              <Label>Your display name in this company</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="What should your team call you?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !name.trim() || !displayName.trim()}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
