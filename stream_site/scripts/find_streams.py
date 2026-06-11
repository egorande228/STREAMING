#!/usr/bin/env python3
"""
Автоматически открывает страницу и перехватывает все m3u8 URL из сетевых запросов.

Использование:
  python3 find_streams.py <URL сайта>
  python3 find_streams.py https://cmtv.ru/broadcast/live/

Опции:
  --wait N    ждать N секунд после загрузки (default: 15)
  --headless  запускать без GUI (по умолчанию с GUI, чтобы можно было кликнуть play)
  --out FILE  сохранить найденные URL в файл
"""

import sys
import re
import time
import argparse
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

def find_m3u8(page_url: str, wait_sec: int = 15, headless: bool = False, out_file: str = None):
    found: dict[str, dict] = {}  # url -> {type, referer, ...}

    def on_request(request):
        url = request.url
        if ".m3u8" in url or "chunklist" in url:
            if url not in found:
                found[url] = {
                    "type": classify(url),
                    "referer": request.headers.get("referer", ""),
                    "method": request.method,
                }
                label = found[url]["type"]
                print(f"  [{label}] {url}")

    def classify(url: str) -> str:
        if "chunklist" in url:
            if "audio" in url:
                return "AUDIO"
            if "video" in url:
                return "VIDEO"
            return "CHUNKLIST"
        if "master" in url or "index" in url or "playlist" in url:
            return "MASTER"
        return "M3U8"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 720},
        )
        page = ctx.new_page()
        page.on("request", on_request)

        print(f"\nОткрываю: {page_url}")
        print(f"Жду {wait_sec} сек (нажми Play на плеере если нужно)...\n")
        try:
            page.goto(page_url, timeout=30000, wait_until="domcontentloaded")
        except Exception as e:
            print(f"[warn] goto: {e}")

        # ждём — за это время пользователь может кликнуть на плеер
        for i in range(wait_sec, 0, -1):
            sys.stdout.write(f"\r  осталось {i:2d}с  (найдено: {len(found)} URL)  ")
            sys.stdout.flush()
            time.sleep(1)
        print("\n")

        browser.close()

    # Результаты
    if not found:
        print("m3u8 URL не найдены. Попробуй:\n"
              "  - увеличить --wait (например --wait 30)\n"
              "  - убрать --headless и нажать play вручную\n"
              "  - проверить что страница содержит видеоплеер")
        return

    # Сортируем: мастер первым, потом видео, потом аудио
    priority = {"MASTER": 0, "VIDEO": 1, "CHUNKLIST": 2, "AUDIO": 3, "M3U8": 4}
    sorted_urls = sorted(found.items(), key=lambda x: priority.get(x[1]["type"], 5))

    print(f"{'='*70}")
    print(f"Найдено {len(found)} m3u8 URL:")
    print(f"{'='*70}")

    master_urls = []
    video_urls = []

    for url, meta in sorted_urls:
        t = meta["type"]
        print(f"\n[{t}]")
        print(f"  {url}")

        # Пытаемся угадать качество из имени
        m = re.search(r'chunklist_(\d+)_video', url)
        if m:
            num = int(m.group(1))
            hint = {1: "низкое", 2: "среднее", 3: "высокое"}.get(num, f"уровень {num}")
            print(f"  → качество: {hint}")
            video_urls.append((num, url))
        if t == "MASTER":
            master_urls.append(url)

    # Рекомендация
    print(f"\n{'='*70}")
    if master_urls:
        print("✓ Добавь в админку (мастер — все качества автоматом):")
        print(f"  {master_urls[0]}")
    elif video_urls:
        best = max(video_urls, key=lambda x: x[0])
        print("✓ Мастер не найден. Добавь в админку лучшее видео:")
        print(f"  {best[1]}")
    print()

    # Сохранение
    if out_file:
        with open(out_file, "w") as f:
            for url, meta in sorted_urls:
                f.write(f"{meta['type']}\t{url}\n")
        print(f"Сохранено в {out_file}")

    return found


def main():
    parser = argparse.ArgumentParser(description="Найти m3u8 потоки на странице")
    parser.add_argument("url", help="URL страницы с плеером")
    parser.add_argument("--wait", type=int, default=15, help="Секунд ждать (default: 15)")
    parser.add_argument("--headless", action="store_true", help="Без GUI")
    parser.add_argument("--out", help="Файл для сохранения результатов")
    args = parser.parse_args()

    find_m3u8(args.url, wait_sec=args.wait, headless=args.headless, out_file=args.out)


if __name__ == "__main__":
    main()
