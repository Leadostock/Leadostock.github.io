# Лидосток — бэкенд (каркас MVP)

API-first бэкенд на FastAPI: приём входящих сообщений из каналов (Telegram / Email / VK),
единый инбокс, карточки лидов, мультитенантность, шифрование токенов каналов.

> Это **стартовый каркас**, а не готовый продукт. Ядро (мультитенантность, шифрование,
> абстракция каналов, приём Telegram, инбокс, лимиты тарифов) реализовано и показывает
> архитектуру. Часть каналов и функций помечены `TODO`/`Фаза 2` — их дописываете вы.

## Стек
FastAPI · SQLAlchemy 2.0 (async) · PostgreSQL · Redis + Arq · JWT · AES-GCM

## Структура
```
app/
  config.py            настройки (env)
  crypto.py            AES-GCM шифрование credentials каналов
  database.py          async-подключение к PostgreSQL
  security.py          пароли (bcrypt) + JWT
  deps.py              текущий пользователь + МУЛЬТИТЕНАНТНАЯ изоляция
  plans.py             тарифы и их права (Free/Minimal/Premium/Enterprise)
  models/              таблицы: tenant, user, channel, conversation, message, lead, event
  channels/            абстракция каналов + провайдеры (telegram/email-imap/vk)
  api/                 auth, channels, webhooks, conversations, analytics
  worker/              обработка входящих (arq) + поллер почты (cron)
```

## Запуск (локально)

1. Поднять БД и Redis:
   ```bash
   docker compose up -d
   ```
2. Установить зависимости:
   ```bash
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   ```
3. Настроить окружение:
   ```bash
   cp .env.example .env
   # сгенерировать ключи:
   python -c "import secrets;print('JWT_SECRET=',secrets.token_urlsafe(48))"
   python -c "import os,base64;print('CREDENTIALS_ENCRYPTION_KEY=',base64.b64encode(os.urandom(32)).decode())"
   # вписать значения в .env
   ```
4. Создать таблицы. Есть готовая начальная миграция — просто применить:
   ```bash
   alembic upgrade head
   ```
   (Либо быстрый путь без alembic: `python -m app.scripts.manage init-db`.)
5. Настроить всё одной серией команд (тарифы + системный администратор):
   ```bash
   python -m app.scripts.manage seed-tariffs
   python -m app.scripts.manage create-admin admin@lidostok.ru СильныйПароль123
   python -m app.scripts.manage info      # показать текущие настройки подключения
   ```
6. Запустить API и воркер (в двух терминалах):
   ```bash
   uvicorn app.main:app --reload
   arq app.worker.arq_worker.WorkerSettings
   ```
7. Документация API: http://localhost:8000/docs

> Тарифы засеиваются и автоматически при старте приложения (мягко: если БД не готова —
> приложение всё равно поднимется). Ключ `is_superadmin` открывает админ-разделы
> (`/api/admin/*`, `/api/admin/tariffs`).

## Подключение Telegram-бота

1. Получить токен у @BotFather.
2. Завести канал: `POST /api/channels` с `type=telegram` и `credentials.bot_token`.
3. Задать `PUBLIC_BASE_URL` в `.env` (публичный адрес API; локально — туннель ngrok).
4. Зарегистрировать вебхук — при активации канала (`POST /api/channels/{id}/activate`)
   это происходит автоматически, либо вручную:
   ```bash
   python -m app.scripts.manage set-webhook <channel_id>
   ```
   Команда проверит токен (`getMe`) и пропишет вебхук в Telegram.

Подробная карта (где токен, где chat_id, как идёт сообщение) — в файле
`TG_бот_карта_бэкенда.md`.

## Как это работает
1. Клиент пишет в подключённый канал.
2. Telegram/VK шлют вебхук на `/api/webhooks/{тип}/{routing_key}` → проверяем секрет → кладём в очередь Arq (быстрый ответ каналу).
3. Воркер: находит/создаёт диалог → сохраняет сообщение (идемпотентно) → создаёт карточку лида (с учётом лимита тарифа) → пишет событие.
4. Менеджер видит всё в инбоксе через `/api/conversations` (данные строго своего тенанта).

## Подключение каналов (через API)

Каналы заводятся через `/api/channels` (нужна роль owner/admin). Учитывается лимит
каналов по тарифу (Free — 2). Полный справочник — в Swagger `/docs`.

**Telegram:**
1. `POST /api/channels` с `{"type":"telegram","credentials":{"bot_token":"<токен от BotFather>"}}`
2. `POST /api/channels/{id}/activate` — бэкенд сам зарегистрирует вебхук в Telegram
   (нужен публичный `PUBLIC_BASE_URL`; локально — туннель вроде ngrok).

**Email (IMAP):**
1. `POST /api/channels` с
   `{"type":"email","credentials":{"imap_host":"imap.yandex.ru","imap_port":993,"login":"sales@company.ru","password":"<пароль-приложения>"}}`
2. `POST /api/channels/{id}/activate`
3. Дальше поллер (cron в arq) сам заберёт новые письма. Для быстрой проверки —
   `POST /api/channels/{id}/poll` (ручной опрос).

> Пароль почты — это **пароль приложения**, а не основной пароль ящика. При первом
> опросе старые письма НЕ импортируются — в лиды попадают только новые.

## Что дальше (по фазам)
- **MVP (осталось):** обогатить VK (имена через users.get), realtime в инбоксе (WebSocket/SSE), выкачка вложений в S3, Telegram-бот-уведомитель менеджерам.
- **Фаза 2:** ответы из инбокса (`send_message`), отправка Email по SMTP, push лидов в Bitrix24, WhatsApp Cloud API.
- **Фаза 3:** Instagram, глубокая интеграция с CRM, десктоп на Tauri поверх этого же API.

## Редактирование клиентов и лидов через API (без захода в БД)

Всё, что видно в панели, редактируется через API — данные сразу пишутся в PostgreSQL.

Управление клиентами (только суперадмин, `User.is_superadmin = true`):
- `GET  /api/admin/overview` — сводка по системе (клиенты, активные, лиды, каналы)
- `GET  /api/admin/tenants` — все компании со статистикой
- `POST /api/admin/tenants` — создать компанию
- `PATCH /api/admin/tenants/{id}` — изменить название, тариф, активность
- `DELETE /api/admin/tenants/{id}` — удалить компанию (каскадом)

Лиды в кабинете клиента (фильтры + сортировка + экспорт):
- `GET /api/leads?status=&month=YYYY-MM&date_from=&date_to=` — список, новые сверху
- `GET /api/leads/export?month=YYYY-MM` — выгрузка CSV за месяц

> Сделать пользователя суперадмином (после регистрации): в psql
> `UPDATE users SET is_superadmin = true WHERE email = 'you@example.com';`

## Готово в бэкенде
Мультитенантность и изоляция · шифрование токенов (AES-GCM) · абстракция каналов ·
приём **Telegram** (вебхук) · приём **Email/IMAP** (поллинг с дедупликацией) ·
приём **VK** (вебхук) · управление каналами с лимитами по тарифу · инбокс (диалоги,
сообщения, карточки лидов, статусы) · аналитика с гейтингом по тарифу.

## Переход Email IMAP → OAuth
Email реализован через провайдер `EmailImapProvider`. Чтобы добавить OAuth, создаётся
`EmailOAuthProvider(ChannelProvider)` с той же `parse_incoming()`, но авторизацией по
OAuth-токену (XOAUTH2). Инбокс, воркер и модель данных при этом не меняются.
```
