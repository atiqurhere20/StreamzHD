-- Create collections table
create table if not exists public.collections (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Create collection_channels junction table
create table if not exists public.collection_channels (
  collection_id uuid not null references public.collections(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (collection_id, channel_id)
);

-- Enable RLS
alter table public.collections enable row level security;
alter table public.collection_channels enable row level security;

-- Public read policies
create policy "Public read collections" 
  on public.collections for select 
  using (is_active = true);

create policy "Public read collection_channels" 
  on public.collection_channels for select 
  using (true);

-- Admin write policies
create policy "Admins can do all on collections"
  on public.collections for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can do all on collection_channels"
  on public.collection_channels for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Seed default settings keys
insert into public.settings (key, value)
values ('telegram_url', 'https://t.me/streamzhd')
on conflict (key) do nothing;
