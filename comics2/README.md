# Comics Reader (modularized)

A modular Flask backend paired with a Vue 3 + Tailwind front-end for browsing local comics.

## Backend

- Location: `backend/`
- Config via env vars:
  - `COMICS_BASE_DIR`: root directory containing series folders.
  - `COMICS_IMAGE_QUALITY`: JPEG quality for on-the-fly conversion (default 70).
  - `COMICS_MAX_FILES`: max files returned per chapter (default 2000).
  - `COMICS_CORS_ORIGINS`: CORS origins for `/api/*` (default `*`).

### Run dev server

```bash
pip install -r requirements.txt
python app.py
```

API endpoints (all under `/api`):
- `GET /api/series`
- `GET /api/seasons/<series>`
- `GET /api/chapters/<series>/<season>`
- `GET /api/chapter/<series>/<season>/<chapter>`
- `GET /api/content/<series>/<season>/<chapter>/<filename>`
- `GET /api/health`

## Frontend

- Location: `frontend/` (Vite + Vue 3 + TypeScript + Tailwind)
- Dev server (proxy to backend on :5000):

```bash
cd frontend
npm install
npm run dev
```

- Build static assets:

```bash
npm run build
```

Build output goes to `frontend/dist` and is served automatically by Flask if present.
