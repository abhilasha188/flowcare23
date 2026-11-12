# FlowCare

FlowCare is a menstrual health and wellness tracker built with React, Express, and MongoDB. It supports cycle and symptom logging, personal analytics, account settings, reminders, curated educational resources, and a retrieval-grounded educational assistant. Predictions and assistant responses are not medical advice.

## Features

- Secure registration, sign-in, session restoration, CSRF protection, and account settings.
- Cycle tracking with history, calendar, and clearly qualified estimates.
- Daily symptom, mood, energy, sleep, and flow tracking.
- Insights for cycle history, symptoms, moods, and observed patterns.
- User-managed reminders and optional browser notifications while the app is open.
- Curated educational resources with links to their original sources.
- A local Ollama-powered educational assistant that retrieves reviewed knowledge-base content and returns its source links.
- Health-data and account deletion controls with user-scoped data access.

## Tech stack

- **Client:** React, Vite, React Router, Axios, Recharts, Lucide React.
- **API:** Node.js, Express, Mongoose, MongoDB, bcryptjs, JWT cookies.
- **Security:** Helmet, CORS allow-list, CSRF protection, request validation, and rate limiting.

## Local setup

Requirements: Node.js 22.14 or compatible, npm, MongoDB (local or Atlas), and Ollama for assistant features.

1. Configure the API's root `.env`. The server loads this file from the project root. If it already exists, merge the settings from `server/.env.example` into it instead of replacing it; preserve your configured MongoDB URI.
2. Set `MONGO_URI` to a MongoDB URI beginning with `mongodb://` or `mongodb+srv://`, and set `JWT_SECRET` to a random value of at least 32 characters. Generate one with:

   ```sh
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. Configure the client environment using `client/.env.example` as a reference. The Vite development server proxies `/api` to the local API; set `VITE_API_URL` only when using a different API origin.
4. Install the API, client, and root development dependencies, then start both apps from the project root:

   ```sh
   npm ci --prefix server
   npm ci --prefix client
   npm install
   npm run dev
   ```

5. To use the assistant locally, install Ollama and pull its configured models:

   ```sh
   ollama pull qwen2.5:1.5b
   ollama pull nomic-embed-text
   ```

   Ollama must be reachable at `OLLAMA_BASE_URL` (default `http://localhost:11434`). The server does not start Ollama automatically. The rest of FlowCare works without the models; assistant requests report a clear unavailable status.

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
| `OLLAMA_BASE_URL` | Private Ollama API URL; defaults to `http://localhost:11434` for local development. |
| `OLLAMA_CHAT_MODEL` | Chat model; default `qwen2.5:1.5b`. |
| `OLLAMA_EMBED_MODEL` | Embedding model; default `nomic-embed-text`. |
| `OLLAMA_CONTEXT_SIZE` | Maximum model context; default `2048`. |
| `OLLAMA_KEEP_ALIVE` | Ollama model keep-alive duration; default `5m` to reduce reload delays. Models use memory while resident. |
| `AI_MAX_OUTPUT_TOKENS` | Maximum generated tokens; default `300`. |
| `AI_TEMPERATURE` | Chat sampling temperature; default `0.2`. |
| `RAG_VECTOR_INDEX` | Atlas Vector Search index name; default `flowcare_vector_index`. |
| `RAG_TOP_K` | Retrieved chunks; default `3`. |
| `RAG_NUM_CANDIDATES` | Atlas vector candidates; default `30`. |
| `RAG_RELEVANCE_THRESHOLD` | Minimum vector score accepted; default `0.35` (tune against reviewed content). |
| `RAG_CHUNK_SIZE` / `RAG_CHUNK_OVERLAP` | Knowledge chunking in characters; defaults `800` / `100`. |

Only `VITE_*` variables are exposed to browser code. Do not put database credentials, signing secrets, or other server secrets in client environment variables.

## AI assistant and Atlas Vector Search setup

The assistant sends the current question and a small amount of that conversation's chat context to the configured Ollama service. FlowCare does not automatically attach cycle records, symptoms, profile data, or other personal health records. Assistant chat history is private to the signed-in user and is removed by the health-data and account-deletion actions. Deterministic safety checks handle urgent-symptom, diagnosis, and treatment requests before model generation; retrieved sources are displayed only when they were actually used.

### Prepare and ingest reviewed sources

1. Add only reviewed, authorized educational `.md` files or PDFs to `server/knowledge-base/`. Sources must be genuine and their metadata must point to a real HTTPS source page. Do not add user data.
2. Markdown requires YAML-style frontmatter (`title`, `sourceName`, `sourceUrl`, `category`). PDFs require an adjacent `<filename>.pdf.json` metadata file with the same fields. See [server/knowledge-base/README.md](./server/knowledge-base/README.md).
3. Ensure MongoDB is reachable and Ollama is running with the embedding model available, then run:

   ```sh
   npm run ingest:knowledge --prefix server
   ```

   Documents and chunks are processed sequentially. Re-running ingestion skips unchanged documents. The script prints the actual vector dimension returned by `nomic-embed-text`; use that value in the Atlas index configuration below.

### Create the Atlas Vector Search index

1. In MongoDB Atlas, select the database used by `MONGO_URI`, open **Database & Search → Search Indexes**, and create a **Vector Search** index on the `knowledgechunks` collection.
2. Name the index exactly `flowcare_vector_index` (or set `RAG_VECTOR_INDEX` to the chosen name).
3. Use the JSON editor and replace `<DIMENSION_FROM_INGESTION>` with the integer printed by the ingestion script:

   ```json
   {
     "fields": [
       {
         "type": "vector",
         "path": "embedding",
         "numDimensions": <DIMENSION_FROM_INGESTION>,
         "similarity": "cosine"
       }
     ]
   }
   ```

4. Wait for the index status to become **Ready**. If the index is missing, the chat API returns an explicit setup error rather than silently answering without retrieved evidence.

Retrieval uses cosine similarity, up to 30 candidates and the top 3 chunks by default. Scores below `RAG_RELEVANCE_THRESHOLD` are treated as insufficient evidence; in that case, the assistant says it cannot answer from the reviewed knowledge base.

### Local versus hosted Ollama

For local development, `http://localhost:11434` refers to the same machine running the API. A cloud API hosted on Render or another provider cannot use `localhost` to reach Ollama on your laptop. For a hosted deployment, run Ollama on a private server/network reachable by the API, or deploy a compatible model service behind private networking and authenticated TLS. Do not expose Ollama directly to the public internet. Keep the API's model endpoint in a server-side environment variable and apply network access controls.

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
| `GET` | `/ai/health` | Auth | Assistant, model, and knowledge-base status. |
| `POST` | `/ai/chat` | Auth + CSRF | Ask a reviewed-source-grounded educational question. |
| `GET` | `/ai/history`, `/ai/conversations` | Auth | Read the current user's chat messages and conversation list. |
| `DELETE` | `/ai/conversations/:conversationId` | Auth + CSRF | Delete a conversation owned by the current user. |
| `POST` | `/ai/feedback` | Auth + CSRF | Submit helpful/not-helpful feedback for an assistant reply. |
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
npm run ingest:knowledge # requires MongoDB, Ollama, models, and reviewed documents

# Client
cd ../client
npm test
npm run lint
npm run build
```

See [docs/DEVELOPMENT-CHECKLIST.md](./docs/DEVELOPMENT-CHECKLIST.md) for the release checklist.

## Deployment preparation

The repository root `vercel.json` configures two Vercel services: the Vite client and the Express API. `/api/*` is rewritten to `flowcare-api`; all other paths are routed to `client`. The API service is reached through the public rewrite and does not need a client-to-API service binding.

1. Import the repository into Vercel with the repository root as the project root so Vercel reads `vercel.json`.
2. Set server-side environment variables for the API service: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (the exact shared Vercel origin), `NODE_ENV=production`, `COOKIE_SAME_SITE=lax`, and `COOKIE_SECURE=true`. Use a least-privilege MongoDB user and rotate any previously exposed password.
3. Set `OLLAMA_BASE_URL` to an Ollama service reachable by the Vercel API function. The local default `http://localhost:11434` will not reach Ollama from Vercel; keep the model endpoint private and authenticated.
4. Production client builds always use the same-origin `/api` path; `VITE_API_URL` is only honored during local development. Remove any old `VITE_API_URL` override from Vercel; do not put server secrets in `VITE_*` variables.
5. Confirm `/api/health`, registration, login, logout, CSRF-protected mutations, and database connectivity using test accounts before launch. The Vercel API entrypoint connects to MongoDB at runtime; it does not read the local `.env` file.
6. Restrict database and model-service network access to the API where practical. Never commit `.env` files or expose server secrets through Vite variables.

**Credential hygiene:** a MongoDB database password was previously exposed in shared project text. Rotate it in MongoDB Atlas before deploying or reusing the connection, then update the private `MONGO_URI` in the hosting environment. Do not paste credentials into chat or source control.
