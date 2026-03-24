# Journal app

Run the full stack with **Docker Compose**. The web UI can stay container-only; for the **Python API** you may optionally use a local **[`app/.venv`](app/README.md)** (see [`app/README.md`](app/README.md)) for tests, debugging, and editor tooling.

## Quick start

1. **Install** [Docker](https://docs.docker.com/get-docker/) with the Compose plugin (`docker compose version`).
2. **Configure:** `cp .env.example .env` and edit `.env` (set a strong `JWT_SECRET` if the stack is reachable beyond your machine). All keys are listed in [`.env.example`](.env.example); see [Environment variables](#environment-variables) below.
3. **Run:** `docker compose up --build` from the repo root, then open the URLs in the table below.

Verify the API: `curl -s http://localhost:8000/api/health` should return JSON with `"status": "ok"`.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with the Compose plugin (`docker compose version`)
- **Optional (API only):** Python 3.12+ if you use [`app/.venv`](app/README.md)

## Configuration and secrets (local)

Compose reads a repo-root **`.env`** file automatically for variable substitution (same keys as [`.env.example`](.env.example)). That file is **gitignored** — copy the example and set at least a strong `JWT_SECRET` for anything beyond local throwaway use.

```bash
cp .env.example .env
# edit .env — use e.g. openssl rand -hex 32 for JWT_SECRET in shared environments
```

**Deployment:** inject the same variables from your CI/CD **encrypted secrets** (e.g. GitHub Actions); see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string (Compose default: `mongodb://mongo:27017`) |
| `MONGODB_DB_NAME` | Database name (default: `journal`) |
| `JWT_SECRET` | Signing key for access tokens (change for non-local use) |
| `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES` | JWT algorithm and token lifetime |
| `AUDIO_STORAGE_PATH` | Where the API stores uploaded audio inside the container |
| `CORS_ORIGINS` | Comma-separated browser origins allowed to call the API |
| `OPENAI_API_KEY` | Optional; required when using OpenAI-backed transcription or analysis |
| `TRANSCRIPTION_PROVIDER` | `stub`, `openai`, or `http_stt` (if unset in Compose, default is `http_stt` to use the bundled STT service) |
| `STT_*` | HTTP STT adapter (`STT_BASE_URL`, path, form field, timeout) — see [`.env.example`](.env.example) |
| `AI_ANALYSIS_PROVIDER` | `stub` or provider that uses `AI_OPENAI_*` when configured |
| `AI_OPENAI_BASE_URL`, `AI_OPENAI_MODEL`, `AI_HTTP_TIMEOUT_SECONDS` | OpenAI-compatible analysis endpoint and model |
| `VITE_API_URL` | API base URL baked into the **web** image at build time (browser calls this host) |

Full defaults and comments: [`.env.example`](.env.example).

## Production-like stack (nginx + API)

Build and start MongoDB, speech-to-text (`stt`), API (`app`), and static web UI (`web`):

```bash
docker compose up --build
```

| Service | URL / port |
|--------|-----|
| Web UI | http://localhost |
| API | http://localhost:8000 |
| OpenAPI | http://localhost:8000/api/docs |
| Health | http://localhost:8000/api/health |
| MongoDB | `localhost:27017` (optional host access) |
| STT (Whisper ASR, optional for host debugging) | http://localhost:9000 |

Stop: `docker compose down` (add `-v` to drop named volumes).

## Development stack (hot reload)

API auto-reload and Vite dev server via Docker:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Service | URL |
|--------|-----|
| Web UI | http://localhost:5173 |
| API | http://localhost:8000 |
| OpenAPI | http://localhost:8000/api/docs |
| Health | http://localhost:8000/api/health |

The Python package is mounted from [`app/app/`](app/app/); the web app from [`web/`](web/). `web` uses a container `node_modules` volume so the host does not need `npm install`.

## API tests

**With local `.venv`** (from [`app/README.md`](app/README.md)):

```bash
cd app && source .venv/bin/activate && pytest
```

**Inside Docker** (dev image mounts `app/tests`):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml run --rm app pytest
```

## Regenerating `web/package-lock.json` (optional)

Only when `package.json` dependencies change. From repo root (**no local Node**):

```bash
docker run --rm -v "$(pwd)/web:/app" -w /app node:20-alpine sh -c "npm install"
```

Commit the updated `package-lock.json` if you want reproducible `npm ci` builds.

## Work breakdown and API contracts

- [app/README.md](app/README.md) — Python `.venv`, local `uvicorn` / `pytest`
- [WORK_PLAN.md](WORK_PLAN.md) — 3 parts, subtasks, checks
- [docs/DATA_CONTRACTS.md](docs/DATA_CONTRACTS.md) — REST shapes
- [docs/PART_INTERACTIONS.md](docs/PART_INTERACTIONS.md) — Part 1–3 interactions (human-readable)
- [contracts/part-interactions.json](contracts/part-interactions.json) — same mapping (machine-readable)
- [docs/FILE_STRUCTURE.md](docs/FILE_STRUCTURE.md) — repository layout
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — secrets and CI/CD
