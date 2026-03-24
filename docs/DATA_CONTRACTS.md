# Data contracts

Canonical shapes for REST JSON bodies and embedded documents. JSON Schema sources live under [`contracts/`](../contracts/).

**Work-plan interactions (Part 1–3):** see [`PART_INTERACTIONS.md`](PART_INTERACTIONS.md) and the machine-readable registry [`../contracts/part-interactions.json`](../contracts/part-interactions.json).

Global conventions:

- **Dates:** ISO 8601 strings (e.g. `2025-03-24T12:00:00Z`) unless noted.
- **IDs:** String ObjectIds (MongoDB) in API responses.
- **Errors:** `{ "detail": string | object }` (FastAPI default) or `{ "error": string, "code"?: string }` if unified handler added later.

---

## Auth

### `POST /api/auth/register`

**Request body**

| Field | Type | Required |
|-------|------|----------|
| `email` | string (email) | yes |
| `password` | string (min length TBD in validation) | yes |

**Response `201`:** same shape as Login token payload + user summary — see [`auth-responses.schema.json`](../contracts/auth-responses.schema.json).

### `POST /api/auth/login`

**Request body:** `email`, `password`

**Response `200`:** access token + user; schema [`auth-responses.schema.json`](../contracts/auth-responses.schema.json).

### `GET /api/auth/me`

**Response `200`:** user + optional embedded settings summary.

---

## Settings

### `GET /api/settings`

**Response `200`:** full settings object — [`user-settings.schema.json`](../contracts/user-settings.schema.json).

### `PATCH /api/settings`

**Request body:** partial object; only defined keys updated (JSON Merge Patch semantics or explicit Pydantic optional fields).

---

## Entries

### `POST /api/entries`

Creates an entry; may include multipart `audio` and/or JSON fields per implementation.

**Core resource shape:** [`journal-entry.schema.json`](../contracts/journal-entry.schema.json).

### `GET /api/entries`

Query params: `limit`, `offset`, optional `from`, `to` date filter.

**Response `200`:** `{ "items": JournalEntry[], "total"?: number }`

### `GET /api/entries/{id}`

**Response `200`:** full `JournalEntry`.

### `PATCH /api/entries/{id}`

**Request body:** partial entry; includes `insights` and `insights_field_locks` updates. Server must refuse to overwrite locked insight keys when processing `POST .../analyze` (not on PATCH—user may unlock).

### `DELETE /api/entries/{id}`

**Response `204`**

---

## Insights and analysis

Embedded in `JournalEntry`:

- `insights`: object matching [`insights.schema.json`](../contracts/insights.schema.json).
- `insights_field_locks`: array of dot-path or top-level keys that AI re-run must not replace (e.g. `["summary", "insights.projects"]` — exact convention TBD in implementation; document in schema `description` if needed).

### `POST /api/entries/{id}/analyze`

**Request body (optional):** `{ "preserve_locked_fields": true }` (default true)

**Response `200`:** updated `JournalEntry`.

---

## Projects

### `GET /api/projects`

**Response `200`:** `{ "items": Project[] }`

Project fields (minimal): `id`, `user_id`, `title`, `normalized_name`, `description?`, `first_seen_at`, `last_mentioned_at`, `related_entry_ids[]`, `status?`

### `PATCH /api/projects/{id}`

Partial update for user-driven rename/status.

---

## Calendar

### `GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD`

**Response `200`:**

```json
{
  "days": [
    {
      "date": "2025-03-24",
      "entry_ids": ["..."],
      "count": 0
    }
  ]
}
```

`entry_ids` may be omitted when `count` only is needed (implementation choice—pick one and keep stable).

---

## Health

### `GET /api/health`

```json
{
  "status": "ok",
  "database": "connected"
}
```
