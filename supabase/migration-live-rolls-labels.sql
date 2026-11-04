-- Migração ADITIVA (não altera nem apaga nada de public.sheets).
-- Cole no SQL Editor do Supabase. Pode ser executada mais de uma vez.

-- 1) Estado ao vivo por ficha: Índice de Dano, Pressão e última rolagem (lido pelo OBS em tempo real)
create table if not exists public.sheet_live (
  sheet_id uuid primary key references public.sheets(id) on delete cascade,
  dano_atual int not null default 0,
  dano_total int not null default 0,
  pressao_atual int not null default 0,
  pressao_total int not null default 0,
  last_roll jsonb,
  updated_at timestamptz not null default now()
);

alter table public.sheet_live enable row level security;

-- O OBS usa a chave pública (anon). Leitura liberada; escrita só pelo servidor (service role).
-- Esta tabela NÃO contém o token de edição da ficha, apenas números e a última rolagem.
drop policy if exists "live is readable" on public.sheet_live;
create policy "live is readable" on public.sheet_live
  for select to anon, authenticated using (true);

drop trigger if exists sheet_live_updated_at on public.sheet_live;
create trigger sheet_live_updated_at
before update on public.sheet_live
for each row execute function public.set_updated_at();

-- 2) Histórico de rolagens (somente servidor / service role)
create table if not exists public.roll_history (
  id bigint generated always as identity primary key,
  sheet_id uuid not null references public.sheets(id) on delete cascade,
  results int[] not null,
  successes int not null,
  alignment text not null,
  ordem3 boolean not null default false,
  vantagem boolean not null default false,
  desvantagem boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists roll_history_sheet_idx on public.roll_history(sheet_id, created_at desc);
alter table public.roll_history enable row level security;

-- 3) Nomenclatura editável pelo Mestre (rótulos exibidos na ficha)
create table if not exists public.campaign_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  labels jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.campaign_settings enable row level security;

drop policy if exists "master reads own settings" on public.campaign_settings;
create policy "master reads own settings" on public.campaign_settings
  for select to authenticated using (auth.uid() = owner_id);

drop policy if exists "master writes own settings" on public.campaign_settings;
create policy "master writes own settings" on public.campaign_settings
  for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- 4) Realtime para o OBS (sheet_live)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sheet_live'
  ) then
    alter publication supabase_realtime add table public.sheet_live;
  end if;
end $$;
