-- Run this in your Supabase SQL editor to set up the schema

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_size integer not null,
  file_path text,                  -- path in Supabase Storage
  status text not null default 'processing'
    check (status in ('processing', 'extracted', 'reviewed', 'exported')),
  completion_pct integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoice_fields (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  field_key text not null,
  field_value text,
  confidence text check (confidence in ('high', 'med', 'low')),
  source text not null default 'ai'   -- 'ai' | 'manual'
    check (source in ('ai', 'manual')),
  updated_at timestamptz not null default now(),
  unique (invoice_id, field_key)
);

create table if not exists exports (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  payload jsonb not null,
  exported_at timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger invoices_updated_at before update on invoices
  for each row execute procedure update_updated_at();

create trigger invoice_fields_updated_at before update on invoice_fields
  for each row execute procedure update_updated_at();

-- Storage bucket for invoice files
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict do nothing;

-- RLS (enable when you add auth; for demo leave off)
-- alter table invoices enable row level security;
-- alter table invoice_fields enable row level security;
-- alter table exports enable row level security;
