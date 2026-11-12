# FlowCare

FlowCare is a menstrual health and wellness tracker built with React, Express, and MongoDB. It supports cycle and symptom logging, personal analytics, account settings, reminders, and curated educational resources. Predictions are estimates, not medical advice. The AI assistant and RAG features are intentionally not implemented.

## Features

- Secure registration, sign-in, session restoration, CSRF protection, and account settings.
- Cycle tracking with history, calendar, and clearly qualified estimates.
- Daily symptom, mood, energy, sleep, and flow tracking.
- Insights for cycle history, symptoms, moods, and observed patterns.
- User-managed reminders and optional browser notifications while the app is open.
- Curated educational resources with links to their original sources.
- Health-data and account deletion controls with user-scoped data access.

## Tech stack

- **Client:** React, Vite, React Router, Axios, Recharts, Lucide React.
- **API:** Node.js, Express, Mongoose, MongoDB, bcryptjs, JWT cookies.
- **Security:** Helmet, CORS allow-list, CSRF protection, request validation, and rate limiting.

## Local setup

Requirements: Node.js 22.14 or compatible, npm, and MongoDB (local or Atlas).

1. Configure the API's root `.env`. The server loads this file from the project root. If it already exists, merge the settings from `server/.env.example` into it instead of replacing it; preserve your configured MongoDB URI.
2. Set `MONGO_URI` to a MongoDB URI beginning with `mongodb://` or `mongodb+srv://`, and set `JWT_SECRET` to a random value of at least 32 characters. Generate one with:

   ```sh
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. Configure the client environment using `client/.env.example` as a reference. Set `VITE_API_URL=http://localhost:5000/api`.
4. Install the API, client, and root development dependencies, then start both apps from the project root:

   ```sh
   npm ci --prefix server
   npm ci --prefix client
   npm install
   npm run dev
   ```

The client is available at `http://localhost:5173`, the API at `http://localhost:5000`, and the health check at `http://localhost:5000/api/health`.

### Environment variables

| Variable | Description |
| --- | --- |
| `PORT` | API listening port (default `5000`). |
| `NODE_ENV` | Set to `production` for deployment. |
| `MONGO_URI` | MongoDB connection string. Never commit credentials. |
| `CLIENT_URL` | Exact trusted client origin used by CORS and CSRF checks. |
| `JWT_SECRET` | Random signing secret, at least 32 characters. |
| `JWT_EXPIRES_IN` | Normal session lifetime (default `1d`). |
| `JWT_REMEMBER_EXPIRES_IN` | Remembered session lifetime (default `30d`). |
| `COOKIE_SAME_SITE` | `lax` locally; use `none` for a cross-site HTTPS deployment. |
| `COOKIE_SECURE` | `false` locally; `true` for HTTPS production. |
| `VITE_API_URL` | Client API base URL, normally ending in `/api`. |

Only `VITE_*` variables are exposed to browser code. Do not put database credentials, signing secrets, or other server secrets in client environment variables.

## Application areas

- `/dashboard` — recent cycles, symptoms, reminders, and wellness summaries.
- `/cycle-tracker` — cycle logging, calendar, history, and estimates.
- `/symptoms` — daily symptom, mood, energy, sleep, flow, and notes log.
- `/insights` — cycle and wellness charts and observational patterns.
- `/reminders` — create, edit, pause, and delete personal reminders.
- `/resources` — curated educational content and source links.
- `/settings` — profile, notification and prediction preferences, password, and data/account controls.

Reminder notifications use the browser Notification API only with permission and while FlowCare is open; they are not background or guaranteed delivery. Cycle and phase predictions are estimates based on recorded history, and analytics describe correlations only; they are not diagnoses or medical advice.

## API overview

The API is mounted at `/api`. Endpoints that require authentication are marked **Auth**; mutations also require the CSRF token returned by `GET /auth/csrf`. Send cookies and the `X-CSRF-Token` header from browser requests.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | Health/readiness status. |
| `GET` | `/auth/csrf` | Public | Issue a CSRF token for browser requests. |
| `POST` | `/auth/register` | Public | Register and create a session. |
| `POST` | `/auth/login` | Public | Authenticate and create a session. |
| `POST` | `/auth/logout` | Public + CSRF | Clear the session. |
| `GET` | `/auth/me` | Auth | Return the current session user. |
| `PATCH` | `/auth/preferences` | Auth + CSRF | Update cycle averages. |
| `GET`, `PATCH` | `/users/me` | Auth; PATCH + CSRF | Read or update profile/preferences. |
| `POST` | `/users/change-password` | Auth + CSRF | Change password and invalidate existing sessions. |
| `DELETE` | `/users/health-data` | Auth + CSRF | Delete the user's health records. |
| `DELETE` | `/users/account` | Auth + CSRF | Delete account after password and `DELETE` confirmation. |
| `GET`, `POST` | `/cycles` | Auth; POST + CSRF | List or create cycle records. |
| `GET`, `PUT`, `DELETE` | `/cycles/:id` | Auth; mutations + CSRF | Read, update, or remove a cycle. |
| `GET` | `/predictions` | Auth | Estimate cycle dates and confidence. |
| `GET` | `/analytics/overview`, `/analytics/cycles`, `/analytics/symptoms`, `/analytics/moods`, `/analytics/patterns` | Auth | Dashboard and date-range analytics. |
| `GET`, `POST` | `/symptoms` | Auth; POST + CSRF | Search/list or upsert a daily log. |
| `GET`, `PUT`, `DELETE` | `/symptoms/:id` | Auth; mutations + CSRF | Read, update, or delete a daily log. |
| `GET`, `POST` | `/reminders` | Auth; POST + CSRF | List or create reminders. |
| `PUT`, `PATCH`, `DELETE` | `/reminders/:id` | Auth; mutations + CSRF | Update, toggle, or delete reminders. |
| `GET` | `/resources`, `/resources/:slug` | Public | Search/list and read curated resources. |

For detailed request/response notes, query parameters, and error behavior, see [docs/API.md](./docs/API.md).

## Tests and checks

Run commands from the indicated directory:

```sh
# API
cd server
npm test
npm run build

# Client
cd ../client
npm test
npm run lint
npm run build
```

See [docs/DEVELOPMENT-CHECKLIST.md](./docs/DEVELOPMENT-CHECKLIST.md) for the release checklist.

## Deployment preparation

The repository includes a Render API blueprint at `render.yaml` and a Vercel SPA rewrite at `client/vercel.json`; these prepare deployment but do not deploy the application.

1. Deploy the API from the Render blueprint and set `MONGO_URI`, `JWT_SECRET`, and `CLIENT_URL` in the Render dashboard. Use an Atlas database user with a newly rotated password and least-privilege access.
2. Deploy the `client` directory as the Vercel project root. Set `VITE_API_URL` to the deployed API origin ending in `/api`.
3. Set `CLIENT_URL` to the exact deployed Vercel origin. The blueprint configures `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true` for a cross-site HTTPS client/API setup.
4. Confirm `/api/health`, registration, login, logout, CSRF-protected mutations, and database connectivity using test accounts before launch.
5. Restrict database network access to the hosting provider where practical. Never commit `.env` files or expose server secrets through Vite variables.

**Credential hygiene:** a MongoDB database password was previously exposed in shared project text. Rotate it in MongoDB Atlas before deploying or reusing the connection, then update the private `MONGO_URI` in the hosting environment. Do not paste credentials into chat or source control.
