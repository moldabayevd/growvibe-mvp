# Vibe 42 — handoff для следующего Claude

Прочитай меня до того, как трогать код. Здесь — что это за проект сейчас, что было раньше, что лежит спящим и где какие грабли.

## Что это сейчас

**Vibe 42** — B2B-лендинг для организованного обучения вайб-кодингу. Одна публичная страница с формой заявки от организации (3 поля), админка для менеджера, postgres + node API.

Бренд раньше был **GrowVibe** — офлайн-практикум для физлиц с оплатой через Kaspi и WhatsApp-уведомлениями. Большой кусок старого кода/моделей остался в репе спящим (см. ниже).

Прод живёт на `https://vibe42.kz` (IP `213.155.23.39`, Ubuntu 24.04, ps.kz VPC).

## Архитектура одной картинкой

```
Browser
   │
   ▼
Caddy :80/:443   (vibe42-caddy, Let's Encrypt)
   ├── /              → web   (nginx + Vite-built React landing)
   ├── /admin/*       → admin (nginx + Vite-built React SPA, base=/admin/)
   ├── /api/*         → api   (Express + Prisma)
   ├── /uploads/*     → api   (для receipts, сейчас не используется)
   ├── /webhooks/*    → api   (WhatsApp webhook, сейчас не используется)
   └── /health        → api
                          │
                          ▼
                       Postgres (vibe42 db)
```

Все 6 контейнеров поднимаются через `docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env up -d`.

## Структура репы

```
/                              ← лендинг (Vite + React 19 + Tailwind 3)
  src/App.jsx                  ← главный компонент, рендерит секции
  src/components/
    Hero.jsx, WhatIs.jsx, ForWhom.jsx, WhatYouMake.jsx, FAQ.jsx, Toast.jsx
    RequestForm.jsx            ← B2B-форма, единственный источник трафика в API
  index.html                   ← title: "Vibe 42 — обучение вайб-кодингу для команд"
  tailwind.config.js           ← кастомные цвета `cyan` (#00E5FF) и `ink` (#0F1218)

admin/                         ← админка (отдельный Vite-app)
  src/App.jsx                  ← две вкладки: «Заявки» и «Группы»
  src/styles.css               ← в cyan/ink палитре
  vite.config.js               ← base: '/admin/' для build, '/' для dev

api/                           ← Express + Prisma
  src/server.js                ← все маршруты в одном файле
  src/{auth,config,prisma,storage,utils,whatsapp}.js
  prisma/schema.prisma         ← см. раздел "БД"
  prisma/migrations/
    20260524190000_init                  ← старая схема GrowVibe
    20260525120000_organization_request  ← новая модель + FK

Caddyfile                      ← prod-конфиг под единый домен vibe42.kz
docker-compose.yml             ← базовый стек (postgres + minio + api + web + admin)
docker-compose.prod.yml        ← prod override: + caddy, убирает наружные порты у backend'ов
scripts/
  gen-env-vibe42.sh            ← генерит prod .env с рандомными секретами
  backup-db.sh, restore-db.sh  ← бэкап postgres
```

## БД (`api/prisma/schema.prisma`)

**Используется сейчас (B2B-флоу):**
- `OrganizationRequest` — заявка от организации. Поля: `orgName`, `employeeCount`, `contactPhone`, `status` (NEW/CONTACTED/ASSIGNED/WON/LOST), `comment`, `sessionId?` (опциональная привязка к группе).
- `TrainingSession` — группа (когорта). Используется только из админки, на лендинг не выводится. Поля типа `priceKzt`, `seatsMin` остались от старого флоу — UI админки их не показывает и пишет 0/1.
- `AuditLog` — пишется при создании/изменении/удалении заявки и группы.

**Спит, не трогать без причины:**
- `Lead`, `Application`, `Payment`, `WhatsappMessage`, `Reminder` — старый GrowVibe-флоу с записью физлица, оплатой через Kaspi-чек, WhatsApp-шаблонами и напоминаниями. Таблицы есть, миграция `20260524190000_init` их создаёт, но публичный лендинг и админка их не используют.

**Почему оставлено:** пользователь явно попросил не трогать старые модели, чтобы не было риска потерять данные / поломать миграции. Если будешь делать чистку — сначала согласуй и сделай dump.

## API (`api/src/server.js`)

**Активные публичные маршруты:**
- `POST /api/public/requests` — приём B2B-заявки. Валидация zod, нормализация телефона, пишет в `OrganizationRequest` со статусом NEW и пишет в AuditLog.
- `GET /health` — `{ ok: true, service: 'vibe42-api' }`.

**Активные админские (требуют Bearer token из login):**
- `POST /api/admin/login` → `{ token, username, expiresAt }`. Креды из `ADMIN_USERNAME`/`ADMIN_PASSWORD` env.
- `GET /api/admin/me` — кто залогинен.
- `GET /api/admin/summary` — список групп (используется админкой для дропдауна «назначить в группу»).
- `GET /api/admin/requests?status=` — список заявок.
- `PATCH /api/admin/requests/:id` — обновить статус / комментарий / привязать к группе (по `sessionPublicId`). Привязка автоматически ставит status=ASSIGNED, если status не передан.
- `DELETE /api/admin/requests/:id` — удалить заявку.
- `GET/POST/PATCH/DELETE /api/admin/sessions[/:publicId]` — CRUD групп. Удаление блокируется, если в группе есть оплаченные заявки старого формата (legacy guard — на B2B-флоу никогда не триггерится).

**Спят (старый GrowVibe-флоу, в UI не вызываются, но эндпоинты живы):**
- `POST /api/public/applications` + `POST /api/public/applications/:id/payment-proof` — старая регистрация физлица.
- `GET /api/admin/applications`, `PATCH /api/admin/applications/:id/status`, `POST /api/admin/applications/:id/messages` — управление физлицами.
- `POST /api/admin/payments/:id/verify|reject` — подтверждение Kaspi-чека.
- `GET /uploads/:key` — отдача чеков из MinIO/local.
- `GET/POST /webhooks/whatsapp` — Meta webhook + входящие сообщения. Использует utility-шаблоны из env (`WHATSAPP_TEMPLATE_*`), если они пустые — просто логирует SKIPPED, не падает.

Если будешь чистить — снеси сначала legacy роуты, потом legacy модели, потом миграцию-tombstone. Не делай одним коммитом.

## Деплой

**Сервер:** `ubuntu@213.155.23.39`, ssh-ключ `~/.ssh/growvibe_deploy` (имя историческое, ключ свежий).

**Где код на сервере:** `~/vibe42/` (git clone из `https://github.com/moldabayevd/growvibe-mvp.git`, ветка `main`).

**Запуск стека:**
```bash
cd ~/vibe42
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env up -d
```

**Update flow (git pull + rebuild):**
```bash
ssh -i ~/.ssh/growvibe_deploy ubuntu@213.155.23.39 \
  "cd ~/vibe42 && git pull && sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env up --build -d"
```

**Логи:**
```bash
sudo docker logs -f growvibe-api      # имя контейнера историческое: container_name: growvibe-api в docker-compose.yml
sudo docker logs -f vibe42-caddy
```

**Миграции Prisma:** запускаются автоматически в CMD api-контейнера (`npx prisma migrate deploy && node prisma/seed.js && npm start`). Ничего вручную делать не нужно — добавил миграцию, закоммитил, на сервере `git pull` + `up --build -d` и она применится.

**Бэкап БД:**
```bash
ssh ubuntu@213.155.23.39 "cd ~/vibe42 && sh scripts/backup-db.sh"
# складывается в ~/vibe42/backups/
```

## ENV (prod, на сервере в `~/vibe42/.env`)

Генерируется через `bash scripts/gen-env-vibe42.sh`. Внутри:
- `WEB_DOMAIN=vibe42.kz`, `ACME_EMAIL=admin@vibe42.kz`
- `ADMIN_USERNAME=admin`, `ADMIN_PASSWORD=FNXMD12345` (это рабочий прод-пароль, попросили именно его)
- `POSTGRES_PASSWORD`, `ADMIN_TOKEN`, `SESSION_SECRET` — все по 40 байт `openssl rand -base64 32`
- `STORAGE_DRIVER=local`, `PUBLIC_BASE_URL=https://vibe42.kz`, `VITE_API_URL=https://vibe42.kz`, `CORS_ORIGINS=https://vibe42.kz`

`.env` в `.gitignore`, в репу не попадает. На сервере права `chmod 600`.

## DNS

Зона `vibe42.kz` в панели ps.kz. Сейчас:
- `vibe42.kz A → 213.155.23.39`
- `www.vibe42.kz CNAME → vibe42.kz` (Caddy редиректит на apex)
- остальные записи (`mail`, `MX`, `TXT spf`) — для почты, не наши.

**Поддомены `admin.vibe42.kz` / `api.vibe42.kz` НЕ нужны** — всё на одном домене через подпути. Если когда-то решишь разнести — поменяй Caddyfile + добавь A-записи + пересобери web/admin с правильным `VITE_API_URL`.

## Цветовая палитра

В `tailwind.config.js` определены кастомные цвета:
- `cyan` (DEFAULT/400 = `#00E5FF`, как в аватарке)
- `ink` (DEFAULT/900 = `#0F1218`, почти-чёрный)

Дизайн-правило (от пользователя): cyan-акцент + чёрный точечно (Hero, форма, футер), всё остальное светлое (white / cyan-50). Не залить весь сайт чёрным.

## Локальная разработка

```bash
# в одном терминале — Postgres
docker compose up -d postgres

# в другом — API
cd api && npm install
# создать api/.env с DATABASE_URL=postgresql://growvibe:growvibe@localhost:5432/growvibe?schema=public
npx prisma migrate deploy
npm run dev    # 4000

# в третьем — лендинг
npm install && npm run dev    # 5173

# в четвёртом — админка
cd admin && npm install && npm run dev -- --port 5174 --strictPort    # 5174
```

Локальный `.env` уже есть в корне (`POSTGRES_*` + `KASPI_*` от старого GrowVibe-флоу). `api/.env` я создал отдельно с `DATABASE_URL` и localhost CORS.

## Preview-tools

`.claude/launch.json` уже настроен с тремя preview-серверами: `vibe42-web` (5173), `vibe42-admin` (5174), `vibe42-api` (4000). Используй `preview_start` для проверки UI-правок.

## История пивота (2026-05-25)

Один коммит `7d26511` сделал весь переход GrowVibe → Vibe 42:
- Снёс из лендинга: `Requirements`, `PrepFlow`, `Schedule`, `ReadinessForm`, `RegistrationForm`, `Price`, `ProgressNav`, `ProgressNav`. Файлы оставлены на диске на случай отката — можно безопасно удалить.
- Переписал `Hero`, `WhatIs`, `ForWhom`, `WhatYouMake`, `FAQ`, `Toast` под B2B и cyan-палитру.
- Создал `RequestForm` (3 поля + маска телефона + экран успеха).
- Создал `OrganizationRequest` модель + миграцию.
- Добавил CRUD-роуты для админа.
- Полностью переделал `admin/src/App.jsx` — две вкладки вместо одной большой простыни с платежами.
- Поменял `Caddyfile` на single-domain layout (раньше был три поддомена).
- Сделал `admin/vite.config.js base: '/admin/'` для prod-билда.

## Гипотетические ловушки

- **container_name остался `growvibe-*`** в `docker-compose.yml` (api/web/admin/postgres/minio). Caddy ходит по service-name (`web`, `admin`, `api`), не по container_name, так что не сломалось. Если будешь переименовывать — поменяй и в `scripts/backup-db.sh` (там ищется `growvibe-postgres`).
- **MinIO контейнер запускается, но не используется** (`STORAGE_DRIVER=local`). Это ~70МБ RAM зря. Можно убрать через `profiles: [storage]` в основном compose, но это требует чистки `depends_on` в api. Сейчас оставлено как есть — не мешает.
- **WhatsApp webhook** и `/uploads/*` маршруты в Caddyfile живые — если кто-то знает URL, может постучаться. Сами эндпоинты тоже живы. Это не утечка, но удалять старый функционал — отдельная задача.
- **`/api/admin/applications`** не блокирован — если на сервере остались Application'ы из старого флоу, их можно увидеть через прямой API-запрос с токеном. Админка их не показывает, но эндпоинт отвечает. Если будут реальные клиенты — лучше за этим следить или снести.

## Креды (сменены/действующие)

- SSH: ключевой `~/.ssh/growvibe_deploy` (paroll был засвечен в чате — должен быть сменён через панель ps.kz; уточни у пользователя).
- Админка: `admin / FNXMD12345` — действующий.
- Postgres: пароль в `.env` на сервере, рандомный 40-байт.

## Что точно НЕ делать без спроса

- Не сносить старые `Lead/Application/Payment/...` модели и миграции — потерь данных боится пользователь.
- Не менять `ADMIN_PASSWORD` в `gen-env-vibe42.sh` — выбран осознанно.
- Не включать `auto_https off` в Caddyfile — сейчас работает LE, не ломай.
- Не пушить `.env`, `.env.production` — в gitignore, но проверяй.
