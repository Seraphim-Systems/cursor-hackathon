# Journal app

Run the full stack with **Docker Compose**. The web UI can stay container-only; for the **Python API** you may optionally use a local **[`app/.venv`](app/README.md)** (see [`app/README.md`](app/README.md)) for tests, debugging, and editor tooling.

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

## Production-like stack (nginx + API)

Build and start MongoDB, API (`app` service), and static web UI (`web` service):

```bash
docker compose up --build
```

| Service | URL |
|--------|-----|
| Web UI | http://localhost |
| API | http://localhost:8000 |
| OpenAPI | http://localhost:8000/api/docs |
| MongoDB | `localhost:27017` (optional host access) |

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

The Python package is mounted from [`app/app/`](app/app/); the web app from [`web/`](web/). The `web` service uses a container-only `node_modules` volume — **do not run `npm install` or `npm` on the host**; use Compose (or `docker compose build web` for a production bundle check).

## API tests

**With local `.venv`** (from [`app/README.md`](app/README.md)):

```bash
cd app && source .venv/bin/activate && pytest
```

**Inside Docker** (dev image mounts `app/tests`):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml run --rm app pytest
```

## Web dependencies (`npm` only inside Docker)

**Do not install Node/npm on the host** for this project. Production UI builds run in [`web/Dockerfile`](web/Dockerfile); dev uses [`web/Dockerfile.dev`](web/Dockerfile.dev) via [`docker-compose.dev.yml`](docker-compose.dev.yml).

To verify a production build:

```bash
docker compose build web
```

### Regenerating `web/package-lock.json` (optional)

Only when [`web/package.json`](web/package.json) dependencies change — still **without** local npm:

```bash
docker run --rm -v "$(pwd)/web:/app" -w /app node:20-alpine sh -c "npm install"
```

Commit the updated `package-lock.json` if you want reproducible `npm ci` builds.

## Work breakdown and API contracts

- [app/README.md](app/README.md) — Python `.venv`, local `uvicorn` / `pytest`
- [WORK_PLAN.md](WORK_PLAN.md) — 3 parts, subtasks, checks
- [docs/DATA_CONTRACTS.md](docs/DATA_CONTRACTS.md) — REST shapes
- [docs/FILE_STRUCTURE.md](docs/FILE_STRUCTURE.md) — repository layout
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — secrets and CI/CD
