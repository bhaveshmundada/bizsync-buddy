import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { NoCompanyEmpty } from "@/components/NoCompanyEmpty";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { Money } from "@/components/Money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCompanyRecords } from "@/hooks/useCompanyRecords";
import { useUpsertRow, DeleteRowButton, EditRowButton } from "@/components/RowActions";
import { FY_MONTHS, EXPENSE_CATEGORIES, DEFAULT_MEMBERS } from "@/lib/months";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { exportCSV } from "@/lib/csv";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { MemberAvatar } from "@/components/MemberAvatar";
import { HintBox } from "@/components/HintBox";
import { ReceiptUploader, uploadReceipt, ReceiptLink } from "@/components/ReceiptUploader";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/expenses")({
  component: ExpensesPage,
});

type ExpenseRow = { id: string; description: string; amount: number; month: string | null; category: string | null; paid_by_name: string; notes: string | null; added_by: string; created_at: string; receipt_url: string | null };

function ExpensesPage() {
  const { currentCompany, canEdit } = useCompany();
  const { data = [] } = useCompanyRecords<ExpenseRow>("expenses");
  const { data: members = [] } = useCompanyRecords<{ user_id: string; display_name: string }>("company_members", { fyScoped: false });
  const upsert = useUpsertRow("expenses");
  const qc = useQueryClient();

  const emptyForm = { description: "", amount: "", month: "", category: "", paid_by_name: currentCompany?.display_name || "Bhavesh Mundada", notes: "" };
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [existingReceipt, setExistingReceipt] = useState<string | null>(null);

  const withdrawalsByMember = useMemo(() => {
    const m = new Map<string, number>();
    data.forEach((e) => {
      m.set(e.paid_by_name, (m.get(e.paid_by_name) ?? 0) + Number(e.amount ?? 0));
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  if (!currentCompany) return <NoCompanyEmpty />;

  const memberMap = new Map(members.map((m) => [m.user_id, m.display_name]));
  const total = data.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const isPartner = members.length > 1;

  const startEdit = (r: ExpenseRow) => {
    setForm({
      description: r.description,
      amount: String(r.amount),
      month: r.month ?? "",
      category: r.category ?? "",
      paid_by_name: r.paid_by_name,
      notes: r.notes ?? "",
    });
    setFile(null);
    setExistingReceipt(r.receipt_url ?? null);
    setEditingId(r.id);
    setOpen(true);
  };

  const closeForm = () => {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFile(null);
    setExistingReceipt(null);
  };

  const submit = async () => {
    if (!form.description.trim() || !form.amount || !form.paid_by_name) return toast.error("Description, amount, and 'who paid' are required");
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        description: form.description.trim(),
        amount: Number(form.amount),
        month: form.month || null,
        category: form.category || null,
        paid_by_name: form.paid_by_name,
        notes: form.notes || null,
      };
      if (editingId) payload.receipt_url = existingReceipt;
      const { id } = await upsert(payload, editingId);
      if (file && currentCompany) {
        const path = await uploadReceipt({ file, companyId: currentCompany.id, rowId: id });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("expenses") as any).update({ receipt_url: path }).eq("id", id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["expenses"] });
        toast.success(editingId ? "Expense updated with receipt" : "Expense saved with receipt");
      } else {
        toast.success(editingId ? "Expense updated" : "Expense saved");
      }
      closeForm();
    } catch (e: unknown) {
      console.error("Save expense failed:", e);
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="All business expenses for this financial year"
        actions={
          <>
            <Button variant="outline" size="sm" disabled={!data.length} onClick={() => exportCSV("expenses.csv", data, [
              { key: "created_at", label: "Created" },
              { key: "description", label: "Description" },
              { key: "amount", label: "Amount" },
              { key: "category", label: "Category" },
              { key: "paid_by_name", label: "Paid by" },
              { key: "month", label: "Month" },
            ])}><Download className="mr-1 h-3.5 w-3.5" /> Export CSV</Button>
            {canEdit && (
              <Button size="sm" onClick={() => (open ? closeForm() : setOpen(true))} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add expense
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MetricCard label="Total expenses" value={<Money amount={total} tone="danger" />} tone="danger" />
        <MetricCard label="Categories used" value={new Set(data.map((d) => d.category).filter(Boolean)).size} tone="info" />
        <MetricCard label="Entries" value={data.length} />
      </div>

      {isPartner && withdrawalsByMember.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Spent by each member</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {withdrawalsByMember.map(([who, amt]) => (
              <div key={who} className="rounded-lg bg-purple-50 p-3">
                <div className="flex items-center gap-2">
                  <MemberAvatar name={who} size="xs" showName={false} />
                  <span className="truncate text-xs font-medium text-gray-700">{who}</span>
                </div>
                <div className="mt-1.5 text-base font-semibold text-purple-700"><Money amount={amt} tone="default" className="text-purple-700" /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {open && canEdit && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold">{editingId ? "Edit expense" : "Add expense"}</h3>
          {isPartner && (
            <div className="mb-3"><HintBox tone="purple">In a partner company, always record who actually paid — it determines partner withdrawals.</HintBox></div>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Description *</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What did you pay for?" />
            </div>
            <div>
              <Label>Amount (₹) *</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label>Who paid? *</Label>
              <Select value={form.paid_by_name} onValueChange={(v) => setForm({ ...form, paid_by_name: v })}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {members.length > 0
                    ? members.map((m) => (
                        <SelectItem key={m.user_id} value={m.display_name}>{m.display_name}</SelectItem>
                      ))
                    : DEFAULT_MEMBERS.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                  <SelectItem value="Business account">Business account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Month</Label>
              <Select value={form.month} onValueChange={(v) => setForm({ ...form, month: v })}>
                <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                <SelectContent>{FY_MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Attach receipt / invoice</Label>
              <ReceiptUploader
                file={file}
                onFile={setFile}
                existingUrl={existingReceipt}
                onClearExisting={() => setExistingReceipt(null)}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
          <div className="p-6"><EmptyState title="No expenses yet" description="Track every rupee — it'll save you at tax time." /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Paid by</TableHead>
                <TableHead>Added by</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10"></TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-gray-500">{formatDate(r.created_at)}</TableCell>
                  <TableCell className="font-medium">{r.description}</TableCell>
                  <TableCell className="text-xs text-gray-500">{r.category ?? "—"}</TableCell>
                  <TableCell><MemberAvatar name={r.paid_by_name} size="xs" /></TableCell>
                  <TableCell><MemberAvatar name={memberMap.get(r.added_by) ?? "?"} size="xs" /></TableCell>
                  <TableCell className="text-right"><Money amount={r.amount} tone="danger" /></TableCell>
                  <TableCell><ReceiptLink path={r.receipt_url} /></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <EditRowButton onClick={() => startEdit(r)} />
                      <DeleteRowButton table="expenses" id={r.id} label="this expense" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
