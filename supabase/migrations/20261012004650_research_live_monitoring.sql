create extension if not exists pgcrypto with schema extensions;
create table public.research_settings(singleton boolean primary key default true check(singleton),collection_enabled boolean not null default false);
insert into public.research_settings values(true,false);
create table public.research_admins(email text primary key);
insert into public.research_admins values('mamaladze_vokpc2@mail.ru');
create table public.research_sessions(
 id uuid primary key default gen_random_uuid(), user_code text unique not null,
 token_hash text unique not null, is_test boolean not null default true,
 revoked_at timestamptz, created_at timestamptz not null default now(), started_at timestamptz,
 completed_at timestamptz, last_heartbeat_at timestamptz,last_activity_at timestamptz,
 current_test_index int not null default 1 check(current_test_index between 1 and 10),
 current_question int not null default 1 check(current_question between 1 and 48),
 revision bigint not null default 0, answers jsonb not null default '{}', notes jsonb not null default '{}',
 answered_count int not null default 0, skipped_count int not null default 0,
 tab_visible boolean not null default true, hidden_since timestamptz,
 consent_version text, consent_at timestamptz,
 check(jsonb_typeof(answers)='object'),check(jsonb_typeof(notes)='object'));
create table public.research_progress(
 session_id uuid primary key references public.research_sessions(id) on delete cascade,
 user_code text not null, is_test boolean not null,
 started_at timestamptz, completed_at timestamptz,
 last_heartbeat_at timestamptz,last_activity_at timestamptz,
 current_test_index int not null,current_question int not null,
 answered_count int not null,skipped_count int not null,
 tab_visible boolean not null,hidden_since timestamptz,revoked_at timestamptz);
create table public.research_items(item_id text primary key,test_index int not null,question_number int not null,min_value int,max_value int,is_open boolean not null default false);
create table public.research_audit(id bigint generated always as identity primary key, actor uuid,action text not null,session_id uuid,at timestamptz not null default now());
alter table public.research_settings enable row level security;
alter table public.research_admins enable row level security;
alter table public.research_sessions enable row level security;
alter table public.research_progress enable row level security;
alter table public.research_items enable row level security;
alter table public.research_audit enable row level security;
revoke all on public.research_sessions,public.research_admins,public.research_settings,public.research_items,public.research_audit from anon,authenticated;
revoke all on public.research_progress from anon,authenticated;
create function public.research_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join public.research_admins a on lower(u.email)=lower(a.email) where u.id=auth.uid() and u.email_confirmed_at is not null);
$$;
revoke all on function public.research_is_admin() from public;
grant execute on function public.research_is_admin() to authenticated;
create policy progress_admin_read on public.research_progress for select to authenticated using(public.research_is_admin());
grant select on public.research_progress to authenticated;
alter publication supabase_realtime add table public.research_progress;
create function public.research_sync_progress() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.research_progress values(new.id,new.user_code,new.is_test,new.started_at,new.completed_at,new.last_heartbeat_at,new.last_activity_at,new.current_test_index,new.current_question,new.answered_count,new.skipped_count,new.tab_visible,new.hidden_since,new.revoked_at)
 on conflict(session_id) do update set user_code=excluded.user_code,is_test=excluded.is_test,started_at=excluded.started_at,completed_at=excluded.completed_at,last_heartbeat_at=excluded.last_heartbeat_at,last_activity_at=excluded.last_activity_at,current_test_index=excluded.current_test_index,current_question=excluded.current_question,answered_count=excluded.answered_count,skipped_count=excluded.skipped_count,tab_visible=excluded.tab_visible,hidden_since=excluded.hidden_since,revoked_at=excluded.revoked_at;
 return new;
end;$$;
create trigger sessions_progress after insert or update on public.research_sessions for each row execute function public.research_sync_progress();
create function public.research_auth_session(p_token text) returns public.research_sessions language plpgsql security definer set search_path='' as $$
declare s public.research_sessions;
begin
 if length(p_token)<40 or length(p_token)>128 then raise exception 'Недействительная ссылка';end if;
 select * into s from public.research_sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and revoked_at is null for update;
 if s.id is null then raise exception 'Недействительная или отозванная ссылка';end if;
 if not s.is_test and not (select collection_enabled from public.research_settings where singleton) then raise exception 'Сбор реальных ответов пока не включён';end if;
 return s;
end;$$;
revoke all on function public.research_auth_session(text) from public,anon,authenticated;
create function public.research_open(p_token text,p_consent boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.research_sessions;
begin
 s:=public.research_auth_session(p_token);
 if s.started_at is null and not p_consent then return jsonb_build_object('user_code',s.user_code,'is_test',s.is_test,'started',false);end if;
 if s.started_at is null then
 update public.research_sessions set started_at=now(),consent_at=now(),consent_version='server-v1',last_activity_at=now(),last_heartbeat_at=now() where id=s.id returning * into s;
 insert into public.research_audit(actor,action,session_id)values(null,'participant_started',s.id);
 end if;
 return jsonb_build_object('session_id',s.id,'user_code',s.user_code,'is_test',s.is_test,'started',s.started_at is not null,'started_at',s.started_at,'completed_at',s.completed_at,'answers',s.answers,'notes',s.notes,'revision',s.revision,'current_test_index',s.current_test_index,'current_question',s.current_question);
end;$$;
create function public.research_save(p_token text,p_revision bigint,p_answers jsonb,p_notes jsonb,p_test_index int,p_question int,p_visible boolean,p_activity boolean default false,p_complete boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.research_sessions; a int; sk int; r record;item public.research_items;v jsonb;
begin
 s:=public.research_auth_session(p_token);
 if s.started_at is null then raise exception 'Сначала подтвердите условия';end if;
 if s.revision<>p_revision then raise exception 'REVISION_CONFLICT';end if;
 if jsonb_typeof(p_answers)<>'object' or jsonb_typeof(p_notes)<>'object' or octet_length(p_answers::text)>150000 or octet_length(p_notes::text)>40000 then raise exception 'Неверный формат ответов';end if;
 if p_test_index not between 1 and 10 or p_question not between 1 and 48 then raise exception 'Неверный этап';end if;
 if exists(select 1 from jsonb_each(p_notes) n where n.key not in ('PDQ-8','PDQ-10') or jsonb_typeof(n.value)<>'string' or length(n.value#>>'{}')>2000) then raise exception 'Неверная дополнительная запись';end if;
 for r in select * from jsonb_each(p_answers) loop
 select * into item from public.research_items where item_id=r.key;
 if item.item_id is null then raise exception 'Неизвестный вопрос';end if;
 v:=r.value;
 if v='"skip"'::jsonb then continue;end if;
 if item.is_open then
 if jsonb_typeof(v)<>'string' or length(trim(v#>>'{}'))=0 or length(v#>>'{}')>4000 then raise exception 'Неверный открытый ответ';end if;
 else
 if jsonb_typeof(v)<>'number' then raise exception 'Неверный ответ';end if;
 if (v#>>'{}')::numeric<>trunc((v#>>'{}')::numeric) or (v#>>'{}')::numeric not between item.min_value and item.max_value then raise exception 'Ответ за пределами шкалы';end if;
 end if;
 end loop;
 select count(*) filter(where value<>'"skip"'::jsonb),count(*) filter(where value='"skip"'::jsonb) into a,sk from jsonb_each(p_answers);
 if p_complete and a+sk<>(select count(*) from public.research_items) then raise exception 'Есть вопросы без ответа или явного пропуска';end if;
 if s.completed_at is not null and (p_answers<>s.answers or p_notes<>s.notes) then raise exception 'Анкета завершена. Обратитесь к исследователю для повторного открытия';end if;
 update public.research_sessions set answers=p_answers,notes=p_notes,revision=revision+1,answered_count=a,skipped_count=sk,current_test_index=p_test_index,current_question=p_question,last_heartbeat_at=now(),last_activity_at=case when p_activity then now() else last_activity_at end,tab_visible=p_visible,hidden_since=case when p_visible then null when tab_visible then now() else hidden_since end,completed_at=case when p_complete then coalesce(completed_at,now()) else completed_at end where id=s.id returning * into s;
 return jsonb_build_object('revision',s.revision,'saved_at',s.last_heartbeat_at,'completed_at',s.completed_at,'answered_count',a,'skipped_count',sk);
end;$$;
create function public.research_heartbeat(p_token text,p_visible boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.research_sessions;
begin
 s:=public.research_auth_session(p_token);
 if s.started_at is null then raise exception 'Сессия не начата';end if;
 update public.research_sessions set last_heartbeat_at=now(),tab_visible=p_visible,hidden_since=case when p_visible then null when tab_visible then now() else hidden_since end where id=s.id;
 return jsonb_build_object('server_time',now());
end;$$;
create function public.research_create_invites(p_count int,p_prefix text default 'TEST',p_is_test boolean default true) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb:='[]';token text;code text;s_id uuid;i int;
begin
 if not public.research_is_admin() then raise exception 'Доступ запрещён';end if;
 if p_count not between 1 and 100 or p_prefix !~ '^[A-Za-z0-9_-]{1,16}$' then raise exception 'Неверные параметры';end if;
 if not p_is_test and not (select collection_enabled from public.research_settings where singleton) then raise exception 'Сбор реальных ответов выключен';end if;
 for i in 1..p_count loop
 token:=encode(extensions.gen_random_bytes(32),'hex');code:=p_prefix||'-'||upper(substr(encode(extensions.gen_random_bytes(6),'hex'),1,12));
 insert into public.research_sessions(user_code,token_hash,is_test) values(code,encode(extensions.digest(token,'sha256'),'hex'),p_is_test) returning id into s_id;
 result:=result||jsonb_build_object('user_code',code,'token',token,'session_id',s_id,'is_test',p_is_test);
 insert into public.research_audit(actor,action,session_id)values(auth.uid(),'invite_created',s_id);
 end loop;
 return result;
end;$$;
create function public.research_admin_export() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.research_is_admin() then raise exception 'Доступ запрещён';end if;
 insert into public.research_audit(actor,action)values(auth.uid(),'answers_exported');
 return coalesce((select jsonb_agg(to_jsonb(s)-'token_hash') from public.research_sessions s where started_at is not null),'[]'::jsonb);
end;$$;
create function public.research_admin_action(p_id uuid,p_action text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.research_is_admin() then raise exception 'Доступ запрещён';end if;
 if p_action='revoke' then update public.research_sessions set revoked_at=now() where id=p_id;
 elsif p_action='reopen' then update public.research_sessions set completed_at=null,revision=revision+1 where id=p_id;
 elsif p_action='delete' then delete from public.research_sessions where id=p_id;
 else raise exception 'Неизвестное действие';end if;
 insert into public.research_audit(actor,action,session_id)values(auth.uid(),p_action,p_id);
end;$$;
revoke all on function public.research_open(text,boolean),public.research_save(text,bigint,jsonb,jsonb,int,int,boolean,boolean,boolean),public.research_heartbeat(text,boolean),public.research_create_invites(int,text,boolean),public.research_admin_export(),public.research_admin_action(uuid,text),public.research_sync_progress() from public;
grant execute on function public.research_open(text,boolean),public.research_save(text,bigint,jsonb,jsonb,int,int,boolean,boolean,boolean),public.research_heartbeat(text,boolean) to anon,authenticated;
grant execute on function public.research_create_invites(int,text,boolean),public.research_admin_export(),public.research_admin_action(uuid,text) to authenticated;
