import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { NoCompanyEmpty } from "@/components/NoCompanyEmpty";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { Money } from "@/components/Money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCompanyRecords } from "@/hooks/useCompanyRecords";
import { useUpsertRow, DeleteRowButton, EditRowButton } from "@/components/RowActions";
import { INVOICE_STATUSES } from "@/lib/months";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invoices")({
  component: InvoicesPage,
});

type Row = { id: string; client_name: string; project_name: string | null; amount: number; invoice_date: string; due_date: string | null; status: string; payment_date: string | null; created_at: string };

function InvoicesPage() {
  const { currentCompany, canEdit } = useCompany();
  const qc = useQueryClient();
  const { data = [] } = useCompanyRecords<Row>("invoices");
  const upsert = useUpsertRow("invoices");

  const emptyForm = { client_name: "", project_name: "", amount: "", invoice_date: new Date().toISOString().slice(0, 10), due_date: "", status: "Pending" };
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  if (!currentCompany) return <NoCompanyEmpty />;

  const totals = useMemo(() => {
    const sum = (rows: Row[]) => rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    return {
      pending: sum(data.filter((r) => r.status === "Pending" || r.status === "Partial")),
      overdue: sum(data.filter((r) => r.status === "Overdue")),
      paid: sum(data.filter((r) => r.status === "Paid")),
    };
  }, [data]);

  const startEdit = (r: Row) => {
    setForm({
      client_name: r.client_name,
      project_name: r.project_name ?? "",
      amount: String(r.amount),
      invoice_date: r.invoice_date,
      due_date: r.due_date ?? "",
      status: r.status,
    });
    setEditingId(r.id);
    setOpen(true);
  };

  const closeForm = () => {
    setOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm, invoice_date: new Date().toISOString().slice(0, 10) });
  };

  const submit = async () => {
    if (!form.client_name.trim() || !form.amount || !form.invoice_date) return toast.error("Client, amount, and invoice date required");
    setBusy(true);
    try {
      await upsert(
        {
          client_name: form.client_name.trim(),
          project_name: form.project_name || null,
          amount: Number(form.amount),
          invoice_date: form.invoice_date,
          due_date: form.due_date || null,
          status: form.status,
        },
        editingId,
      );
      toast.success(editingId ? "Invoice updated" : "Invoice added");
      closeForm();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  const setStatus = async (id: string, status: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("invoices") as any).update({ status, payment_date: status === "Paid" ? new Date().toISOString().slice(0, 10) : null }).eq("id", id);
    if (error) toast.error(error.message);
    else { qc.invalidateQueries({ queryKey: ["invoices"] }); toast.success("Updated"); }
  };

  const daysOverdue = (due: string | null, status: string) => {
    if (!due || status === "Paid") return null;
    const diff = Math.floor((Date.now() - new Date(due).getTime()) / 86400000);
    return diff > 0 ? diff : null;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle="Track what clients owe you and when it's due"
        actions={canEdit ? <Button size="sm" onClick={() => (open ? closeForm() : setOpen(true))} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1 h-3.5 w-3.5" /> New invoice</Button> : undefined}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard label="Pending" value={<Money amount={totals.pending} tone="warning" />} tone="warning" />
        <MetricCard label="Overdue" value={<Money amount={totals.overdue} tone="danger" />} tone="danger" hint="Past due date and not paid" />
        <MetricCard label="Paid (FY)" value={<Money amount={totals.paid} tone="success" />} tone="success" />
      </div>

      {open && canEdit && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold">{editingId ? "Edit invoice" : "New invoice"}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><Label>Client *</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
            <div><Label>Project</Label><Input value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} /></div>
            <div><Label>Amount (₹) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>Invoice date *</Label><Input type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} /></div>
            <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INVOICE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={submit} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
              {busy ? "Saving..." : editingId ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white">
        {data.length === 0 ? (
          <div className="p-6"><EmptyState title="No invoices yet" description="Track every invoice you send — never lose money to forgetfulness." /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => {
                const dod = daysOverdue(r.due_date, r.status);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-gray-500">{formatDate(r.invoice_date)}</TableCell>
                    <TableCell className="font-medium">{r.client_name}</TableCell>
                    <TableCell className="text-xs text-gray-500">{r.project_name ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      <span className={dod ? "font-medium text-rose-600" : "text-gray-500"}>
                        {r.due_date ? formatDate(r.due_date) : "—"}
                        {dod && <span className="ml-1 text-[10px]">({dod}d overdue)</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{INVOICE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <span className="text-xs">{r.status}</span>}
                    </TableCell>
                    <TableCell className="text-right"><Money amount={r.amount} /></TableCell>
                    <TableCell><DeleteRowButton table="invoices" id={r.id} label="this invoice" /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
