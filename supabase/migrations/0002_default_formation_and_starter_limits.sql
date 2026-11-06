-- Formação padrão do time: id de uma formação fixa ('4-3-3') ou o uuid de uma customizada.
-- Sem chave estrangeira: as fixas não estão no banco. Id que não existe mais cai na 4-3-3 no aplicativo.
alter table public.teams
  add column default_formation text not null default '4-3-3'
  check (char_length(default_formation) between 1 and 40);

-- No máximo 11 titulares por time, com um só goleiro entre eles.
create function public.check_starter_limits() returns trigger
language plpgsql set search_path = public as $$
begin
  if not new.is_starter then
    return new;
  end if;
  -- Serializa as alterações do mesmo time, para duas abas não passarem do limite ao mesmo tempo.
  perform 1 from public.teams where id = new.team_id for update;
  if new.position = 'GOL' and exists (
    select 1 from public.players
    where team_id = new.team_id and is_starter and position = 'GOL' and id <> new.id
  ) then
    raise exception 'Este time já tem um goleiro titular. Tire-o dos titulares antes de escolher outro.';
  end if;
  if (
    select count(*) from public.players
    where team_id = new.team_id and is_starter and id <> new.id
  ) >= 11 then
    raise exception 'Este time já tem 11 titulares. Tire um dos titulares antes de adicionar outro.';
  end if;
  return new;
end;
$$;
create trigger players_starter_limits before insert or update on public.players
for each row execute function public.check_starter_limits();
