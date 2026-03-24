# Deployment and secrets

## Principles

1. **Never commit real secrets.** The repo tracks [`.env.example`](../.env.example) only. `.env` is gitignored.
2. **Local:** copy `.env.example` → `.env`, adjust values, run `docker compose up`.
3. **CI/CD:** store secret values in your platform’s **encrypted secrets** (e.g. GitHub Actions **Secrets and variables**), then inject them at deploy time—do not bake secrets into images.

## Local `.env`

From the repository root:

```bash
cp .env.example .env
```

Edit `.env`. At minimum set a strong `JWT_SECRET` (e.g. `openssl rand -hex 32`) before any shared or production-like environment.

Compose **automatically loads** `.env` for `${VAR}` substitution in `docker-compose.yml` when you run commands from that directory.

## GitHub Actions (example)

Define repository secrets, e.g. `JWT_SECRET`, `MONGODB_URI`, `OPENAI_API_KEY`, and any other keys from `.env.example`.

In a workflow job, create a short-lived `.env` for Compose **without printing values**:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Write .env for Compose
        env:
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
        run: |
          cat > .env <<EOF
          JWT_SECRET=${JWT_SECRET}
          MONGODB_URI=${MONGODB_URI}
          OPENAI_API_KEY=${OPENAI_API_KEY}
          VITE_API_URL=${VITE_API_URL}
          EOF
      - name: Build and start
        run: docker compose up --build -d
```

Use **environments** and **protection rules** for production secrets. Prefer OIDC to a cloud secret manager instead of duplicating secrets in GitHub when possible.

## Storage volumes

- **MongoDB:** named volume `mongo_data` (see [`docker-compose.yml`](../docker-compose.yml)).
- **Audio uploads:** named volume `audio_uploads`, mounted at `AUDIO_STORAGE_PATH` inside the `app` service.

Back up volumes or use managed MongoDB / object storage in production.

## Production checklist

- [ ] `JWT_SECRET` is long, random, and unique to the environment.
- [ ] `CORS_ORIGINS` lists only real front-end origins.
- [ ] `VITE_API_URL` matches the public API URL used by browsers when building the `web` image.
- [ ] `MONGODB_URI` points at a secured database (TLS, auth, network isolation).
- [ ] `OPENAI_API_KEY` (if used) is supplied via secret store, not the image.
- [ ] `.env` is not present in the image context (only passed at runtime / build args that are not secrets—prefer runtime env for API keys).

## Optional: root `.env` and Compose `env_file`

Service-level `env_file: .env` duplicates what Compose already does for interpolation. Keeping secrets in a root `.env` that is **never committed** matches local and ephemeral CI files written from git secrets.
