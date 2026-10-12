-- Reproduces live ACLs checked against pg_proc.proacl.
revoke execute on function public.research_is_admin(), public.research_auth_session(text), public.research_sync_progress(), public.research_create_invites(int,text,boolean), public.research_admin_export(), public.research_admin_action(uuid,text) from public,anon,authenticated;
grant execute on function public.research_is_admin(), public.research_create_invites(int,text,boolean), public.research_admin_export(), public.research_admin_action(uuid,text) to authenticated;
revoke execute on function public.research_open(text,boolean),public.research_save(text,bigint,jsonb,jsonb,int,int,boolean,boolean,boolean),public.research_heartbeat(text,boolean) from public,anon,authenticated;
grant execute on function public.research_open(text,boolean),public.research_save(text,bigint,jsonb,jsonb,int,int,boolean,boolean,boolean),public.research_heartbeat(text,boolean) to anon,authenticated;
