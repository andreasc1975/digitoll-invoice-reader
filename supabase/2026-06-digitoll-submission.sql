-- Digitoll submission tracking per level (Transport / Master / House).
-- Run in the Supabase SQL editor. Safe to re-run (idempotent).

-- Submission state on every level: not_sent | sent | accepted | rejected
alter table transports add column if not exists digitoll_status text not null default 'not_sent';
alter table masters    add column if not exists digitoll_status text not null default 'not_sent';
alter table houses     add column if not exists digitoll_status text not null default 'not_sent';

-- MRN + timestamp (transports already has mrn/submitted_at from the submit flow)
alter table masters add column if not exists mrn          text;
alter table masters add column if not exists submitted_at timestamptz;
alter table houses  add column if not exists mrn          text;
alter table houses  add column if not exists submitted_at timestamptz;

-- Backfill: transports that were already "submitted" via the old status field
update transports
set digitoll_status = 'sent'
where digitoll_status = 'not_sent' and status in ('sent', 'received', 'accepted');
