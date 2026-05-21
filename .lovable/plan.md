# RevenueX Financial Command Center — Build Plan

A multi-company finance app for Indian agency founders. Users sign up, create companies, invite partners by email, and switch between companies like Slack workspaces. Every row is scoped to a `company_id` and protected by Supabase RLS so partners never see companies they aren't members of.

> Note on stack: the project template is **TanStack Start + TanStack Router** (not React Router v6 + Vite-only React). I'll keep React 18, TypeScript, Tailwind, shadcn/ui, Recharts, Lucide, and Supabase as requested, and use TanStack Router for navigation instead of React Router v6 (same mental model, file-based routes). Everything else in your spec is followed exactly.

## 1. Backend (Lovable Cloud / Supabase)

Enable Lovable Cloud, then create via migration:

**Tables** (all with `company_id` FK + `added_by` FK to `auth.users`):
- `companies` (id, name, created_by, financial_year, currency, created_at)
- `company_members` (company_id, user_id, role enum: owner/admin/editor/viewer, display_name, invited_by, joined_at; UNIQUE(company_id, user_id))
- `company_invites` (company_id, email, role, invited_by, token, accepted_at) — for inviting users who haven't signed up yet
- `income`, `expenses`, `client_recoverables`, `invoices`, `tools_subscriptions` — fields exactly per spec
- `company_activity` (company_id, user_id, action, details jsonb, created_at)

**RLS** — every data table:
```sql
USING (EXISTS (SELECT 1 FROM company_members
  WHERE company_id = <table>.company_id AND user_id = auth.uid()))
```
Plus a `SECURITY DEFINER` helper `is_company_member(_company_id, _user_id)` and `has_company_role(_company_id, _user_id, _role)` to avoid recursive RLS on `company_members` itself. Owner-only delete on `companies`; owner/admin-only writes on `company_members`.

**Trigger**: on signup, auto-accept any pending `company_invites` rows matching the user's email → insert into `company_members`.

**Auth**: email/password (default per Lovable Cloud guidelines). Onboarding screen creates first company + owner membership.

## 2. App shell

- `CompanyProvider` (React context): `currentCompany`, `companies[]`, `currentUserRole`, `switchCompany()`, `financialYear`, `setFinancialYear`. Persists selection to localStorage. All data hooks read `currentCompany.id` and pass it as a filter — switching companies invalidates React Query keys and refetches.
- Sidebar (desktop) / bottom tab bar (mobile) with the 8 nav items + Settings + user menu.
- Company switcher dropdown at top of sidebar showing role badges; hidden when user has only 1 company. "+ Create new company" at bottom.
- FY selector under company name.
- Role-based UI: hide add/edit/delete controls when `currentUserRole === 'viewer'`.
- Toasts via sonner. Confirm dialogs via shadcn AlertDialog.

## 3. Pages

Each page renders a colored hint box at the top (per spec), an add form (where applicable), metric cards, and a searchable/filterable table with "Added by" / "Paid by" avatar columns.

1. **Overview** — 4 metric cards (Revenue, Net profit, Margin, Owed), monthly revenue-vs-profit grouped bar chart (Apr–Mar), team activity feed (last 10 entries) when 2+ members, welcome card when empty.
2. **Income** — form + table, filter by month, export CSV.
3. **Expenses** — form with "Who paid?" dropdown from company members, table, plus "Founder/Partner Withdrawals Summary" cards (one per member, sum of `category = 'Founder salary'`).
4. **Client spend (recoverables)** — 3 status metric cards + dynamic per-member "X is owed" cards, status pills with one-click change, filter tabs (All/Pending/Recovered/Written off).
5. **Invoices** — 3 metric cards, days-overdue color coding (gray/amber/red).
6. **Tools & SaaS** — 3 metric cards + donut chart of spend by category.
7. **Monthly P&L** — 12-month grid auto-calculated from other tables, founder withdrawal sub-rows per member, line chart of revenue + profit trend.
8. **Health check** — 8 metric cards with thresholds per spec (Partner Withdrawal Balance only shown when 2+ members). "Copy AI advice prompt" button generates a plain-text summary.

## 4. Company Settings (3 tabs)

- **General**: edit name, FY, danger-zone delete (type company name to confirm, owner only).
- **Team Members**: list with role dropdown + remove (owner/admin), "Invite member" modal (email + role) → writes to `company_invites` and sends notice (toast for now; email can be added later via the email infra tool if you want).
- **Activity Log**: reads from `company_activity`.

## 5. Design system

White surfaces, emerald primary (#0D9668), rose danger (#D6304A), amber warning, blue info, purple for partner UI. Tokens added to `src/styles.css` as semantic CSS variables (no hard-coded colors in components). All money formatted via `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })` in a `formatINR()` util.

## 6. Build order

1. Enable Lovable Cloud + run schema migration with RLS + invite trigger.
2. Auth pages (signup/login) + onboarding (create first company).
3. App shell: CompanyProvider, sidebar with company switcher, FY selector, mobile tab bar.
4. Income page (template for all CRUD pages) → Expenses → Recoverables → Invoices → Tools.
5. Overview, Monthly P&L, Health Check (read-only aggregations).
6. Company Settings (General, Members + invites, Activity).
7. CSV export util, empty states, viewer-role gating, polish.

## Technical notes (for reference)

- Data fetching: TanStack Query with query keys `[resource, companyId, financialYear]` so company switching auto-refetches.
- Activity log writes happen in the same mutation that writes the data row (client-side after success — acceptable since RLS prevents forgery of `company_id`).
- For invites to non-existent users: a DB trigger on `auth.users` insert checks `company_invites` by email and creates `company_members` rows automatically.
- `has_company_role` SECURITY DEFINER function avoids RLS recursion on `company_members`.
- All amounts stored as `numeric`, never floats.

Ready to build on approval.