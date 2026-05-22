import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { NoCompanyEmpty } from "@/components/NoCompanyEmpty";
import { PageHeader } from "@/components/PageHeader";
import { HintBox } from "@/components/HintBox";
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
import { FY_MONTHS, SERVICE_TYPES } from "@/lib/months";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { exportCSV } from "@/lib/csv";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { MemberAvatar } from "@/components/MemberAvatar";

export const Route = createFileRoute("/_authenticated/income")({
  component: IncomePage,
});

type IncomeRow = { id: string; client_name: string; amount: number; month: string | null; service_type: string | null; notes: string | null; added_by: string; created_at: string };

function IncomePage() {
  const { currentCompany, canEdit } = useCompany();
  const { data = [], isLoading } = useCompanyRecords<IncomeRow>("income");
  const { data: members = [] } = useCompanyRecords<{ user_id: string; display_name: string }>("company_members", { fyScoped: false });
  const upsert = useUpsertRow("income");

  const emptyForm = { client_name: "", amount: "", month: "", service_type: "", notes: "" };
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  if (!currentCompany) return <NoCompanyEmpty />;

  const memberMap = new Map(members.map((m) => [m.user_id, m.display_name]));
  const total = data.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const byClient = new Map<string, number>();
  data.forEach((r) => byClient.set(r.client_name, (byClient.get(r.client_name) ?? 0) + Number(r.amount ?? 0)));
  const topClient = [...byClient.entries()].sort((a, b) => b[1] - a[1])[0];
  const avgPerClient = byClient.size > 0 ? total / byClient.size : 0;

  const startEdit = (r: IncomeRow) => {
    setForm({
      client_name: r.client_name,
      amount: String(r.amount),
      month: r.month ?? "",
      service_type: r.service_type ?? "",
      notes: r.notes ?? "",
    });
    setEditingId(r.id);
    setOpen(true);
  };

  const closeForm = () => {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const submit = async () => {
    if (!form.client_name.trim() || !form.amount) return toast.error("Client and amount required");
    setBusy(true);
    try {
      await upsert(
        {
          client_name: form.client_name.trim(),
          amount: Number(form.amount),
          month: form.month || null,
          service_type: form.service_type || null,
          notes: form.notes || null,
        },
        editingId,
      );
      toast.success(editingId ? "Income updated" : "Income added");
      closeForm();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income"
        subtitle="Money received from clients in this financial year"
        actions={
          <>
            <Button variant="outline" size="sm" disabled={!data.length} onClick={() => exportCSV("income.csv", data, [
              { key: "created_at", label: "Created" },
              { key: "client_name", label: "Client" },
              { key: "amount", label: "Amount" },
              { key: "month", label: "Month" },
              { key: "service_type", label: "Service" },
              { key: "notes", label: "Notes" },
            ])}>
              <Download className="mr-1 h-3.5 w-3.5" /> Export CSV
            </Button>
            {canEdit && (
              <Button size="sm" onClick={() => (open ? closeForm() : setOpen(true))} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add income
              </Button>
            )}
          </>
        }
      />

      <HintBox tone="emerald">
        Income = money clients actually paid you. Not promises, not invoices — real money in your bank account. Only log here when the payment hits.
      </HintBox>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MetricCard label="Total income" value={<Money amount={total} tone="success" />} tone="success" />
        <MetricCard label="Top client" value={topClient ? topClient[0] : "—"} sub={topClient ? <Money amount={topClient[1]} /> : null} tone="info" />
        <MetricCard label="Avg per client" value={<Money amount={avgPerClient} />} sub={`${byClient.size} clients`} />
      </div>

      {open && canEdit && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold">{editingId ? "Edit income" : "Add income"}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Client name *</Label>
              <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
            </div>
            <div>
              <Label>Amount (₹) *</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label>Month</Label>
              <Select value={form.month} onValueChange={(v) => setForm({ ...form, month: v })}>
                <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                <SelectContent>{FY_MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Service type</Label>
              <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>{SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
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
        {isLoading ? (
          <div className="p-6 text-sm text-gray-400">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-6"><EmptyState title="No income yet" description="Click 'Add income' to record your first entry." /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Added by</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-gray-500">{formatDate(r.created_at)}</TableCell>
                  <TableCell className="font-medium">{r.client_name}</TableCell>
                  <TableCell className="text-xs text-gray-500">{r.service_type ?? "—"}</TableCell>
                  <TableCell className="text-xs text-gray-500">{r.month ?? "—"}</TableCell>
                  <TableCell><MemberAvatar name={memberMap.get(r.added_by) ?? "?"} size="xs" /></TableCell>
                  <TableCell className="text-right"><Money amount={r.amount} tone="success" /></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <EditRowButton onClick={() => startEdit(r)} />
                      <DeleteRowButton table="income" id={r.id} label="this income" />
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
