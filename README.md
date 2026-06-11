# Event Admin Frontend

Админка системы бронирований на **React + Vite + TypeScript**.

## Что реализовано

- Логин через связку `email + password + TOTP` (`POST /auth/login` на event-admin; токен живёт 60 минут)
- Хранение JWT в `sessionStorage` и передача в `Authorization: Bearer <token>`
- Автоматический выход при 401 (просроченный токен) и обработка 429 (троттлинг логина)
- Logout с очисткой сессии (и попыткой уведомить backend — `POST /auth/logout`)
- Опциональная dev-кнопка «Войти без TOTP» (только в dev-сборке, через env-флаг)
- Дашборд с проблемными бронированиями (`GET /bookings/future-email-bounced`)
- Список бронирований с фильтрами и пагинацией (`GET /bookings`)
- Детали бронирования (`GET /bookings/<booking_uid>`)
- Список пользователей с пагинацией (`GET /api/users` — прокси event-admin к event-users)
- Изменение email клиента и переназначение клиента встречи (`POST /api/users/id/{id}/change-email`, `POST /bookings/{uid}/reassign-client`)

Все запросы идут **только в event-admin**: он аутентифицирует, проверяет роль `admin` и сам проксирует `/api/users/*` в event-users.

## Команды

```bash
npm run dev       # dev-сервер (Vite)
npm run build     # tsc -b + production build
npm run lint      # ESLint
npm test          # Vitest (happy-dom)
```

## Переменные окружения

См. `.env.example`:

- `VITE_API_BASE_URL` — базовый URL event-admin (например `http://localhost:8000`)
- `VITE_ENABLE_DEV_BYPASS_LOGIN` — `true/false`, показать кнопку обходного входа (только dev)
- `VITE_DEV_BYPASS_JWT` — JWT для dev-входа; без него кнопка не отображается

## Настройка часового пояса

- Выбор часового пояса в боковой панели; значение валидируется и сохраняется в `localStorage` (ключ: `event_admin_time_zone`).
- Все даты и время отображаются в выбранном часовом поясе (`ru-RU` локаль).

## Документация

- `CLAUDE.md` — команды и архитектура
- `docs/SERVICE_OVERVIEW.md`, `docs/API_CONTRACTS.md`, `docs/DEPENDENCIES.md`, `docs/AUDIT.md`
