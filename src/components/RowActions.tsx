import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Table = "income" | "expenses" | "client_recoverables" | "invoices" | "tools_subscriptions";

export function DeleteRowButton({ table, id, label = "this row" }: { table: Table; id: string; label?: string }) {
  const { canEdit } = useCompany();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  if (!canEdit) return null;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-rose-600">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const { error } = await supabase.from(table).delete().eq("id", id);
              setBusy(false);
              if (error) toast.error(error.message);
              else {
                toast.success("Deleted");
                qc.invalidateQueries({ queryKey: [table] });
              }
            }}
            className="bg-rose-600 hover:bg-rose-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function EditRowButton({ onClick }: { onClick: () => void }) {
  const { canEdit } = useCompany();
  if (!canEdit) return null;
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 w-7 p-0 text-gray-400 hover:text-emerald-600"
      onClick={onClick}
      title="Edit"
    >
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  );
}

export function useInsertRow(table: Table) {
  const upsert = useUpsertRow(table);
  return (values: Record<string, unknown>) => upsert(values, null);
}

export function useUpsertRow(table: Table) {
  const { currentCompany, financialYear } = useCompany();
  const { user } = useAuth();
  const qc = useQueryClient();
  return async (values: Record<string, unknown>, editingId: string | null) => {
    if (!currentCompany || !user) throw new Error("No company");
    if (editingId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(table) as any).update(values).eq("id", editingId);
      if (error) throw error;
    } else {
      const payload = {
        ...values,
        company_id: currentCompany.id,
        added_by: user.id,
        ...(table !== "tools_subscriptions" ? { financial_year: financialYear } : {}),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(table) as any).insert(payload);
      if (error) throw error;
    }
    qc.invalidateQueries({ queryKey: [table] });
  };
}
