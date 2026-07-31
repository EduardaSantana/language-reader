-- Run once against your Neon database (Neon console -> SQL Editor).
-- The companion-chat serverless function also creates these
-- idempotently on first call, so running this manually is optional —
-- it's here for a fast, explicit setup and as the source of truth.

create extension if not exists pgcrypto;

create table if not exists companion_sessions (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  lang text not null,
  created_at timestamptz default now()
);

create table if not exists companion_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references companion_sessions(id),
  role text not null,          -- 'user' or 'companion'
  content text not null,
  context jsonb,               -- the context object, if any
  created_at timestamptz default now()
);
