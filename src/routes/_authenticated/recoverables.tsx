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
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCompanyRecords } from "@/hooks/useCompanyRecords";
import { useUpsertRow, DeleteRowButton, EditRowButton } from "@/components/RowActions";
import { FY_MONTHS, PAID_VIA_OPTIONS, RECOVERABLE_STATUSES, RECOVERABLE_CATEGORIES, DEFAULT_MEMBERS } from "@/lib/months";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { MemberAvatar } from "@/components/MemberAvatar";
import { HintBox } from "@/components/HintBox";
import { ReceiptUploader, uploadReceipt, ReceiptLink } from "@/components/ReceiptUploader";

export const Route = createFileRoute("/_authenticated/recoverables")({
  component: RecoverablesPage,
});

type Row = { id: string; client_name: string; amount: number; description: string | null; category: string | null; month: string | null; paid_via: string | null; paid_by_name: string; status: string; recovery_date: string | null; added_by: string; created_at: string; receipt_url: string | null };

function RecoverablesPage() {
  const { currentCompany, canEdit } = useCompany();
  const qc = useQueryClient();
  const { data = [] } = useCompanyRecords<Row>("client_recoverables");
  const { data: members = [] } = useCompanyRecords<{ user_id: string; display_name: string }>("company_members", { fyScoped: false });
  const upsert = useUpsertRow("client_recoverables");

  const emptyForm = { client_name: "", amount: "", description: "", category: "", month: "", paid_via: "", paid_by_name: currentCompany?.display_name || "Bhavesh Mundada", status: "Pending" };
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [existingReceipt, setExistingReceipt] = useState<string | null>(null);

  if (!currentCompany) return <NoCompanyEmpty />;
  const memberMap = new Map(members.map((m) => [m.user_id, m.display_name]));

  const totals = useMemo(() => {
    const sum = (rows: Row[]) => rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    return {
      pending: sum(data.filter((r) => r.status === "Pending")),
      recovered: sum(data.filter((r) => r.status === "Recovered")),
      writtenOff: sum(data.filter((r) => r.status === "Written off")),
    };
  }, [data]);

  const owedByMember = useMemo(() => {
    const m = new Map<string, number>();
    data.filter((r) => r.status === "Pending").forEach((r) => {
      m.set(r.paid_by_name, (m.get(r.paid_by_name) ?? 0) + Number(r.amount ?? 0));
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  const startEdit = (r: Row) => {
    setForm({
      client_name: r.client_name,
      amount: String(r.amount),
      description: r.description ?? "",
      category: (r as any).category ?? "",
      month: r.month ?? "",
      paid_via: r.paid_via ?? "",
      paid_by_name: r.paid_by_name,
      status: r.status,
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
    if (!form.client_name.trim() || !form.amount || !form.paid_by_name) return toast.error("Client, amount, and 'paid by' are required");
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        client_name: form.client_name.trim(),
        amount: Number(form.amount),
        description: form.description || null,
        category: form.category || null,
        month: form.month || null,
        paid_via: form.paid_via || null,
        paid_by_name: form.paid_by_name,
        status: form.status,
      };
      if (editingId) payload.receipt_url = existingReceipt;
      const { id } = await upsert(payload, editingId);
      if (file && currentCompany) {
        const path = await uploadReceipt({ file, companyId: currentCompany.id, rowId: id });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("client_recoverables") as any).update({ receipt_url: path }).eq("id", id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["client_recoverables"] });
        toast.success(editingId ? "Updated with receipt" : "Recorded with receipt");
      } else {
        toast.success(editingId ? "Updated" : "Recorded");
      }
      closeForm();
    } catch (e: unknown) {
      console.error("Save recoverable failed:", e);
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("client_recoverables") as any)
      .update({ status, recovery_date: status === "Recovered" ? new Date().toISOString().slice(0, 10) : null })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["client_recoverables"] });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client spend (recoverables)"
        subtitle="Money you spent on behalf of clients — to recover from them"
        actions={canEdit ? <Button size="sm" onClick={() => (open ? closeForm() : setOpen(true))} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1 h-3.5 w-3.5" /> Add</Button> : undefined}
      />

      <HintBox tone="blue">
        Track ad spend, tool purchases, or anything you paid for a client and need back. Mark as Recovered when reimbursed.
      </HintBox>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard label="Pending recovery" value={<Money amount={totals.pending} tone="warning" />} tone="warning" />
        <MetricCard label="Recovered" value={<Money amount={totals.recovered} tone="success" />} tone="success" />
        <MetricCard label="Written off" value={<Money amount={totals.writtenOff} tone="muted" />} />
      </div>

      {owedByMember.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {owedByMember.map(([who, amt]) => (
            <div key={who} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2"><MemberAvatar name={who} size="xs" /></div>
              <div className="mt-2 text-xs text-amber-700">is owed</div>
              <div className="text-2xl font-semibold text-amber-700 tabular-nums"><Money amount={amt} tone="default" className="text-amber-700" /></div>
            </div>
          ))}
        </div>
      )}

      {open && canEdit && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold">{editingId ? "Edit client spend" : "Add client spend"}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><Label>Client *</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
            <div><Label>Amount (₹) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What did you spend on?" /></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Type of spend" /></SelectTrigger>
                <SelectContent>{RECOVERABLE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Paid by *</Label>
              <Select value={form.paid_by_name} onValueChange={(v) => setForm({ ...form, paid_by_name: v })}>
                <SelectTrigger><SelectValue placeholder="Member" /></SelectTrigger>
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
              <Label>Paid via</Label>
              <Select value={form.paid_via} onValueChange={(v) => setForm({ ...form, paid_via: v })}>
                <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
                <SelectContent>{PAID_VIA_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Month</Label>
              <Select value={form.month} onValueChange={(v) => setForm({ ...form, month: v })}>
                <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>{FY_MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RECOVERABLE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
          <div className="p-6"><EmptyState title="Nothing to recover" description="Anything you paid out-of-pocket for a client will show up here." /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Paid by</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10"></TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-gray-500">{formatDate(r.created_at)}</TableCell>
                  <TableCell className="font-medium">{r.client_name}</TableCell>
                  <TableCell className="text-xs text-gray-500">{r.description ?? "—"}</TableCell>
                  <TableCell><MemberAvatar name={r.paid_by_name} size="xs" /></TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{RECOVERABLE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "Recovered" ? "bg-emerald-50 text-emerald-700" : r.status === "Pending" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{r.status}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right"><Money amount={r.amount} /></TableCell>
                  <TableCell><ReceiptLink path={r.receipt_url} /></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <EditRowButton onClick={() => startEdit(r)} />
                      <DeleteRowButton table="client_recoverables" id={r.id} />
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
