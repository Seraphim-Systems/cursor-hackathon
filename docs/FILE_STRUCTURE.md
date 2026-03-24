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
│   ├── PART_INTERACTIONS.md      # P1–P3 × endpoints × schemas; links part-interactions.json
│   ├── DEPLOYMENT.md             # Git secrets / CI injection, production checklist
│   └── FILE_STRUCTURE.md         # this file
├── contracts/                    # JSON Schemas (data contracts)
│   ├── README.md
│   ├── part-interactions.json    # machine-readable P1–P3 interaction registry
│   ├── health.schema.json
│   ├── auth-request.schema.json
│   ├── auth-responses.schema.json
│   ├── me-response.schema.json
│   ├── user-settings.schema.json
│   ├── journal-entry.schema.json
│   ├── entry-patch.schema.json
│   ├── entry-list.schema.json
│   ├── insights.schema.json
│   ├── analyze-request.schema.json
│   ├── ai-analysis-payload.schema.json
│   ├── project-resource.schema.json
│   ├── project-patch.schema.json
│   ├── project-list.schema.json
│   └── calendar-response.schema.json
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
