
-- =========================================================================
-- ROLES & HELPER FUNCTIONS
-- =========================================================================
create type public.company_role as enum ('owner', 'admin', 'editor', 'viewer');

-- =========================================================================
-- COMPANIES
-- =========================================================================
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  financial_year text not null default '2025-26',
  currency text not null default 'INR',
  created_at timestamptz not null default now()
);

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.company_role not null default 'admin',
  display_name text not null,
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role public.company_role not null default 'editor',
  display_name text,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (company_id, email)
);

-- Security definer helpers (avoid RLS recursion on company_members)
create or replace function public.is_company_member(_company_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members
    where company_id = _company_id and user_id = _user_id
  )
$$;

create or replace function public.has_company_role(_company_id uuid, _user_id uuid, _roles public.company_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members
    where company_id = _company_id
      and user_id = _user_id
      and role = any(_roles)
  )
$$;

-- =========================================================================
-- FINANCIAL DATA TABLES
-- =========================================================================
create table public.income (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  amount numeric not null,
  service_type text,
  month text,
  financial_year text not null default '2025-26',
  notes text,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric not null,
  category text,
  paid_by_name text not null,
  month text,
  financial_year text not null default '2025-26',
  notes text,
  created_at timestamptz not null default now()
);

create table public.client_recoverables (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  amount numeric not null,
  description text,
  paid_via text,
  paid_by_name text not null,
  month text,
  status text not null default 'Pending',
  recovery_date date,
  financial_year text not null default '2025-26',
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  project_name text,
  amount numeric not null,
  invoice_date date not null,
  due_date date,
  status text not null default 'Pending',
  payment_date date,
  notes text,
  financial_year text not null default '2025-26',
  created_at timestamptz not null default now()
);

create table public.tools_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete cascade,
  tool_name text not null,
  monthly_cost numeric not null,
  category text,
  billing_cycle text not null default 'Monthly',
  status text not null default 'Active',
  renewal_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.company_activity (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_invites enable row level security;
alter table public.income enable row level security;
alter table public.expenses enable row level security;
alter table public.client_recoverables enable row level security;
alter table public.invoices enable row level security;
alter table public.tools_subscriptions enable row level security;
alter table public.company_activity enable row level security;

-- companies
create policy "Members can view their companies" on public.companies
  for select to authenticated
  using (public.is_company_member(id, auth.uid()));
create policy "Authenticated users can create companies" on public.companies
  for insert to authenticated
  with check (created_by = auth.uid());
create policy "Owners can update their companies" on public.companies
  for update to authenticated
  using (public.has_company_role(id, auth.uid(), array['owner','admin']::public.company_role[]));
create policy "Only owner can delete" on public.companies
  for delete to authenticated
  using (public.has_company_role(id, auth.uid(), array['owner']::public.company_role[]));

-- company_members
create policy "Members can view members of their companies" on public.company_members
  for select to authenticated
  using (public.is_company_member(company_id, auth.uid()));
create policy "Owners/admins can add members" on public.company_members
  for insert to authenticated
  with check (
    public.has_company_role(company_id, auth.uid(), array['owner','admin']::public.company_role[])
    -- allow self-insert when accepting invite (handled via trigger using service role)
    or user_id = auth.uid()
  );
create policy "Owners/admins can update members" on public.company_members
  for update to authenticated
  using (public.has_company_role(company_id, auth.uid(), array['owner','admin']::public.company_role[]));
create policy "Owners/admins can remove members" on public.company_members
  for delete to authenticated
  using (public.has_company_role(company_id, auth.uid(), array['owner','admin']::public.company_role[]) and role <> 'owner');

-- company_invites
create policy "Members can view invites of their companies" on public.company_invites
  for select to authenticated
  using (public.is_company_member(company_id, auth.uid()));
create policy "Owners/admins can create invites" on public.company_invites
  for insert to authenticated
  with check (public.has_company_role(company_id, auth.uid(), array['owner','admin']::public.company_role[]));
create policy "Owners/admins can delete invites" on public.company_invites
  for delete to authenticated
  using (public.has_company_role(company_id, auth.uid(), array['owner','admin']::public.company_role[]));

-- Generic policies factory for financial tables
do $$
declare
  t text;
begin
  foreach t in array array['income','expenses','client_recoverables','invoices','tools_subscriptions','company_activity']
  loop
    execute format($f$
      create policy "Members can view %1$s" on public.%1$I
        for select to authenticated
        using (public.is_company_member(company_id, auth.uid()));
    $f$, t);
    execute format($f$
      create policy "Editors+ can insert %1$s" on public.%1$I
        for insert to authenticated
        with check (public.has_company_role(company_id, auth.uid(), array['owner','admin','editor']::public.company_role[]));
    $f$, t);
    execute format($f$
      create policy "Editors+ can update %1$s" on public.%1$I
        for update to authenticated
        using (public.has_company_role(company_id, auth.uid(), array['owner','admin','editor']::public.company_role[]));
    $f$, t);
    execute format($f$
      create policy "Editors+ can delete %1$s" on public.%1$I
        for delete to authenticated
        using (public.has_company_role(company_id, auth.uid(), array['owner','admin','editor']::public.company_role[]));
    $f$, t);
  end loop;
end$$;

-- =========================================================================
-- TRIGGERS
-- =========================================================================
-- Auto-add creator as owner when a company is created
create or replace function public.handle_new_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  creator_name text;
begin
  select coalesce(raw_user_meta_data->>'display_name', email)
    into creator_name
    from auth.users where id = new.created_by;
  insert into public.company_members (company_id, user_id, role, display_name)
  values (new.id, new.created_by, 'owner', coalesce(creator_name, 'Owner'))
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_company_created
after insert on public.companies
for each row execute function public.handle_new_company();

-- When a user signs up, accept any pending invites matching their email
create or replace function public.handle_new_user_invites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  user_name text;
begin
  user_name := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1));
  for inv in
    select * from public.company_invites
    where lower(email) = lower(new.email) and accepted_at is null
  loop
    insert into public.company_members (company_id, user_id, role, display_name, invited_by)
    values (inv.company_id, new.id, inv.role, coalesce(inv.display_name, user_name), inv.invited_by)
    on conflict do nothing;
    update public.company_invites set accepted_at = now() where id = inv.id;
  end loop;
  return new;
end;
$$;

create trigger on_auth_user_created_accept_invites
after insert on auth.users
for each row execute function public.handle_new_user_invites();
