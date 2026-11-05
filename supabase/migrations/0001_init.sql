-- Tabelas da prancheta, sem autenticação.
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 40),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index teams_name_lower_key on public.teams (lower(name));

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 80),
  number smallint check (number between 0 and 99),
  position text not null check (char_length(position) between 1 and 10),
  nickname text check (char_length(nickname) <= 40),
  is_starter boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index players_team_sort_order_idx on public.players (team_id, sort_order);

create table public.formations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 40),
  slots jsonb not null check (jsonb_typeof(slots) = 'array' and jsonb_array_length(slots) = 11),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index formations_name_lower_key on public.formations (lower(name));

-- Mantém a data de alteração nas entidades editáveis.
create function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger teams_updated_at before update on public.teams
for each row execute function public.set_updated_at();
create trigger formations_updated_at before update on public.formations
for each row execute function public.set_updated_at();

-- Substitui o elenco inteiro de forma atômica.
create function public.import_team(p_name text, p_color text, p_players jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_team_id uuid;
begin
  if p_players is null or jsonb_typeof(p_players) <> 'array' then
    raise exception 'A lista de jogadores deve ser um array.';
  end if;
  select id into v_team_id from public.teams
    where lower(name) = lower(btrim(p_name)) for update;
  if found then
    update public.teams set color = p_color, updated_at = now() where id = v_team_id;
    delete from public.players where team_id = v_team_id;
  else
    insert into public.teams (name, color) values (btrim(p_name), p_color)
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
grant execute on function public.import_team(text, text, jsonb) to anon, authenticated;

-- Acesso público intencional para o aplicativo pessoal.
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.formations enable row level security;
create policy teams_public_access on public.teams for all to anon, authenticated using (true) with check (true);
create policy players_public_access on public.players for all to anon, authenticated using (true) with check (true);
create policy formations_public_access on public.formations for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.teams, public.players, public.formations to anon, authenticated;
