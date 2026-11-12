# Development and release checklist

## Before development

- [ ] Use a supported Node.js version (see `server/.node-version`).
- [ ] Configure the root server `.env` and `client/.env` from their example files without overwriting existing credentials.
- [ ] Confirm `MONGO_URI` uses `mongodb://` or `mongodb+srv://`.
- [ ] Use a private MongoDB user with least-privilege access; rotate any credential that has been exposed.
- [ ] Set a random `JWT_SECRET` of at least 32 characters.

## Before merging or release

- [ ] Run `npm test` and `npm run build` in `server/`.
- [ ] Run `npm test`, `npm run lint`, and `npm run build` in `client/`.
- [ ] Verify login, logout, session restoration, CSRF-protected mutations, and unauthorized access behavior.
- [ ] Verify cycle/symptom/reminder ownership: a user cannot read, update, or delete another user's records.
- [ ] Verify settings changes, password-change session invalidation, health-data deletion, and confirmed account deletion with test accounts.
- [ ] Check empty-state and invalid-input behavior for Insights, Symptom Tracker, Settings, Reminders, and Resources.
- [ ] Check date-only logs around local midnight and reminder timestamps with explicit time zones.
- [ ] Verify `/api/health` reports database connectivity and production CORS uses the exact client origin.
- [ ] Verify browser notifications only appear after permission is granted; do not treat them as background delivery.
- [ ] Confirm educational links remain current and preserve source attribution.
- [ ] Confirm AI chat uses only reviewed knowledge chunks, returns real source URLs, and falls back when relevance is below threshold.
- [ ] Verify deterministic handling for urgent symptoms, diagnosis requests, and medication/treatment requests.
- [ ] Verify conversation history, feedback, and deletion are scoped to the signed-in user and health-data deletion also removes AI chat data.
- [ ] Confirm the Atlas Vector Search index uses the dimension reported by the configured Ollama embedding model and is Ready.
- [ ] Confirm Ollama is reachable only through a private, authenticated network in hosted deployments; localhost is for local development only.

## Before production deployment

- [ ] Rotate the previously exposed MongoDB password and update the private hosting secret.
- [ ] Configure the Render API blueprint secrets (`MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`) in the provider dashboard.
- [ ] Configure the Vercel client root as `client/` and set `VITE_API_URL` to the production API `/api` URL.
- [ ] Require HTTPS; use `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none` when the frontend and API are cross-site.
- [ ] Restrict MongoDB network access and enable backups/retention appropriate for health data.
- [ ] Configure the Atlas `flowcare_vector_index` on `knowledgechunks` with the actual ingestion-reported vector dimension.
- [ ] Run knowledge ingestion only for reviewed, authorized educational documents and verify the source metadata before launch.
- [ ] Configure Ollama on the API host or a private network; never expose its unauthenticated API publicly.
- [ ] Test signup, login, refresh/session restoration, logout, and one authenticated write using a non-production account.
- [ ] Confirm logs do not include passwords, tokens, database URIs, or personal health-record contents.
- [ ] Publish a privacy notice and retention/support contact before collecting real user health data.

Deployment configuration in this repository is preparation only; it does not provision infrastructure or deploy the service.
