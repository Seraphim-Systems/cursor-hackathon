# Repository file structure (initial)

```text
cursor-hackathon/
├── README.md                    # Docker-only runbook; `.env` + secrets pointers
├── WORK_PLAN.md                 # 3-part breakdown: subtasks + checks + contract refs
├── docker-compose.yml            # mongo + app (API) + web (nginx static build)
├── docker-compose.dev.yml        # overrides: uvicorn --reload + Vite dev + test mounts
├── .env.example                  # Documented vars (copy to `.env`; never commit `.env`)
├── docs/
│   ├── DATA_CONTRACTS.md
│   ├── DEPLOYMENT.md             # Git secrets / CI injection, production checklist
│   └── FILE_STRUCTURE.md         # this file
├── contracts/                    # JSON Schemas (data contracts)
│   ├── README.md
│   ├── auth-responses.schema.json
│   ├── user-settings.schema.json
│   ├── insights.schema.json
│   └── journal-entry.schema.json
├── app/                          # Python FastAPI service (formerly “backend”)
│   ├── README.md                 # .venv, local uvicorn / pytest
│   ├── .venv/                    # local virtualenv (gitignored)
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── pyproject.toml
│   ├── .dockerignore
│   └── app/                      # Import package `app` (uvicorn `app.main:app`)
│       ├── __init__.py
│       ├── main.py
│       ├── config.py
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       └── api/
└── web/                          # React + Vite SPA (formerly “frontend”)
    ├── Dockerfile
    ├── Dockerfile.dev
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── index.html
    ├── .dockerignore
    └── src/
```

`app/tests/` — containerized `pytest` (see [README.md](../README.md)); expand per `WORK_PLAN.md`.
