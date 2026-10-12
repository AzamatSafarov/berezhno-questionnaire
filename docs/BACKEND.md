# Бэкенд: текущий и отдельный development

## Текущее состояние
Project conpilbfsumopiddnzjj / eu-west-1. Три production migrations проверены через Supabase list_migrations:
- 20261012004650 research_live_monitoring
- 20261012005346 restrict_explicit_rpc_grants
- 20261012012834 require_answers_without_skips

Первая миграция и seed взяты из оригинальных локальных SQL. Вторая восстановлена по проверенным production function ACLs; третья воспроизводит фактически применённый SQL и функцию, прочитанную через pg_get_functiondef. Не экспортировались ответы, auth.users и session tokens. Миграции предназначены для нового пустого Supabase, не повторного накатывания на production.

Tables: research_settings, research_admins, research_sessions, research_progress, research_items, research_audit. Session answers guarded through RPC. Realtime publishes only research_progress. `research_settings.collection_enabled=false` подтверждено чтением production. Seed contains 240 question metadata entries, not participant records.

## Новый отдельный проект
1. Создать development Supabase (не production), проверить тариф/расходы отдельно.
2. В SQL Editor применить три файла supabase/migrations/ по имени в хронологическом порядке, затем supabase/seed.sql. Никаких SQL к работающему production без согласования.
3. В research_admins начальная миграция содержит текущую почту исследователя. Для development заменить allowlist на собственную разрешённую почту через SQL Editor. Это не заменяет Supabase Auth user и подтверждение почты.
4. В public/research-config.js заменить url, publishable key и adminEmail. В vercel.json заменить оба production Supabase origins (https/wss).
5. Authentication → URL Configuration: Site URL для выбранного development домена, Redirect URLs включая /admin.html. Для локальной разработки разрешить http://127.0.0.1:8824/admin.html. Не использовать localhost production redirects.
6. Подключить собственный SMTP для стабильного email OTP/magic-link. По текущим docs встроенный sender имеет 2 письма/час и ограничения адресатов. SMTP secrets только в Supabase settings, не в frontend/git.
7. Проверить Realtime publication research_progress и RLS. Anonymous direct table SELECT и admin RPC должны отказать.
8. Войти своей почтой, создать одну TEST invite, пройти её синтетическими ответами. Проверить completion/read-back, dashboard, Excel, offline resume, revision conflict и revoke/delete. Тестовые записи маркировать is_test=true.

## Контроль безопасности (SQL Editor, read-only)
```sql
select collection_enabled from public.research_settings;
select count(*) from public.research_items;
select proname,proacl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname like 'research_%';
select tablename from pg_publication_tables where pubname='supabase_realtime';
```

## Не перенесено автоматически
Auth Site URL/redirects, SMTP, auth users, организации/права разработчиков, Vercel domain/team, retention scheduler и реальные данные. Автоудаление по согласованному сроку ещё не настроено и не проверено. Пакет не является backup production данных.
