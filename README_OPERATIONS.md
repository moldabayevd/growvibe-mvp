# GrowVibe: запуск и продакшен

Проект состоит из лендинга, API, отдельной админки и PostgreSQL. Локально все запускается через Docker, на сервере добавляется Caddy: он принимает `80/443`, сам выпускает HTTPS-сертификаты и проксирует запросы внутрь Docker-сети.

## Локальный запуск

```bash
copy .env.example .env
docker compose up --build -d
```

После запуска:

- Лендинг: http://localhost:5173
- Админка: http://localhost:5174
- API: http://localhost:4000/health

Вход в админку: логин и пароль из `.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`). По умолчанию `admin` / `admin12345` — обязательно поменять. Пароль хранится только в env, в БД попадает только подписанная сессия (JWT-подобный токен в localStorage браузера). Старый `ADMIN_TOKEN` остается для прямых API-вызовов (бэкап-скрипты, тесты).

## Что уже работает

- Лендинг получает доступные даты из базы и создает заявку.
- Админ сам добавляет, закрывает и редактирует дни регистрации.
- Backend сохраняет лида, заявку, платеж, чек и выбранную группу в PostgreSQL.
- Клиент загружает чек через сайт, админ подтверждает или отклоняет оплату.
- После подтверждения оплаты место считается занятым.
- WhatsApp webhook принимает входящие сообщения и может прикрепить присланный чек к последней заявке, ожидающей оплату.
- Utility-сообщения WhatsApp отправляются через утвержденные шаблоны Meta, если они заполнены в env.

## Продакшен на VPS

Минимально нужен Ubuntu-сервер с Docker, домен и три DNS A-записи на IP сервера:

- `growvibe.kz` -> IP сервера
- `admin.growvibe.kz` -> IP сервера
- `api.growvibe.kz` -> IP сервера

На сервере открыть входящие порты `80` и `443`.

Установка Docker на чистой Ubuntu:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

После этого перелогиниться в SSH, положить проект на сервер, зайти в папку проекта и создать production env:

```bash
cp .env.production.example .env
nano .env
```

В `.env` обязательно поменять:

- `WEB_DOMAIN`, `ADMIN_DOMAIN`, `API_DOMAIN`
- `ACME_EMAIL`
- `POSTGRES_PASSWORD`
- `ADMIN_TOKEN`
- `ADMIN_USERNAME` и `ADMIN_PASSWORD` (логин/пароль входа в админку)
- `SESSION_SECRET` (длинный случайный — подписывает сессии админа)
- `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` (хранилище чеков; на VPS MinIO-консоль (порт 9001) и API (9000) НЕ выставлены наружу — Caddy их не проксирует, доступ только из Docker-сети)
- `KASPI_PHONE`
- `KASPI_AMOUNT`
- WhatsApp-переменные, когда будет подключен номер Meta

Запуск:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env up --build -d
```

Проверка:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env logs -f api
```

После успешного запуска открывать:

- `https://growvibe.kz`
- `https://admin.growvibe.kz`
- `https://api.growvibe.kz/health`

## WhatsApp

В Meta webhook указывать:

```text
https://api.growvibe.kz/webhooks/whatsapp
```

Verify token должен совпадать с `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.

Для исходящих utility-сообщений нужны:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- утвержденные template names в `WHATSAPP_TEMPLATE_*`

Если шаблоны не заполнены, API не падает: сообщение логируется как пропущенное, а заявка все равно создается.

## Бэкап и восстановление

Создать бэкап базы:

```bash
sh scripts/backup-db.sh
```

На Windows локально:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1
```

Восстановить бэкап:

```bash
sh scripts/restore-db.sh backups/growvibe-YYYYMMDD-HHMMSS.sql.gz
```

На Windows локально:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\restore-db.ps1 backups\growvibe-YYYYMMDD-HHMMSS.sql.gz
```

Папку `backups/` нужно периодически забирать с сервера или складывать в внешнее хранилище.

## Важные ограничения MVP

- Автоматической проверки Kaspi-платежа пока нет: чек подтверждает админ. Для полной автоматизации нужен платежный провайдер/API с webhook.
- Чеки по умолчанию хранятся в MinIO (S3-совместимый сервис в Docker). На VPS volume `minio_data` нужно бэкапить вместе с базой. При желании можно подменить MinIO на внешний S3/R2: установить `STORAGE_DRIVER=minio`, прописать `MINIO_ENDPOINT/MINIO_PORT/MINIO_USE_SSL=true/MINIO_ACCESS_KEY/MINIO_SECRET_KEY/MINIO_BUCKET` на нужный сервис. Локально можно вернуться на диск через `STORAGE_DRIVER=local`.
- `ADMIN_TOKEN` должен быть длинным случайным секретом. Для более строгой защиты админку можно дополнительно закрыть Cloudflare Access, VPN или Basic Auth на Caddy.
