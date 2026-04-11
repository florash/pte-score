-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  question_type text not null,
  question_text text,
  score numeric,
  completed_at timestamptz not null default now(),
  duration_seconds integer,
  transcript text,
  ai_feedback text
);

alter table public.practice_attempts enable row level security;

create policy "Users can insert their own attempts"
on public.practice_attempts
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can view their own attempts"
on public.practice_attempts
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can update their own attempts"
on public.practice_attempts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own attempts"
on public.practice_attempts
for delete
to authenticated
using (auth.uid() = user_id);
