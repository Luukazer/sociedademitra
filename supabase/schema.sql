-- Cole este arquivo no SQL Editor do Supabase.
-- Depois crie um usuário em Authentication > Users para o mestre.

create extension if not exists pgcrypto;

create table if not exists public.sheets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  title text not null default 'Nova ficha',
  data jsonb not null default '{}'::jsonb,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sheets_owner_id_idx on public.sheets(owner_id);
create index if not exists sheets_token_idx on public.sheets(token);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sheets_updated_at on public.sheets;
create trigger sheets_updated_at
before update on public.sheets
for each row execute function public.set_updated_at();

alter table public.sheets enable row level security;

drop policy if exists "master can read own sheets" on public.sheets;
create policy "master can read own sheets"
on public.sheets for select to authenticated
using (auth.uid() = owner_id);

drop policy if exists "master can insert own sheets" on public.sheets;
create policy "master can insert own sheets"
on public.sheets for insert to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "master can update own sheets" on public.sheets;
create policy "master can update own sheets"
on public.sheets for update to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "master can delete own sheets" on public.sheets;
create policy "master can delete own sheets"
on public.sheets for delete to authenticated
using (auth.uid() = owner_id);

-- Bucket para imagens. A aplicação envia as imagens pelo servidor usando service role.
insert into storage.buckets (id, name, public)
values ('character-images', 'character-images', true)
on conflict (id) do update set public = true;
