# Многоязычный рестриминг

Ситуация: есть N готовых потоков с одинаковым видео, но разными
комментаторами. Нужно раздать их на сайт и внешние платформы.

---

## Схема

```
Источник 1: rtmp://.../stream_ru  (видео + RU аудио)
Источник 2: rtmp://.../stream_en  (видео + EN аудио)
Источник 3: rtmp://.../stream_es  (видео + ES аудио)
Источник 4: rtmp://.../stream_pt  (видео + PT аудио)
                    ↓
              ffmpeg на сервере
              (видео из источника 1,
               аудио из каждого своё)
                    ↓
    ┌───────────────┼───────────────┐
    ↓               ↓               ↓
HLS /live/ru   HLS /live/en   HLS /live/es ...
    ↓               ↓               ↓
Сайт (RU)    Сайт (EN)    Telegram/YouTube/Facebook
```

**Главное правило:** видео берётся только из одного источника и
копируется без перекодирования (`-c:v copy`). CPU почти не нагружается.
Три остальных видеопотока получаются, но игнорируются — небольшой
лишний трафик на входе, зато никаких дополнительных инструментов.

---

## ffmpeg команда

```bash
ffmpeg \
  -i "rtmp://источник/stream_ru" \
  -i "rtmp://источник/stream_en" \
  -i "rtmp://источник/stream_es" \
  -i "rtmp://источник/stream_pt" \
  \
  -map 0:v -map 0:a  -c:v copy -c:a aac -b:a 128k \
  -f flv rtmp://localhost/live/ru \
  \
  -map 0:v -map 1:a  -c:v copy -c:a aac -b:a 128k \
  -f flv rtmp://localhost/live/en \
  \
  -map 0:v -map 2:a  -c:v copy -c:a aac -b:a 128k \
  -f flv rtmp://localhost/live/es \
  \
  -map 0:v -map 3:a  -c:v copy -c:a aac -b:a 128k \
  -f flv rtmp://localhost/live/pt
```

### Разбор параметров

| Параметр | Что делает |
|----------|-----------|
| `-i "rtmp://..."` | Открыть входной поток. Нумерация с 0: первый — `0`, второй — `1`, и т.д. |
| `-map 0:v` | Взять видео из первого источника (индекс `0`) |
| `-map 0:a` | Взять аудио из первого источника → RU |
| `-map 1:a` | Взять аудио из второго источника → EN |
| `-map 2:a` | Взять аудио из третьего источника → ES |
| `-map 3:a` | Взять аудио из четвёртого источника → PT |
| `-c:v copy` | Видео не перекодировать — просто копировать как есть |
| `-c:a aac -b:a 128k` | Аудио перекодировать в AAC 128 kbps |
| `-f flv` | Формат выхода FLV (нужен для RTMP) |
| `rtmp://localhost/live/ru` | Куда отправить готовый поток |

### Почему `0:v` везде одинаковый

Видео во всех 4 источниках одинаковое — берём только из первого.
Если первый источник упадёт, можно переключиться на `1:v` (второй).

---

## Добавить выходы на внешние платформы

Дописать в ту же команду дополнительные `-map` блоки:

```bash
  # YouTube Live (RU)
  -map 0:v -map 0:a  -c:v copy -c:a aac -b:a 128k \
  -f flv rtmp://a.rtmp.youtube.com/live2/ВАШ_КЛЮЧ_RU \
  \
  # YouTube Live (EN)
  -map 0:v -map 1:a  -c:v copy -c:a aac -b:a 128k \
  -f flv rtmp://a.rtmp.youtube.com/live2/ВАШ_КЛЮЧ_EN \
  \
  # Facebook Live
  -map 0:v -map 0:a  -c:v copy -c:a aac -b:a 128k \
  -f flv "rtmps://live-api-s.facebook.com:443/rtmp/ВАШ_КЛЮЧ"
```

Всё в одном процессе ffmpeg — запустили и забыли.

---

## Если источники — файлы, а не живые потоки

Замените `rtmp://...` на пути к файлам:

```bash
ffmpeg \
  -i /videos/match_ru.mp4 \
  -i /videos/match_en.mp4 \
  -i /videos/match_es.mp4 \
  -i /videos/match_pt.mp4 \
  \
  -map 0:v -map 0:a  -c:v copy -c:a aac -b:a 128k \
  -f flv rtmp://localhost/live/ru \
  ...
```

---

## Если источники — HLS (m3u8), а не RTMP

```bash
ffmpeg \
  -i "https://источник/ru/index.m3u8" \
  -i "https://источник/en/index.m3u8" \
  ...
```

ffmpeg умеет читать HLS как входной поток.

---

## Что происходит на сервере (SRS)

SRS получает RTMP потоки и автоматически создаёт HLS:

```
rtmp://localhost/live/ru  →  https://ВАШ_ДОМЕН/live/ru/index.m3u8
rtmp://localhost/live/en  →  https://ВАШ_ДОМЕН/live/en/index.m3u8
rtmp://localhost/live/es  →  https://ВАШ_ДОМЕН/live/es/index.m3u8
rtmp://localhost/live/pt  →  https://ВАШ_ДОМЕН/live/pt/index.m3u8
```

Никакой дополнительной настройки SRS не нужно — он уже так работает.

---

## Добавить потоки в БД сайта

```sql
INSERT INTO streams (match_id, url, language_code, label, priority) VALUES
  (1, 'https://ВАШ_ДОМЕН/live/ru/index.m3u8', 'ru', 'RU', 10),
  (1, 'https://ВАШ_ДОМЕН/live/en/index.m3u8', 'en', 'EN', 10),
  (1, 'https://ВАШ_ДОМЕН/live/es/index.m3u8', 'es', 'ES', 10),
  (1, 'https://ВАШ_ДОМЕН/live/pt/index.m3u8', 'pt', 'PT', 10);
```

Плеер на сайте сам покажет кнопки RU / EN / ES / PT и будет
переключать потоки. Код менять не нужно.

---

## Нагрузка

| Языков | Входящий трафик | CPU | Исходящий трафик |
|--------|----------------|-----|-----------------|
| 2      | ~10 Mbps       | ~5% | ~10 Mbps + платформы |
| 4      | ~20 Mbps       | ~8% | ~20 Mbps + платформы |
| 8      | ~40 Mbps       | ~15%| ~40 Mbps + платформы |

Узкое место — интернет-канал сервера, не CPU.
Видео не перекодируется — это главная экономия ресурсов.

---

## Запуск как сервис (systemd)

Чтобы ffmpeg не падал и перезапускался автоматически:

```ini
# /etc/systemd/system/stream-mixer.service

[Unit]
Description=WC26 Stream Mixer
After=network.target

[Service]
ExecStart=/usr/bin/ffmpeg \
  -i rtmp://localhost/live/stream_ru \
  -i rtmp://localhost/live/stream_en \
  -i rtmp://localhost/live/stream_es \
  -i rtmp://localhost/live/stream_pt \
  -map 0:v -map 0:a -c:v copy -c:a aac -b:a 128k -f flv rtmp://localhost/live/ru \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 128k -f flv rtmp://localhost/live/en \
  -map 0:v -map 2:a -c:v copy -c:a aac -b:a 128k -f flv rtmp://localhost/live/es \
  -map 0:v -map 3:a -c:v copy -c:a aac -b:a 128k -f flv rtmp://localhost/live/pt
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable stream-mixer
sudo systemctl start stream-mixer
sudo systemctl status stream-mixer
```