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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCompanyRecords } from "@/hooks/useCompanyRecords";
import { useUpsertRow, DeleteRowButton, EditRowButton } from "@/components/RowActions";
import { TOOL_CATEGORIES, BILLING_CYCLES, TOOL_STATUSES } from "@/lib/months";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tools")({
  component: ToolsPage,
});

type Row = { id: string; tool_name: string; monthly_cost: number; billing_cycle: string; status: string; category: string | null; renewal_date: string | null; notes: string | null; created_at: string };

function ToolsPage() {
  const { currentCompany, canEdit } = useCompany();
  const { data = [] } = useCompanyRecords<Row>("tools_subscriptions", { fyScoped: false });
  const upsert = useUpsertRow("tools_subscriptions");

  const emptyForm = { tool_name: "", monthly_cost: "", billing_cycle: "Monthly", status: "Active", category: "", renewal_date: "", notes: "" };
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  if (!currentCompany) return <NoCompanyEmpty />;

  const monthlyEquivalent = (r: Row) => {
    const c = Number(r.monthly_cost ?? 0);
    if (r.billing_cycle === "Annual") return c / 12;
    if (r.billing_cycle === "Quarterly") return c / 3;
    if (r.billing_cycle === "Lifetime") return 0;
    return c;
  };

  const totals = useMemo(() => {
    const active = data.filter((r) => r.status === "Active");
    const monthly = active.reduce((s, r) => s + monthlyEquivalent(r), 0);
    const annual = monthly * 12;
    const byCategory = new Map<string, number>();
    active.forEach((r) => {
      const k = r.category ?? "Other";
      byCategory.set(k, (byCategory.get(k) ?? 0) + monthlyEquivalent(r));
    });
    return { monthly, annual, activeCount: active.length, byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]) };
  }, [data]);

  const startEdit = (r: Row) => {
    setForm({
      tool_name: r.tool_name,
      monthly_cost: String(r.monthly_cost),
      billing_cycle: r.billing_cycle,
      status: r.status,
      category: r.category ?? "",
      renewal_date: r.renewal_date ?? "",
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
    if (!form.tool_name.trim() || !form.monthly_cost) return toast.error("Tool and cost required");
    setBusy(true);
    try {
      await upsert(
        {
          tool_name: form.tool_name.trim(),
          monthly_cost: Number(form.monthly_cost),
          billing_cycle: form.billing_cycle,
          status: form.status,
          category: form.category || null,
          renewal_date: form.renewal_date || null,
          notes: form.notes || null,
        },
        editingId,
      );
      toast.success(editingId ? "Tool updated" : "Tool added");
      closeForm();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tools & SaaS"
        subtitle="Every subscription draining your bank account"
        actions={canEdit ? <Button size="sm" onClick={() => (open ? closeForm() : setOpen(true))} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1 h-3.5 w-3.5" /> Add tool</Button> : undefined}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard label="Monthly cost" value={<Money amount={totals.monthly} />} tone="danger" />
        <MetricCard label="Annualized" value={<Money amount={totals.annual} />} tone="warning" />
        <MetricCard label="Active tools" value={totals.activeCount} tone="info" />
      </div>

      {totals.byCategory.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold">Monthly spend by category</h3>
          <div className="space-y-2">
            {totals.byCategory.map(([cat, amt]) => {
              const pct = totals.monthly > 0 ? (amt / totals.monthly) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-gray-700">{cat}</span>
                    <span className="text-gray-500"><Money amount={amt} /> · {pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {open && canEdit && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold">{editingId ? "Edit tool" : "Add tool"}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><Label>Tool name *</Label><Input value={form.tool_name} onChange={(e) => setForm({ ...form, tool_name: e.target.value })} /></div>
            <div><Label>Cost (₹) *</Label><Input type="number" value={form.monthly_cost} onChange={(e) => setForm({ ...form, monthly_cost: e.target.value })} /></div>
            <div>
              <Label>Billing cycle</Label>
              <Select value={form.billing_cycle} onValueChange={(v) => setForm({ ...form, billing_cycle: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BILLING_CYCLES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{TOOL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TOOL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Renewal date</Label><Input type="date" value={form.renewal_date} onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} /></div>
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
          <div className="p-6"><EmptyState title="No tools tracked yet" description="Add every SaaS you pay for — even the ones you forgot." /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">≈ Monthly</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.tool_name}</TableCell>
                  <TableCell className="text-xs text-gray-500">{r.category ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.billing_cycle}</TableCell>
                  <TableCell><span className={`rounded-full px-2 py-0.5 text-[10px] ${r.status === "Active" ? "bg-emerald-50 text-emerald-700" : r.status === "Trial" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"}`}>{r.status}</span></TableCell>
                  <TableCell className="text-xs text-gray-500">{r.renewal_date ? formatDate(r.renewal_date) : "—"}</TableCell>
                  <TableCell className="text-right"><Money amount={r.monthly_cost} /></TableCell>
                  <TableCell className="text-right text-xs text-gray-500"><Money amount={monthlyEquivalent(r)} /></TableCell>
                  <TableCell><DeleteRowButton table="tools_subscriptions" id={r.id} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
