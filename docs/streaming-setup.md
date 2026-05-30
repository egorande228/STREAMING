# Настройка стриминга: OBS → RTMP → SRS → HLS

## Полная цепочка

```
OBS (на вашем ПК)
    │
    │  RTMP push
    ↓
SRS / nginx-rtmp (сервер)
    │
    │  нарезает на .ts сегменты
    ↓
HLS (index.m3u8)
    │
    │  HTTP
    ↓
Плеер на сайте (hls.js)
```

OBS **не отдаёт** m3u8 напрямую — он только пушит RTMP.
Конвертацию RTMP → HLS делает сервер (SRS или nginx-rtmp).

---

## Шаг 1: Запустить SRS на сервере

### Вариант А — Docker (рекомендуется)

```bash
docker run -d \
  --name srs \
  --restart unless-stopped \
  -p 1935:1935 \
  -p 8080:8080 \
  ossrs/srs:5
```

| Порт | Назначение |
|------|-----------|
| 1935 | RTMP (OBS пушит сюда) |
| 8080 | HTTP (m3u8 отдаётся отсюда) |

Проверить что работает:
```bash
curl http://localhost:8080/api/v1/versions
```

### Вариант Б — Docker Compose

```yaml
# docker-compose.yml
services:
  srs:
    image: ossrs/srs:5
    restart: unless-stopped
    ports:
      - "1935:1935"
      - "8080:8080"
```

```bash
docker compose up -d
```

---

## Шаг 2: Настроить OBS

`Settings → Stream`:

| Поле | Значение |
|------|---------|
| Service | Custom |
| Server | `rtmp://ВАШ_IP/live` |
| Stream Key | `wc26` (любое имя) |

После нажатия **Start Streaming** поток доступен по адресу:
```
http://ВАШ_IP:8080/live/wc26/index.m3u8
```

Проверить в браузере или VLC: `Медиа → Открыть сетевой поток`.

---

## Шаг 3: Добавить поток в JSON сайта

Откройте `sites/main/stream.json` и укажите матч, на котором должна появиться кнопка:

```json
{
  "match_id": 1379275,
  "is_active": true
}
```

Затем откройте `sites/player/streams.json` и добавьте ссылку по тому же `match_id` из API-Football:

```json
{
  "1540843": {
    "url": "https://ВАШ_ДОМЕН/live/wc26/index.m3u8",
    "source_type": "hls",
    "label": "RU",
    "language_code": "ru",
    "region": "global",
    "is_active": true
  }
}
```

После деплоя `sites/main` покажет кнопку перехода в плеер только для этого матча, а `sites/player` проиграет поток из своего JSON. Внешний футбольный API не решает, где есть стрим.

---

## Если нужен HTTPS для m3u8

Браузеры блокируют HTTP-медиа на HTTPS-сайтах (mixed content).
Решение — nginx как reverse proxy перед SRS:

```nginx
# /etc/nginx/sites-available/srs
server {
    listen 443 ssl;
    server_name ВАШ_ДОМЕН;

    ssl_certificate     /etc/letsencrypt/live/ВАШ_ДОМЕН/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ВАШ_ДОМЕН/privkey.pem;

    location /live/ {
        proxy_pass http://127.0.0.1:8080/live/;
        proxy_set_header Host $host;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control no-cache;
    }
}
```

После этого m3u8 доступен по HTTPS:
```
https://ВАШ_ДОМЕН/live/wc26/index.m3u8
```

---

## Несколько потоков (языков)

Если используете ffmpeg для разбивки языков (см. `multilang-restream.md`),
OBS пушит один поток, ffmpeg его расщепляет:

```
OBS  →  rtmp://localhost/live/stream_ru  (RU)
                 ↓
              ffmpeg
                 ↓
   rtmp://localhost/live/ru  →  /live/ru/index.m3u8
   rtmp://localhost/live/en  →  /live/en/index.m3u8
   rtmp://localhost/live/es  →  /live/es/index.m3u8
```

Или OBS пушит напрямую в `/live/ru`, и ffmpeg не нужен.

---

## Задержка (latency)

| Режим | Задержка | Когда использовать |
|-------|---------|-------------------|
| HLS стандарт | 15–30 с | Стабильнее, рекомендуется |
| HLS Low Latency (LL-HLS) | 2–5 с | Нужна поддержка в SRS и hls.js |
| RTMP напрямую | < 1 с | Только для внутренних инструментов |

Для трансляций матчей достаточно HLS стандарт — зрители всё равно смотрят с задержкой.

---

## Автозапуск по расписанию

OBS можно запускать и останавливать автоматически по расписанию матчей.
Подробнее: `scripts/obs-scheduler/` — планировщик на Node.js с WebSocket API.
