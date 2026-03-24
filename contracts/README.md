# Contracts

JSON Schema files describe portable data shapes shared by the API (`app/`), the web client (`web/`), and tests.

## Part interactions (P1–P3)

- **[`part-interactions.json`](part-interactions.json)** — machine-readable registry: parts, endpoints, schema references, web surfaces, cross-part flows.
- Human-readable narrative: [`../docs/PART_INTERACTIONS.md`](../docs/PART_INTERACTIONS.md).

## Schema files

| File | Purpose |
|------|---------|
| [`part-interactions.json`](part-interactions.json) | Work-part → endpoint → schema mapping |
| [`health.schema.json`](health.schema.json) | `GET /api/health` |
| [`auth-request.schema.json`](auth-request.schema.json) | `POST /api/auth/register`, `POST /api/auth/login` body |
| [`auth-responses.schema.json`](auth-responses.schema.json) | Login/register token + user envelope |
| [`me-response.schema.json`](me-response.schema.json) | `GET /api/auth/me` |
| [`user-settings.schema.json`](user-settings.schema.json) | User preferences document |
| [`journal-entry.schema.json`](journal-entry.schema.json) | Journal entry resource (response / full shape) |
| [`entry-patch.schema.json`](entry-patch.schema.json) | `PATCH /api/entries/{id}` request body |
| [`entry-list.schema.json`](entry-list.schema.json) | `GET /api/entries` list wrapper |
| [`insights.schema.json`](insights.schema.json) | AI-extracted structured insights (embedded on entry) |
| [`analyze-request.schema.json`](analyze-request.schema.json) | `POST /api/entries/{id}/analyze` body |
| [`ai-analysis-payload.schema.json`](ai-analysis-payload.schema.json) | Validated LLM JSON before mapping to entry fields |
| [`project.schema.json`](project.schema.json) | `Project` resource (`GET/PATCH /api/projects`) |
| [`project-resource.schema.json`](project-resource.schema.json) | Single project resource |
| [`project-patch.schema.json`](project-patch.schema.json) | `PATCH /api/projects/{id}` body |
| [`project-list.schema.json`](project-list.schema.json) | `GET /api/projects` |
| [`calendar-response.schema.json`](calendar-response.schema.json) | `GET /api/calendar` |

Human-readable endpoint mapping: [`../docs/DATA_CONTRACTS.md`](../docs/DATA_CONTRACTS.md).
