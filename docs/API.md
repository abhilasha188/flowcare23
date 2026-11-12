# FlowCare API

The API is mounted at `/api` and returns JSON. Authenticated browser calls use the HTTP-only session cookie; mutating calls also send the CSRF cookie value in the `X-CSRF-Token` header. The client API helper handles cookies and token refresh.

## Conventions

- Successful responses generally include `{ "success": true }`; errors include `{ "success": false, "message": "...", "errors": [] }`.
- Authentication failures return `401`. A `401` from `GET /api/auth/me` while signed out is expected.
- Invalid input returns `400`; duplicate records may return `409`; a record owned by another user is returned as `404`.
- The server limits JSON request bodies to 10 KB. Authentication, account, and write endpoints are rate limited.
- Date-only values use `YYYY-MM-DD` and are stored as UTC midnight. Timestamps such as reminder `scheduledAt` must include an explicit timezone (for example `Z` or `-04:00`).

## Authentication

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/auth/csrf` | Issues a CSRF cookie and returns `{ success, csrfToken }`. |
| `POST` | `/api/auth/register` | Requires `fullName`, `email`, and `password`; may include `dateOfBirth`, `averageCycleLength`, `averagePeriodDuration`. Creates a session. |
| `POST` | `/api/auth/login` | Requires `email` and `password`; optional `rememberMe`. Invalid credentials return `401`. |
| `POST` | `/api/auth/logout` | Requires CSRF token; clears the session cookie. |
| `GET` | `/api/auth/me` | Returns the signed-in user or `401`. |
| `PATCH` | `/api/auth/preferences` | Updates `averageCycleLength` and/or `averagePeriodDuration`. |

## Cycles and predictions

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/cycles` | Returns the current user's records, newest first. |
| `GET` | `/api/cycles/:id` | Reads an owned record. |
| `POST` | `/api/cycles` | Requires `startDate`; optional `endDate`, `flowIntensity` (`light`, `medium`, `heavy`), `notes`. |
| `PUT` | `/api/cycles/:id` | Updates an owned record using the same fields as create. |
| `DELETE` | `/api/cycles/:id` | Removes an owned record. |
| `GET` | `/api/predictions` | Returns estimated next period, ovulation, fertile window, phase, and confidence metadata when enough data exists. |

Cycle predictions use recorded dates and validated historical intervals; profile averages can be fallbacks and are identified as estimates. Estimates are not contraception guidance or medical advice.

## Symptom and wellness logs

`POST /api/symptoms` saves one daily entry per date. Saving an existing date replaces that day's entry and returns `200`; a new entry returns `201`. At least one symptom or health detail is required.

Example request:

```json
{
  "date": "2025-03-08",
  "symptoms": [
    { "name": "Cramps", "severity": 6, "description": "Intermittent" }
  ],
  "mood": "calm",
  "energyLevel": 5,
  "sleepQuality": 7,
  "flowIntensity": "light",
  "notes": ""
}
```

Allowed moods: `happy`, `calm`, `sad`, `irritated`, `anxious`, `stressed`, `energetic`, `low`, `emotional`. Symptom severity, energy, and sleep quality are integer scores from 1 to 10. A maximum of 20 distinct symptoms may be recorded for a date.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/symptoms` | Optional filters: `from`, `to` (`YYYY-MM-DD`), `symptom`, `search`, `page`, `limit` (maximum 100). Returns `entries` and `pagination`. |
| `GET` | `/api/symptoms/:id` | Reads an owned daily entry. |
| `POST` | `/api/symptoms` | Creates or replaces a daily entry for `date`. |
| `PUT` | `/api/symptoms/:id` | Replaces an owned entry; the target date must not duplicate another entry. |
| `DELETE` | `/api/symptoms/:id` | Deletes an owned daily entry. |

## Reminders

`scheduledAt` must be a valid ISO date-time with a timezone. Reminder types are `period`, `symptom`, and `custom`; title length is 2–80 characters and message length is at most 500.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/reminders` | Lists up to 500 of the current user's reminders, with a derived status. |
| `POST` | `/api/reminders` | Requires `type`, `title`, and `scheduledAt`; message is optional. |
| `PUT` | `/api/reminders/:id` | Updates supplied fields. |
| `PATCH` | `/api/reminders/:id` | Partial update; used for enable/disable and dismissal. |
| `DELETE` | `/api/reminders/:id` | Deletes an owned reminder. |

Browser notifications require browser permission and are delivered only while the app is open. The API does not send push notifications or guarantee delivery.

## Account and preferences

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/users/me` | Returns the current profile and preferences. |
| `PATCH` | `/api/users/me` | Updates profile, date of birth, cycle averages, notification preferences, and prediction preferences. Changing email requires `currentPassword`. |
| `POST` | `/api/users/change-password` | Requires `currentPassword`, `newPassword`, and `confirmNewPassword`. Invalidates old sessions; sign in again afterward. |
| `DELETE` | `/api/users/health-data` | Deletes cycles, symptoms, reminders, and cycle averages but preserves the account. |
| `DELETE` | `/api/users/account` | Requires password and `{ "confirmation": "DELETE" }`; removes account and associated records. |

Account deletion and health-data deletion are permanent.

## Analytics and resources

Analytics routes require authentication. Optional `range` values are `30d`, `90d`, `6m`, `12m`, and `all` (defaults vary by analytics endpoint: `90d`, and `12m` for patterns).

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/analytics/overview` | Dashboard summary including recent cycles, symptoms, and upcoming reminders. |
| `GET` | `/api/analytics/cycles?range=90d` | Cycle lengths, period durations, and averages. |
| `GET` | `/api/analytics/symptoms?range=90d` | Frequency, severity, monthly, mood, and wellness trends. |
| `GET` | `/api/analytics/moods?range=90d` | Mood distribution and monthly trends. |
| `GET` | `/api/analytics/patterns?range=12m` | Descriptive user-specific symptom/mood observations by estimated phase; not causal conclusions. |

Resource reads are public and curated from external sources:

- `GET /api/resources?search=...&category=...&page=1&limit=20` — returns resources, categories, and pagination.
- `GET /api/resources/:slug` — returns one resource or `404`.

## Health

`GET /api/health` returns `200` with `status: "healthy"` when MongoDB is connected, or `503` with `status: "degraded"` otherwise.
