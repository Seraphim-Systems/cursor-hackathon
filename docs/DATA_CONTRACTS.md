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

Creates an entry from JSON (`application/json`) or `multipart/form-data` with optional file field `audio` (and optional `metadata` JSON string for the same fields as the JSON body). When `audio` is present, the server stores it via `IAudioStorage`, runs the configured `ITranscriber`, and sets `audio_storage_key` and `transcript` on the new entry.

**Core resource shape:** [`journal-entry.schema.json`](../contracts/journal-entry.schema.json).

### `GET /api/entries`

Query params: `limit`, `offset`, optional `from`, `to` date filter.

**Response `200`:** `{ "items": JournalEntry[], "total"?: number }`

### `GET /api/entries/{id}`

**Response `200`:** full `JournalEntry`.

### `PATCH /api/entries/{id}`

**Request body:** partial entry; includes `insights` and `insights_field_locks` updates. For partial `insights`, the server keeps locked subfields (see `insights_field_locks` below); clients may remove paths from `insights_field_locks` to edit those fields. `POST .../analyze` must still skip locked paths when merging AI output.

### `POST /api/entries/{id}/upload-audio`

**Request:** `multipart/form-data` with file field `audio`.

**Response `200`:** full `JournalEntry` with `audio_storage_key` and `transcript` populated after running the configured `ITranscriber`. `source` becomes `audio` unless `cleaned_text` was already set, in which case `source` is `mixed`.

### `DELETE /api/entries/{id}`

**Response `204`**

---

## Insights and analysis

Embedded in `JournalEntry`:

- `insights`: object matching [`insights.schema.json`](../contracts/insights.schema.json).
- `insights_field_locks`: array of paths that AI re-run must not replace: `summary`, `sentiment_score`, `insights` (entire nested object), or `insights.<key>` for `key_points`, `projects`, `goals`, `blockers`, `people`, `priorities`, `themes`. On `PATCH`, partial `insights` bodies leave locked subfields unchanged; clients clear a path from this array to edit that field again.

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

Requires `Authorization: Bearer <JWT>` (see §Auth). Entries are grouped by **calendar date** in the user’s `settings.timezone` when set (IANA name); otherwise **UTC**.

JSON Schema: [`calendar-response.schema.json`](../contracts/calendar-response.schema.json).

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

Every day in the requested inclusive range appears once (chronological order). `entry_ids` and `count` are both present; `count` matches `len(entry_ids)`.

---

## Health

### `GET /api/health`

```json
{
  "status": "ok",
  "database": "connected"
}
```
