-- Executar como superusuário, depois das migrations 0001 a 0003.
begin;
insert into auth.users (id,aud,role,email) values ('a0000000-0000-4000-8000-000000000001','authenticated','authenticated','campinho-access-a@example.invalid'), ('b0000000-0000-4000-8000-000000000002','authenticated','authenticated','campinho-access-b@example.invalid');
insert into public.teams (id,name,color,user_id,default_formation) values ('c0000000-0000-4000-8000-000000000001','Teste acesso padrão','#112233',null,'4-4-2'), ('c0000000-0000-4000-8000-000000000003','Teste acesso padrão','#223344','b0000000-0000-4000-8000-000000000002','4-3-3');
insert into public.players (id,team_id,name,number,position,nickname,is_starter,sort_order) values ('d0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','Padrão',1,'GOL','Teste',true,7), ('d0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000003','Privado B',2,'ZAG',null,false,3);
insert into public.formations (id,name,slots,user_id) values ('e0000000-0000-4000-8000-000000000002','Teste B','[null,null,null,null,null,null,null,null,null,null,null]'::jsonb,'b0000000-0000-4000-8000-000000000002');
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
insert into public.teams (id,name,color) values ('c0000000-0000-4000-8000-000000000002','Teste acesso padrão','#334455');
insert into public.players (id,team_id,name,position) values ('d0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002','Privado A','ZAG');
insert into public.formations (id,name,slots) values ('e0000000-0000-4000-8000-000000000001','Teste A','[null,null,null,null,null,null,null,null,null,null,null]'::jsonb);
do $$ begin if (exists(select 1 from public.teams where id='c0000000-0000-4000-8000-000000000002' and user_id='a0000000-0000-4000-8000-000000000001') and exists(select 1 from public.players where id='d0000000-0000-4000-8000-000000000002') and exists(select 1 from public.formations where id='e0000000-0000-4000-8000-000000000001' and user_id='a0000000-0000-4000-8000-000000000001')) is distinct from true then raise exception 'Falhou: A cria e lê dados próprios'; end if; end $$;
reset role;
select set_config('request.jwt.claims', '{}', true);
set local role anon;
do $$ begin if (exists(select 1 from public.teams where id='c0000000-0000-4000-8000-000000000001') and exists(select 1 from public.players where id='d0000000-0000-4000-8000-000000000001')) is distinct from true then raise exception 'Falhou: visitante lê padrão'; end if; end $$;
do $$ begin if (not exists(select 1 from public.teams where id in ('c0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000003')) and not exists(select 1 from public.players where id in ('d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000003')) and (select count(*) from public.formations)=0) is distinct from true then raise exception 'Falhou: visitante não lê privados'; end if; end $$;
do $$ begin
  begin
    insert into public.teams (name,color) values ('Proibido','#112233');
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: visitante não escreve teams';
end $$;
do $$ begin
  begin
    update public.teams set color='#ffffff';
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: visitante não escreve teams';
end $$;
do $$ begin
  begin
    delete from public.teams;
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: visitante não escreve teams';
end $$;
do $$ begin
  begin
    insert into public.players (team_id,name,position) values ('c0000000-0000-4000-8000-000000000001','Proibido','ZAG');
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: visitante não escreve players';
end $$;
do $$ begin
  begin
    update public.players set name='Proibido';
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: visitante não escreve players';
end $$;
do $$ begin
  begin
    delete from public.players;
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: visitante não escreve players';
end $$;
do $$ begin
  begin
    insert into public.formations (name,slots) values ('Proibido','[null,null,null,null,null,null,null,null,null,null,null]'::jsonb);
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: visitante não escreve formations';
end $$;
do $$ begin
  begin
    update public.formations set name='Proibido';
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: visitante não escreve formations';
end $$;
do $$ begin
  begin
    delete from public.formations;
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: visitante não escreve formations';
end $$;
do $$ begin
  begin
    perform public.import_team('Proibido','#112233','[]');
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: visitante não executa função';
end $$;
do $$ begin
  begin
    perform public.import_system_team('Proibido','#112233','[]');
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: visitante não executa função';
end $$;
do $$ begin
  begin
    perform public.copy_team('c0000000-0000-4000-8000-000000000001');
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: visitante não executa função';
end $$;
do $$ begin
  begin
    perform public.delete_own_account();
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: visitante não executa função';
end $$;
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$ begin if (not exists(select 1 from public.teams where id='c0000000-0000-4000-8000-000000000003') and not exists(select 1 from public.players where id='d0000000-0000-4000-8000-000000000003') and not exists(select 1 from public.formations where id='e0000000-0000-4000-8000-000000000002')) is distinct from true then raise exception 'Falhou: A não lê B'; end if; end $$;
do $$ declare n bigint; begin update public.teams set color='#ffffff' where id='c0000000-0000-4000-8000-000000000003'; get diagnostics n = row_count; if n <> 0 then raise exception 'Falhou: A não altera alheios'; end if; end $$;
do $$ declare n bigint; begin delete from public.teams where id='c0000000-0000-4000-8000-000000000003'; get diagnostics n = row_count; if n <> 0 then raise exception 'Falhou: A não apaga alheios'; end if; end $$;
do $$ declare n bigint; begin update public.teams set color='#ffffff' where id='c0000000-0000-4000-8000-000000000001'; get diagnostics n = row_count; if n <> 0 then raise exception 'Falhou: A não altera alheios'; end if; end $$;
do $$ declare n bigint; begin delete from public.teams where id='c0000000-0000-4000-8000-000000000001'; get diagnostics n = row_count; if n <> 0 then raise exception 'Falhou: A não apaga alheios'; end if; end $$;
do $$ declare n bigint; begin update public.players set name='Proibido' where id='d0000000-0000-4000-8000-000000000003'; get diagnostics n = row_count; if n <> 0 then raise exception 'Falhou: A não altera alheios'; end if; end $$;
do $$ declare n bigint; begin delete from public.players where id='d0000000-0000-4000-8000-000000000003'; get diagnostics n = row_count; if n <> 0 then raise exception 'Falhou: A não apaga alheios'; end if; end $$;
do $$ declare n bigint; begin update public.players set name='Proibido' where id='d0000000-0000-4000-8000-000000000001'; get diagnostics n = row_count; if n <> 0 then raise exception 'Falhou: A não altera alheios'; end if; end $$;
do $$ declare n bigint; begin delete from public.players where id='d0000000-0000-4000-8000-000000000001'; get diagnostics n = row_count; if n <> 0 then raise exception 'Falhou: A não apaga alheios'; end if; end $$;
do $$ declare n bigint; begin update public.formations set name='Proibido' where id='e0000000-0000-4000-8000-000000000002'; get diagnostics n = row_count; if n <> 0 then raise exception 'Falhou: A não altera alheios'; end if; end $$;
do $$ declare n bigint; begin delete from public.formations where id='e0000000-0000-4000-8000-000000000002'; get diagnostics n = row_count; if n <> 0 then raise exception 'Falhou: A não apaga alheios'; end if; end $$;
do $$ begin
  begin
    update public.teams set user_id='b0000000-0000-4000-8000-000000000002' where id='c0000000-0000-4000-8000-000000000002';
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: A não troca dono';
end $$;
do $$ begin
  begin
    insert into public.teams (name,color,user_id) values ('Proibido','#112233','b0000000-0000-4000-8000-000000000002');
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: A não insere para outro dono';
end $$;
do $$ begin
  begin
    update public.teams set user_id=null where id='c0000000-0000-4000-8000-000000000002';
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: A não troca dono';
end $$;
do $$ begin
  begin
    insert into public.teams (name,color,user_id) values ('Proibido','#112233',null);
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: A não insere para outro dono';
end $$;
do $$ begin
  begin
    update public.players set team_id='c0000000-0000-4000-8000-000000000003' where id='d0000000-0000-4000-8000-000000000002';
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: A não move jogador para outro dono';
end $$;
do $$ begin
  begin
    update public.players set team_id='c0000000-0000-4000-8000-000000000001' where id='d0000000-0000-4000-8000-000000000002';
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: A não move jogador para outro dono';
end $$;
do $$ begin
  begin
    insert into public.teams (name,color) values ('TESTE ACESSO PADRÃO','#112233');
  exception when sqlstate '23505' then

    return;
  end;
  raise exception 'Falhou: nome único por dono sem diferenciar caixa';
end $$;
do $$ begin
  begin
    perform public.import_system_team('Proibido','#112233','[]');
  exception when sqlstate '42501' then

    return;
  end;
  raise exception 'Falhou: A não importa padrão';
end $$;
insert into public.teams (name,color) values ('Teste importação','#445566');
reset role;
insert into public.teams (name,color,user_id) values ('Teste importação','#112233',null), ('Teste importação','#223344','b0000000-0000-4000-8000-000000000002');
insert into public.players (team_id,name,position) select id,'Preservado','ZAG' from public.teams where name='Teste importação';
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
delete from public.teams where name='Teste importação';
select public.import_team('Teste importação','#abcdef','[{"name":"Primeiro","position":"ZAG","is_starter":false}]');
do $$ begin if (exists(select 1 from public.teams where name='Teste importação' and user_id='a0000000-0000-4000-8000-000000000001' and color='#abcdef')) is distinct from true then raise exception 'Falhou: importação cria para A'; end if; end $$;
select public.import_team('Teste importação','#fedcba','[{"name":"Segundo","position":"MC","is_starter":false},{"name":"Terceiro","position":"ATA","is_starter":false}]');
do $$ begin if ((select count(*) from public.players p join public.teams t on t.id=p.team_id where t.name='Teste importação' and t.user_id='a0000000-0000-4000-8000-000000000001')=2 and not exists(select 1 from public.players where name='Primeiro')) is distinct from true then raise exception 'Falhou: reimportação substitui elenco próprio'; end if; end $$;
reset role;
do $$ begin if ((select count(*) from public.players p join public.teams t on t.id=p.team_id where t.name='Teste importação' and (t.user_id is null or t.user_id='b0000000-0000-4000-8000-000000000002') and p.name='Preservado')=2 and (select count(*) from public.teams where name='Teste importação' and color in ('#112233','#223344'))=2) is distinct from true then raise exception 'Falhou: importação preserva padrão e B'; end if; end $$;
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
delete from public.teams where id='c0000000-0000-4000-8000-000000000002';
select public.copy_team('c0000000-0000-4000-8000-000000000001');
do $$ begin if (exists(select 1 from public.teams where name='Teste acesso padrão' and user_id='a0000000-0000-4000-8000-000000000001' and default_formation='4-4-2' and color='#112233') and (select count(*) from public.players p join public.teams t on t.id=p.team_id where t.user_id='a0000000-0000-4000-8000-000000000001' and t.name='Teste acesso padrão')=1 and exists(select 1 from public.players p join public.teams t on t.id=p.team_id where t.user_id='a0000000-0000-4000-8000-000000000001' and p.name='Padrão' and p.number=1 and p.position='GOL' and p.nickname='Teste' and p.is_starter and p.sort_order=7)) is distinct from true then raise exception 'Falhou: cópia preserva elenco e formação'; end if; end $$;
do $$ begin
  begin
    perform public.copy_team('c0000000-0000-4000-8000-000000000001');
  exception when sqlstate '23505' then

    return;
  end;
  raise exception 'Falhou: cópia repetida';
end $$;
do $$ begin
  begin
    perform public.copy_team('c0000000-0000-4000-8000-000000000003');
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Time não encontrado.' then raise; end if;
    return;
  end;
  raise exception 'Falhou: cópia de B invisível';
end $$;
insert into public.players (team_id,name,position,is_starter) select t.id,'Titular ' || n,'ZAG',true from public.teams t cross join generate_series(1,10) n where t.user_id='a0000000-0000-4000-8000-000000000001' and t.name='Teste acesso padrão';
do $$ begin
  begin
    insert into public.players (team_id,name,position,is_starter) select id,'Excedente','ZAG',true from public.teams where user_id='a0000000-0000-4000-8000-000000000001' and name='Teste acesso padrão';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Este time já tem 11 titulares. Tire um dos titulares antes de adicionar outro.' then raise; end if;
    return;
  end;
  raise exception 'Falhou: 12º titular recusado';
end $$;
do $$ begin if ((select count(*) from public.players p join public.teams t on t.id=p.team_id where t.user_id='a0000000-0000-4000-8000-000000000001' and t.name='Teste acesso padrão' and p.is_starter)=11) is distinct from true then raise exception 'Falhou: gatilho conserva onze titulares'; end if; end $$;
reset role;
create temporary table access_owned_teams as select id from public.teams where user_id='a0000000-0000-4000-8000-000000000001';
create temporary table access_owned_players as select p.id from public.players p join access_owned_teams t on t.id=p.team_id;
reset role;
select set_config('request.jwt.claims', '{}', true);
set local role authenticated;
do $$ begin
  begin
    perform public.delete_own_account();
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'É necessário entrar na conta.' then raise; end if;
    return;
  end;
  raise exception 'Falhou: exclusão sem claims';
end $$;
do $$ begin
  begin
    perform public.import_team('Sem conta','#112233','[]');
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'É necessário entrar na conta.' then raise; end if;
    return;
  end;
  raise exception 'Falhou: importação sem claims';
end $$;
reset role;
do $$ begin if ((select count(*) from auth.users where id in ('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002'))=2 and (select count(*) from public.teams where user_id='a0000000-0000-4000-8000-000000000001')=(select count(*) from access_owned_teams)) is distinct from true then raise exception 'Falhou: sem claims não apaga nada'; end if; end $$;
reset role;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.delete_own_account();
reset role;
do $$ begin if (not exists(select 1 from auth.users where id='a0000000-0000-4000-8000-000000000001') and not exists(select 1 from public.teams where user_id='a0000000-0000-4000-8000-000000000001') and not exists(select 1 from public.players where id in (select id from access_owned_players)) and not exists(select 1 from public.formations where user_id='a0000000-0000-4000-8000-000000000001')) is distinct from true then raise exception 'Falhou: exclusão em cascata de A'; end if; end $$;
do $$ begin if (exists(select 1 from auth.users where id='b0000000-0000-4000-8000-000000000002') and exists(select 1 from public.teams where id='c0000000-0000-4000-8000-000000000003' and user_id='b0000000-0000-4000-8000-000000000002' and color='#223344') and exists(select 1 from public.players where id='d0000000-0000-4000-8000-000000000003' and name='Privado B') and exists(select 1 from public.formations where id='e0000000-0000-4000-8000-000000000002' and name='Teste B') and exists(select 1 from public.teams where id='c0000000-0000-4000-8000-000000000001' and user_id is null and color='#112233' and default_formation='4-4-2') and exists(select 1 from public.players where id='d0000000-0000-4000-8000-000000000001' and sort_order=7)) is distinct from true then raise exception 'Falhou: B e padrão intactos'; end if; end $$;
do $$ begin raise notice 'Todas as conferências de acesso passaram; alterações serão desfeitas.'; end $$;
rollback;
