import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { NoCompanyEmpty } from "@/components/NoCompanyEmpty";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useCompanyRecords } from "@/hooks/useCompanyRecords";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { currentCompany, canManage, refreshCompanies } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: members = [] } = useCompanyRecords<{ id: string; user_id: string; display_name: string; role: string; joined_at: string }>("company_members", { fyScoped: false });
  const { data: invites = [] } = useCompanyRecords<{ id: string; email: string; role: string; created_at: string; accepted_at: string | null }>("company_invites" as never, { fyScoped: false });

  const [renameName, setRenameName] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", role: "editor", display_name: "" });
  const [busy, setBusy] = useState(false);

  if (!currentCompany) return <NoCompanyEmpty />;

  const rename = async () => {
    if (!renameName.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("companies").update({ name: renameName.trim() }).eq("id", currentCompany.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Renamed"); await refreshCompanies(); setRenameName(""); }
  };

  const deleteCompany = async () => {
    const { error } = await supabase.from("companies").delete().eq("id", currentCompany.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Company deleted");
      localStorage.removeItem("revx:current_company");
      await refreshCompanies();
      navigate({ to: "/" });
    }
  };

  const sendInvite = async () => {
    if (!invite.email.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("company_invites").insert({
      company_id: currentCompany.id,
      email: invite.email.trim().toLowerCase(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      role: invite.role as any,
      display_name: invite.display_name || null,
      invited_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Invite created — they'll auto-join on signup");
      setInviteOpen(false);
      setInvite({ email: "", role: "editor", display_name: "" });
      qc.invalidateQueries({ queryKey: ["company_invites"] });
    }
  };

  const removeMember = async (id: string) => {
    const { error } = await supabase.from("company_members").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["company_members"] }); }
  };

  const changeRole = async (id: string, role: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("company_members") as any).update({ role }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["company_members"] }); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Company settings" subtitle={currentCompany.name} />
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 pt-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <h3 className="text-sm font-semibold">Rename company</h3>
            <div className="mt-3 flex gap-2">
              <Input value={renameName} onChange={(e) => setRenameName(e.target.value)} placeholder={currentCompany.name} disabled={!canManage} />
              <Button onClick={rename} disabled={!canManage || busy || !renameName.trim()}>Save</Button>
            </div>
          </div>

          {canManage && currentCompany.role === "owner" && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <h3 className="text-sm font-semibold text-rose-700">Danger zone</h3>
              <p className="mt-1 text-xs text-rose-600">Deleting this company removes all its income, expenses, invoices, and tools permanently.</p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="mt-3"><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete company</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {currentCompany.name}?</AlertDialogTitle>
                    <AlertDialogDescription>This is permanent. All financial records will be erased.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteCompany} className="bg-rose-600 hover:bg-rose-700">Delete forever</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="space-y-4 pt-4">
          <div className="flex justify-end">
            {canManage && (
              <Button size="sm" onClick={() => setInviteOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-1 h-3.5 w-3.5" /> Invite member
              </Button>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell><MemberAvatar name={m.display_name} /></TableCell>
                    <TableCell>
                      {canManage && m.role !== "owner" && m.user_id !== user?.id ? (
                        <Select value={m.role} onValueChange={(v) => changeRole(m.id, v)}>
                          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : <span className="text-xs capitalize">{m.role}</span>}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">{formatDate(m.joined_at)}</TableCell>
                    <TableCell>
                      {canManage && m.role !== "owner" && m.user_id !== user?.id && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-rose-600" onClick={() => removeMember(m.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {invites.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white">
              <div className="border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-700">Pending invites</div>
              <Table>
                <TableBody>
                  {invites.filter((i) => !i.accepted_at).map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="text-sm">{i.email}</TableCell>
                      <TableCell className="text-xs capitalize">{i.role}</TableCell>
                      <TableCell className="text-xs text-gray-500">{formatDate(i.created_at)}</TableCell>
                      <TableCell>
                        {canManage && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-rose-600" onClick={async () => {
                            const { error } = await supabase.from("company_invites").delete().eq("id", i.id);
                            if (error) toast.error(error.message);
                            else { toast.success("Revoked"); qc.invalidateQueries({ queryKey: ["company_invites"] }); }
                          }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite a member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Email</Label><Input type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} /></div>
            <div><Label>Display name (optional)</Label><Input value={invite.display_name} onChange={(e) => setInvite({ ...invite, display_name: e.target.value })} placeholder="How they'll appear in the team" /></div>
            <div>
              <Label>Role</Label>
              <Select value={invite.role} onValueChange={(v) => setInvite({ ...invite, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — full access, can manage team</SelectItem>
                  <SelectItem value="editor">Editor — can add/edit data</SelectItem>
                  <SelectItem value="viewer">Viewer — read-only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-gray-500">They'll auto-join when they sign up with this email.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={sendInvite} disabled={busy || !invite.email.trim()}>Send invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
