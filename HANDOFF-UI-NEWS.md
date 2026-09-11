# KingLive: внешка, новости и безопасный деплой

## Откуда начинать

Ветка передачи: `codex/kinglive-ui-handoff-20260911` в `egorande228/STREAMING`.
Основа — `c4f5db5` из `codex/dami-stream-fixes`, не старая `main`.
Публичные HTML/JS/CSS главной страницы обновлены из работающего сайта 11 сентября 2026.
Это НЕ полная копия production: серверные конфиги, секреты, KV/D1, актуальный
плеер и некоторые статические ресурсы живут отдельно. Перед production нужно
сверить весь артефакт с последним Pages deployment, особенно assets, banners,
admin, `_headers`, `_redirects` и `stream.json`. Не выкладывать эту ветку вслепую.

```bash
git clone --branch codex/kinglive-ui-handoff-20260911 https://github.com/egorande228/STREAMING.git
cd STREAMING
git switch -c friend/ui-news
```

Не брать старую копию проекта и не заменять ею весь репозиторий.

## Что можно менять

- `sites/main/styles.css`, оформление `index.html` и `news.html`, UI-изображения.
- Отображение новостей в `sites/main/news.js` и соответствующий рендер в `app.js`.
- Сохранять существующие DOM ID, обработчики, ссылки, языки EN/AR и RTL.

Новости приходят из API. Смена дизайна не требует смены API. Смена RSS-источников
или серверного парсинга — отдельная задача с владельцем, не часть UI-деплоя.

## Что нельзя менять без отдельного согласования

- `workers/**`, `ops/**`, `.github/workflows/**`, все wrangler-конфиги.
- `sites/player/**`, HLS, cookies, `cookieCheck`, CORS/CSP, `_headers`, `_redirects`.
- `config.js`, `stream.json`, URL API/плеера, DNS, Tunnel, KV/D1, Vast и cron.
- ID матчей, сопоставление матча и потока, условия видимости кнопок, параметры
  `match`, `source`, `src`, `type`, `lang`, передачу query-параметров и URL encoding.
- Рекламу, аналитику, admin и функциональность переключения языков.

Новые стили должны быть локальны компоненту: общий `display:none`, перекрывающий
оверлей или переименование DOM ID могут сломать кнопки при неизменном API.
Нельзя подставлять IPTV URL прямо в frontend.

## Что с автоматизацией

В `ops/automation` сохранены чистые модули каталога, распределения подписок и
исполнения заданий с тестами. Это код, НЕ включённый production cron.
Полная автоматизация ещё не завершена. Одна подписка = один входящий канал;
канал выбирается по матчу, каталоги не ограничиваются двумя тестовыми каналами.
Тестовые каналы не следует выдавать за трансляцию выбранного матча.
Не запускать старые install/deploy/recycle-скрипты из репозитория: их значения
могут ссылаться на старые серверы. UI-деплой не должен перезапускать потоки.
Секреты, плейлисты и резервные копии намеренно не передаются через Git.

## Проверка и Git

Нужен Node.js 20+. Команды из корня репозитория:

```bash
npm test --prefix sites/main
npm run build --prefix sites/main
node --test ops/automation/*.test.mjs
git diff --check
git diff --name-only
```

При провале тестов не деплоить и не удалять тест ради зелёного результата.
Добавлять только свои файлы явно, не `git add .`. `dist` не коммитить.
Пушить свою ветку; PR направлять в ветку передачи, не в `main`/`dev`.
Не мержить всю ветку передачи в `main`: это может запустить деплой других частей.

## Preview — первый обязательный деплой

Доступ к GitHub сам по себе не даёт доступ к Cloudflare. Владелец должен пригласить
ваш аккаунт в нужный Cloudflare account с согласованными правами. Не просить
переслать ключи Keychain, SSH, IPTV или Tunnel. Если доступа нет — передать commit
владельцу, он сделает preview.

В Cloudflare сначала убедиться, что `kinglive-pages-main` — нужный проект,
production branch = `main`, а `friend-ui-news` — НЕ production branch.

```bash
cd sites/main
npx wrangler@4 --version
npx wrangler@4 login
npx wrangler@4 whoami
npm test
npm run build
CLOUDFLARE_ACCOUNT_ID=7616dece8b5aecd644f7f8e7a0b0522e npx wrangler@4 pages deploy dist --project-name kinglive-pages-main --branch friend-ui-news
```

Открыть URL, который вернёт Wrangler. Не создавать новый проект при ошибке доступа.
Preview использует настоящий API: не выполнять admin-запросы и не менять данные.
Проверить desktop и iPhone Safari, EN/AR, RTL, Yesterday/Today/Tomorrow, popup,
счёт и статус, новости/страницу статьи, переходы в плеер и сохранность query.
Воспроизведение проверять на разрешённом активном тесте, не запускать новые потоки.
Проверить консоль и сеть: 404 ресурсов, CSP/CORS, ошибки JS. Проверить баннеры.

## Production — только после согласования

1. Передать владельцу preview URL, commit SHA, список изменённых файлов и результаты.
2. Владелец сверяет полный `dist` с текущим production, сохраняет ID предыдущего
   успешного Pages deployment и подтверждает конкретный commit. При расхождении
   сначала синхронизировать baseline; не удалять новые production-ресурсы.
3. Из проверенного commit повторить тесты/build и выполнить ТОЛЬКО Pages deploy:

```bash
# Рабочая папка: sites/main. Только после одобрения владельцем.
CLOUDFLARE_ACCOUNT_ID=7616dece8b5aecd644f7f8e7a0b0522e npx wrangler@4 pages deploy dist --project-name kinglive-pages-main --branch main
```

Это заменяет артефакт главного сайта, включая файлы admin, headers и redirect,
не только изменённый CSS. Поэтому проверка полного артефакта обязательна.
Не выполнять `wrangler deploy`: это другой, Worker-сценарий.
После публикации проверить `https://www.kinglive.live/` и `/news.html`, мобильную
версию, карточки и переходы. Успешный build не означает успешный production.

При регрессии вернуть предыдущий production deployment через Cloudflare Pages →
Deployments → нужная предыдущая успешная версия → Rollback. Не откатывать Workers,
не чистить KV/D1 и не выключать сервер. Сообщить владельцу причину и оба deployment ID.

## Существующий автодеплой

В этой ветке workflow главного сайта реагирует на push в `main` и `dev` с изменениями
`sites/main/**`, а также на ручной запуск. У player/API отдельные workflows.
Пуш в ветку передачи или `friend/ui-news` сам по себе этот workflow не запускает.
Не менять workflow и не запускать его вручную для обхода review.
Эти правила — инструкция, а не установленная защита веток GitHub.

Справка: [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).
