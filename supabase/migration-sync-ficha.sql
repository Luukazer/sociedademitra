-- Migração ADITIVA e segura para rodar mais de uma vez.
-- Não altera tabelas nem apaga dados. Só cria duas funções usadas pelo servidor:
--  1) adjust_live_by_token : soma/subtrai Dano ou Pressão de forma ATÔMICA (sem perder cliques simultâneos)
--  2) patch_sheet_data     : grava só os campos alterados da ficha (um jogador não sobrescreve o outro)
-- Cole no SQL Editor do Supabase e execute.

create or replace function public.adjust_live_by_token(p_token text, p_stat text, p_delta int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_row public.sheet_live;
  v_delta int := greatest(-9999, least(coalesce(p_delta, 0), 9999));
begin
  select id into v_id from public.sheets where token = p_token;
  if v_id is null then
    raise exception 'sheet_not_found';
  end if;

  insert into public.sheet_live (sheet_id) values (v_id) on conflict (sheet_id) do nothing;

  if p_stat = 'dano' then
    update public.sheet_live
       set dano_atual = greatest(0, least(dano_atual + v_delta, dano_total))
     where sheet_id = v_id
     returning * into v_row;
  elsif p_stat = 'pressao' then
    update public.sheet_live
       set pressao_atual = greatest(0, least(pressao_atual + v_delta, pressao_total))
     where sheet_id = v_id
     returning * into v_row;
  else
    raise exception 'invalid_stat';
  end if;

  return jsonb_build_object(
    'dano_atual', v_row.dano_atual,
    'dano_total', v_row.dano_total,
    'pressao_atual', v_row.pressao_atual,
    'pressao_total', v_row.pressao_total,
    'last_roll', v_row.last_roll
  );
end;
$$;

create or replace function public.patch_sheet_data(p_token text, p_changes jsonb, p_title text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_data jsonb;
  c jsonb;
  v_path text[];
begin
  -- trava a linha: dois jogadores salvando ao mesmo tempo entram na fila e um não apaga o outro
  select id, data into v_id, v_data from public.sheets where token = p_token for update;
  if v_id is null then
    raise exception 'sheet_not_found';
  end if;

  if jsonb_typeof(p_changes) = 'array' then
    for c in select value from jsonb_array_elements(p_changes) loop
      v_path := array(select jsonb_array_elements_text(c -> 'path'));
      if array_length(v_path, 1) is null or array_length(v_path, 1) > 2 then
        continue;
      end if;
      if array_length(v_path, 1) = 2 and jsonb_typeof(v_data -> v_path[1]) is distinct from 'object' then
        v_data := jsonb_set(v_data, array[v_path[1]], '{}'::jsonb, true);
      end if;
      v_data := jsonb_set(v_data, v_path, coalesce(c -> 'value', 'null'::jsonb), true);
    end loop;
  end if;

  update public.sheets
     set data = v_data,
         title = coalesce(nullif(left(btrim(p_title), 120), ''), title)
   where id = v_id;

  return v_data;
end;
$$;

-- Só o servidor (service role) pode chamar estas funções.
revoke all on function public.adjust_live_by_token(text, text, int) from public, anon, authenticated;
revoke all on function public.patch_sheet_data(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.adjust_live_by_token(text, text, int) to service_role;
grant execute on function public.patch_sheet_data(text, jsonb, text) to service_role;
