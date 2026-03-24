# `src/api`

- Centralize `fetch` wrappers, JWT header injection, and error parsing.
- Align request/response types with [`../../contracts`](../../contracts) and [`../../docs/DATA_CONTRACTS.md`](../../docs/DATA_CONTRACTS.md).

Dependency installs happen **inside Docker** (`Dockerfile` / `Dockerfile.dev`); do not run `npm install` on the host unless you choose to work outside containers. Secrets and API base URL: repo-root `.env` and [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md).
