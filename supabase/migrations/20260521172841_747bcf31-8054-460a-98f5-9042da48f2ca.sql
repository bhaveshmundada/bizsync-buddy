
revoke execute on function public.is_company_member(uuid, uuid) from public, anon;
revoke execute on function public.has_company_role(uuid, uuid, public.company_role[]) from public, anon;
revoke execute on function public.handle_new_company() from public, anon, authenticated;
revoke execute on function public.handle_new_user_invites() from public, anon, authenticated;
grant execute on function public.is_company_member(uuid, uuid) to authenticated;
grant execute on function public.has_company_role(uuid, uuid, public.company_role[]) to authenticated;
