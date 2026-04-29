alter table if exists public.guides add column if not exists user_id uuid references auth.users(id);

create table if not exists public.guide_trip_costs (
  id uuid default gen_random_uuid() primary key,
  proposal_id uuid references public.proposals(id) on delete cascade not null,
  guide_id uuid references public.guides(id) on delete cascade not null,
  description text not null,
  amount numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.guide_trip_costs enable row level security;

create policy "Guides and admins can view guide trip costs"
  on public.guide_trip_costs
  for select
  using (
    auth.uid() in (select user_id from public.guides where id = guide_trip_costs.guide_id)
    or public.has_role(auth.uid(), 'admin')
  );

create policy "Guides and admins can insert guide trip costs"
  on public.guide_trip_costs
  for insert
  with check (
    auth.uid() in (select user_id from public.guides where id = guide_trip_costs.guide_id)
    or public.has_role(auth.uid(), 'admin')
  );

create policy "Guides and admins can update guide trip costs"
  on public.guide_trip_costs
  for update
  using (
    auth.uid() in (select user_id from public.guides where id = guide_trip_costs.guide_id)
    or public.has_role(auth.uid(), 'admin')
  );

create policy "Guides and admins can delete guide trip costs"
  on public.guide_trip_costs
  for delete
  using (
    auth.uid() in (select user_id from public.guides where id = guide_trip_costs.guide_id)
    or public.has_role(auth.uid(), 'admin')
  );
