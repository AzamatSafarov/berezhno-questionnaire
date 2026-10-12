# Инварианты разработки

Сохранять тексты, варианты и IDs data.js (10 методик / 240 пунктов). Не включать реальный сбор без разрешения владельца. Активный числовой расчёт только MSPSS; ключи других методик не считать отсутствующими, сверять неоднозначности отдельно.

Все обязательные ответы нужны для перехода и завершения, без per-question skips; PDQ-18 обязательный текст, PDQ-8/10 пояснения опциональны. Excel только полные анкеты. Сохранять добровольную паузу/выход. Спасибо о серверном сохранении — только после его подтверждения; local mode прямо называет устройство и отсутствие отправки.

Не ослаблять RLS/RPC grants/allowlist, SHA-256 tokens, revision locks; не добавлять bypass входа. Никаких service_role в браузере, ответов участниц/SMTP/oauth secrets в Git. Разработческий доступ Supabase не равен роли исследователя.

Не применять initial migrations повторно к production. Визуальные изменения сначала локально. Production deploy только после согласования. Репозиторий не подключён к автоматическому deploy.

Не добавлять маркетинговую подачу, human illustrations, утверждения полной анонимности и неподтверждённое время прохождения. Сохранять оригинальный SVG и мобильные tap targets.

Перед передачей изменений запускать tests/test_browser.py. Проверять отдельно local flow и authenticated invite flow; локальный тест не доказывает SMTP, Realtime или чистое развёртывание БД.

Известные вопросы: WAS дублирует 23 и пропускает 11; DAS противоречит направлению coding; PASS-R version thresholds требуют сверки; PDQ и ТОБ-Б processing отсутствует в присланном материале. CISS/PSS/DASS/MAAS keys supplied, not connected yet.

Точки входа: public/app.js (flow/scoring), data.js (вопросы), mobile.css, completion.js, research-live.js (invite/server), admin.js (auth/dashboard), admin-export.js/excel-export.js, supabase/migrations и seed.sql.
