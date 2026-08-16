Стек: **Next.js 16 (App Router) + TypeScript + TanStack Query + Tailwind CSS v4**.
Zustand не использован — состояние чата укладывается в `useReducer` + пара
`useRef`.

## Запуск

```bash
npm install
cp .env.example .env
```

Раздельно в двух терминалах: `npm run dev` и `npm run ws`.

Приложение — [http://localhost:3000/chat](http://localhost:3000/chat), WebSocket-сервер — `ws://localhost:8081`.

Прочие скрипты: `npm run build` / `npm run start` — прод-сборка и запуск.

## Архитектура

Feature-sliced структура:

```
src/
  app/                    # роутинг, layout, route handlers — Next.js App Router
    chat/page.tsx         # server component: SSR встреч + гидратация TanStack Query
    api/meetings/route.ts # GET /api/meetings — route handler над мок-данными
  server/meetings.ts       # мок-данные встреч + имитация задержки сети
  features/
    meetings/              # список встреч: api-клиент, типы, query-key, компонент
    chat/
      components/          # Chat, MessageList, MessageForm, ConnectionStatus
      hooks/                # useChatSocket и его составные части (см. ниже)
      model/types.ts        # общий контракт данных чата и WS-протокола
  shared/
    ui/retro.tsx            # переиспользуемые примитивы ретро-темы (кнопка, панель…)
    lib/cx.ts                # склейка className без лишних зависимостей (clsx и т.п.)
```



### Граница server / client components

- `app/chat/page.tsx` — **server component**. Он async, ходит за встречами на
сервере (`getMeetings`), создаёт `QueryClient`, кладёт туда данные и
дегидрирует их в `HydrationBoundary`. Никакого состояния и интерактивности —
ему client-режим не нужен, а SSR даёт список встреч в HTML сразу, до загрузки
JS (обязательное требование ТЗ).
- Всё, что ниже (`ChatWorkspace`, `MeetingsList`, `Chat`, `MessageList`,
`MessageForm`, `ConnectionStatus`) — `"use client"`, потому что они держат
React state (выбранная встреча, текст сообщения), эффекты (WebSocket,
автоскролл) или используют `useQuery` на клиенте (кнопка «Обновить» должна
дёргать сеть без перезагрузки страницы). Граница проведена по первому компоненту,
которому реально нужна интерактивность (`ChatWorkspace`), а не выше — это
минимизирует client-бандл и даёт странице отрендериться на сервере целиком
вместе с разметкой чата и заголовком.



### WebSocket-протокол и `useChatSocket`

Протокол описан типами в `features/chat/model/types.ts`:
клиент → сервер — `join` (подписка на историю встречи) и `send` (новое
сообщение); сервер → клиент — `history`, `message`, `typing`. Тип `send`
специально назван не `message`, чтобы не путать клиентское и серверное
события с одинаковым именем в одном union-типе.

`useChatSocket` — тонкая обёртка (см. `features/chat/hooks/`), собранная из трёх
независимых частей, чтобы не иметь один 500-строчный хук со всей логикой сразу:

- `chat-socket-protocol.ts` — чистые функции парсинга/type guards для входящих
событий (без React, легко тестируются изолированно);
- `use-websocket-connection.ts` — только транспорт: подключение, reconnect с
exponential backoff (1с → 2с → … → капа 10с), `connectionStatus`, отдаёт
сырые события наружу через колбэки;
- `chat-messages-reducer.ts` — состояние сообщений и typing-статусов через
`useReducer` (история по `meetingId`, статусы `pending/sent/delivered/failed`,
typing-ключи `meetingId:clientId`).

Optimistic UI: сообщение попадает в ленту сразу со статусом `sent`/`pending`
(до ответа сервера), при обрыве связи `sent`-сообщения возвращаются в
`pending` и переотправляются автоматически при восстановлении соединения
(без участия пользователя), а `failed` можно отправить повторно кнопкой
«Повторить». При переключении между встречами на уже открытом соединении
переотправляется `join` для новой встречи — история переезда между чатами
подтягивается без полного реконнекта.

## Отступления от эталонного ТЗ (и почему)

1. **История чата хранится на сервере** (`server.js`, `Map<meetingId, ChatMessage[]>`),
  хотя в ТЗ сказано «без истории на сервере». Причина: раз добавилась фича
   «несколько встреч со своим чатом у каждой» (не в исходном ТЗ), без сервера истории при переключении между встречами
   переписка терялась бы. История держится только в памяти процесса и ограничена
   `MAX_HISTORY_LENGTH = 200` сообщений на встречу, чтобы не расти бесконечно.
2. **Задержка эхо-ответа увеличена** с эталонных 300 мс до 1.5–2 с, и перед
  ответом сервер шлёт `typing: true` — чтобы в интерфейсе было что показывать
   в индикаторе «Печатает…» (не в исходном ТЗ).
3. **Разрыв соединения** оставлен как в эталоне — раз в 25–35 секунд сервер
  зовёт `socket.terminate()`, это и проверяет reconnect-логику на клиенте.
