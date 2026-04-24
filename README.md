# Event Admin Frontend

Админка системы бронирований на **React + Vite + TypeScript**.

## Что реализовано

- Логин через связку `login + password + TOTP`
- Хранение JWT в `localStorage` и передача в `Authorization: Bearer <token>`
- Logout с очисткой JWT (и попыткой уведомить backend)
- Опциональная dev-кнопка «Войти без TOTP» (через env-флаг)
- Дашборд с проблемными бронированиями (`/bookings/future-email-bounced`)
- Список бронирований (`/bookings`)
- Детали бронирования (`/booking/<booking_uid>`)

## Переменные окружения

- `VITE_API_BASE_URL` — базовый URL backend API (например `http://localhost:8000`)
- `VITE_ENABLE_DEV_BYPASS_LOGIN` — `true/false`, показать кнопку обходного входа
- `VITE_DEV_BYPASS_JWT` — JWT, который будет сохранён при dev-входе (если не задан, используется дефолт)

## Настройка часового пояса

- В админке добавлен выбор часового пояса в боковой панели.
- Выбранный часовой пояс сохраняется в `localStorage` (ключ: `event_admin_time_zone`).
- Все даты и время в дашборде, списке и деталях бронирования отображаются в выбранном часовом поясе.
- В будущем это можно синхронизировать с backend через API.

## Предложенный контракт auth API (TOTP)

Поскольку на backend пока нет auth-эндпоинтов, фронтенд использует такой контракт:

### 1) Вход с TOTP

`POST /auth/totp/login`

```json
{
  "login": "admin",
  "password": "very-strong-password",
  "totp_code": "123456"
}
```

Ответ:

```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in_seconds": 3600,
  "user": {
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### 2) Logout

`POST /auth/logout` с заголовком `Authorization: Bearer <jwt>`

Успешный ответ: `204 No Content`
