# Contracts

JSON Schema files describe portable data shapes shared by the API (`app/`), the web client (`web/`), and tests.

| File | Purpose |
|------|---------|
| [`auth-responses.schema.json`](auth-responses.schema.json) | Login/register/me token + user envelope |
| [`user-settings.schema.json`](user-settings.schema.json) | User preferences document |
| [`journal-entry.schema.json`](journal-entry.schema.json) | Journal entry resource |
| [`insights.schema.json`](insights.schema.json) | AI-extracted structured insights |
| [`project.schema.json`](project.schema.json) | `Project` resource (`GET/PATCH /api/projects`) |
| [`calendar-response.schema.json`](calendar-response.schema.json) | `GET /api/calendar` response |

Human-readable endpoint mapping: [`../docs/DATA_CONTRACTS.md`](../docs/DATA_CONTRACTS.md).
