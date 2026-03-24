# `src/api`

- Centralize `fetch` wrappers, JWT header injection, and error parsing.
- Align request/response types with [`../../contracts`](../../contracts) and [`../../docs/DATA_CONTRACTS.md`](../../docs/DATA_CONTRACTS.md).

Install dependencies **only inside Docker** ([`Dockerfile`](../../Dockerfile), [`Dockerfile.dev`](../../Dockerfile.dev), or `docker compose … up --build`). **Do not run `npm` on the host** for this repo. Secrets and API base URL: repo-root `.env` and [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md).
