# NetPulse — запуск каркаса

Готов **этап 1** (каркас) с заложенным **Модулем 7 (автообновление)**.

## Что внутри

- Electron + React + TypeScript (strict) + Vite через `electron-vite`.
- Безопасный preload: `contextIsolation: true`, `nodeIntegration: false`, единственный мост `window.netpulse`.
- Тёмная/светлая/системная темы (CSS-переменные + Tailwind `darkMode: 'class'`), выбор запоминается.
- i18n ru/en (ru по умолчанию), переключение на лету.
- Боковая навигация по 6 модулям + Настройки.
- Zustand-сторы: настройки, навигация, автообновление.
- Персист настроек через `electron-store` (JSON).
- Адаптерный слой `process.platform` для `ping`/`tracert`/`arp`.
- Безопасный запуск процессов: `spawn` с массивом аргументов, таймаут, без shell.
- IPC по доменам через типобезопасную обёртку `handle()` → единый `IpcResult`.
- **Автообновление (Модуль 7):** `electron-updater` в main, события `update-available` →
  баннер «Доступна новая версия», `download-progress` → прогресс, `update-downloaded` →
  «Перезапустить и обновить» (`quitAndInstall()`), кнопка «Что нового» с release notes.
  Renderer только отображает состояние через IPC. Ошибки обрабатываются тихо.

## Команды

```bash
npm install
npm run dev          # запуск в режиме разработки
npm run typecheck    # проверка типов (node + web)
npm run build        # сборка
npm run pack:win     # portable .exe + NSIS
npm run publish:win  # сборка + публикация релиза в GitHub Releases (фид апдейтера)
```

## Настройка автообновления

В `electron-builder.yml` в секции `publish` укажите свой `owner` и `repo`
(GitHub Releases). Для надёжной работы апдейтера нужна **подпись кода**:
на Windows иначе предупреждает SmartScreen, на macOS подпись обязательна.
Проверка обновлений выполняется только в собранном приложении (`app.isPackaged`),
не в `dev`.

## Структура

Соответствует SKILL.md / TZ.md. Функциональные модули 1–6 пока — заглушки,
кроме рабочих «Настроек» и автообновления. Дальше по плану:
IP-калькулятор → DNS Lookup → Ping+Port → Сканер → Трассировка → Speedtest.

## Заметки по зависимостям

Все зависимости каркаса — MIT/ISC (включая `electron-updater` — MIT, рантаймовая).
Нативный `net-ping` (raw-сокеты) добавится на этапе сканера; он требует прав
администратора и нативной сборки, поэтому в каркас намеренно не включён.
