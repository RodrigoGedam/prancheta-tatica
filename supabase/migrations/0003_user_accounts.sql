-- Preserva os times existentes como padrão antes de aplicar o default.
alter table public.teams add column user_id uuid references auth.users(id) on delete cascade;
alter table public.teams alter column user_id set default auth.uid();
alter table public.formations add column user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
drop index public.teams_name_lower_key;
drop index public.formations_name_lower_key;
create unique index teams_owner_name_key on public.teams (user_id, lower(name)) nulls not distinct;
create unique index formations_owner_name_key on public.formations (user_id, lower(name));
drop policy teams_public_access on public.teams;
create policy teams_select on public.teams for select to anon, authenticated using (user_id is null or user_id = (select auth.uid()));
create policy teams_insert on public.teams for insert to authenticated with check (user_id = (select auth.uid()));
create policy teams_update on public.teams for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy teams_delete on public.teams for delete to authenticated using (user_id = (select auth.uid()));
drop policy players_public_access on public.players;
create policy players_select on public.players for select to anon, authenticated using (exists (select 1 from public.teams t where t.id = team_id and (t.user_id is null or t.user_id = (select auth.uid()))));
create policy players_insert on public.players for insert to authenticated with check (exists (select 1 from public.teams t where t.id = team_id and t.user_id = (select auth.uid())));
create policy players_update on public.players for update to authenticated using (exists (select 1 from public.teams t where t.id = team_id and t.user_id = (select auth.uid()))) with check (exists (select 1 from public.teams t where t.id = team_id and t.user_id = (select auth.uid())));
create policy players_delete on public.players for delete to authenticated using (exists (select 1 from public.teams t where t.id = team_id and t.user_id = (select auth.uid())));
drop policy formations_public_access on public.formations;
create policy formations_select on public.formations for select to authenticated using (user_id = (select auth.uid()));
create policy formations_insert on public.formations for insert to authenticated with check (user_id = (select auth.uid()));
create policy formations_update on public.formations for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy formations_delete on public.formations for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.teams, public.players, public.formations from anon;
grant select on public.teams, public.players, public.formations to anon;
grant select, insert, update, delete on public.teams, public.players, public.formations to authenticated;
create or replace function public.import_team(p_name text, p_color text, p_players jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'É necessário entrar na conta.';
  end if;
  if p_players is null or jsonb_typeof(p_players) <> 'array' then
    raise exception 'A lista de jogadores deve ser um array.';
  end if;
  select id into v_team_id from public.teams
    where user_id = auth.uid() and lower(name) = lower(btrim(p_name)) for update;
  if found then
    update public.teams set color = p_color, updated_at = now() where id = v_team_id;
    delete from public.players where team_id = v_team_id;
  else
    insert into public.teams (name, color, user_id) values (btrim(p_name), p_color, auth.uid())
      returning id into v_team_id;
  end if;
  insert into public.players (team_id, name, number, position, nickname, is_starter, sort_order)
    select v_team_id, p.name, p.number, p.position, p.nickname, p.is_starter, (e.ordinality - 1)::integer
    from jsonb_array_elements(p_players) with ordinality as e(value, ordinality)
    cross join lateral jsonb_to_record(e.value) as p(
      name text, number smallint, position text, nickname text, is_starter boolean
    );
  return v_team_id;
end;
$$;

-- A carga administrativa escreve explicitamente o dono nulo.
create function public.import_system_team(p_name text, p_color text, p_players jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_team_id uuid;
begin
  if p_players is null or jsonb_typeof(p_players) <> 'array' then
    raise exception 'A lista de jogadores deve ser um array.';
  end if;
  select id into v_team_id from public.teams
    where user_id is null and lower(name) = lower(btrim(p_name)) for update;
  if found then
    update public.teams set color = p_color, updated_at = now() where id = v_team_id;
    delete from public.players where team_id = v_team_id;
  else
    insert into public.teams (name, color, user_id) values (btrim(p_name), p_color, null)
      returning id into v_team_id;
  end if;
  insert into public.players (team_id, name, number, position, nickname, is_starter, sort_order)
    select v_team_id, p.name, p.number, p.position, p.nickname, p.is_starter, (e.ordinality - 1)::integer
    from jsonb_array_elements(p_players) with ordinality as e(value, ordinality)
    cross join lateral jsonb_to_record(e.value) as p(
      name text, number smallint, position text, nickname text, is_starter boolean
    );
  return v_team_id;
end;
$$;

create function public.copy_team(p_team_id uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_source public.teams%rowtype;
  v_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'É necessário entrar na conta.';
  end if;
  select * into v_source from public.teams where id = p_team_id;
  if not found then
    raise exception 'Time não encontrado.';
  end if;
  insert into public.teams (name, color, default_formation, user_id)
    values (v_source.name, v_source.color, v_source.default_formation, auth.uid())
    returning id into v_team_id;
  insert into public.players (team_id, name, number, position, nickname, is_starter, sort_order)
    select v_team_id, name, number, position, nickname, is_starter, sort_order
    from public.players where team_id = p_team_id;
  return v_team_id;
end;
$$;

create function public.delete_own_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'É necessário entrar na conta.';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke execute on function public.import_team(text, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.import_team(text, text, jsonb) to authenticated;
revoke execute on function public.import_system_team(text, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.import_system_team(text, text, jsonb) to service_role;
revoke execute on function public.copy_team(uuid) from public, anon, authenticated, service_role;
grant execute on function public.copy_team(uuid) to authenticated;
revoke execute on function public.delete_own_account() from public, anon, authenticated, service_role;
grant execute on function public.delete_own_account() to authenticated;
