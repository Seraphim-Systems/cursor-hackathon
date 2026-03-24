# Journal API (Python)

## Local virtualenv (`.venv`)

Use a **`.venv` inside this directory** for IDE support, `pytest`, and running Uvicorn on the host (optional; Compose remains the default for the full stack).

Requires **Python 3.12+**.

```bash
cd app
python3.12 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -U pip
pip install -r requirements.txt -r requirements-dev.txt
```

Run the API (from **`app/`** so package `app` resolves):

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Tests:

```bash
source .venv/bin/activate
pytest
```

Copy the repo-root [`.env.example`](../.env.example) to **`../.env`** or place a `.env` next to the code if you run only the API locally; `app.config.Settings` reads `.env` from the process working directory.

The `.venv` directory is **gitignored**; do not commit it.
