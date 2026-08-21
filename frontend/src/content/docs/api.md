---
title: API
description: REST surface for auth, projects, pipelines, jobs, models, analytics, and admin.
---

Base path: `/api/v1` on the gateway (`http://localhost:8000` in host dev). Browser apps call the Next.js BFF under `/api/...`, which attaches the session cookie. Headless clients send `Authorization: Bearer <jwt>`.

OpenAPI is served by FastAPI at `/docs` on the gateway.

## Auth and account

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Signup (auto-login) |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Current user |
| PATCH | `/account/profile` | Name / profile |
| PATCH | `/account/preferences` | UI preferences |

## Projects and assets

| Method | Path | Purpose |
| --- | --- | --- |
| GET, POST | `/projects` | List / create |
| GET, PATCH, DELETE | `/projects/{id}` | CRUD |
| POST | `/projects/{id}/assets` | Upload |
| POST | `/projects/{id}/assets/batch` | Bulk upload |
| GET, DELETE | `/projects/{id}/assets/{assetId}` | Get / delete |
| POST | `/projects/{id}/runs` | Canvas / full run |
| POST | `/projects/{id}/batch-runs` | Batch project runs |
| GET | `/projects/{id}/runs`, `/runs/{runId}` | Status |
| POST | `/projects/{id}/runs/{runId}/cancel` | Cancel |

## Pipelines

| Method | Path | Purpose |
| --- | --- | --- |
| GET, POST | `/pipelines` | List / create |
| GET, PATCH, DELETE | `/pipelines/{id}` | CRUD + graph save |
| POST | `/pipelines/{id}/logo` | Logo |
| POST | `/pipelines/{id}/assets/batch` | Job uploads |
| POST | `/pipelines/{id}/runs` | Headless run `{asset_id, project_id}` |
| GET | `/pipelines/{id}/runs/{runId}` | Result payload |
| POST | `/pipelines/{id}/runs/{runId}/cancel` | Cancel |

## Jobs

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/pipelines/{id}/jobs` | Start batch |
| GET | `/jobs` | List |
| GET | `/jobs/{id}` | Job + per-document runs |
| POST | `/jobs/{id}/cancel` | Cancel |

## Models and runtime

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/models/` | Catalog |
| GET | `/models/categories` | Category metadata |
| GET | `/models/runtime` | Provider health |
| GET | `/models/{model_id}` | One model |
| POST | `/models/{provider}/{task}` | Inference |
| GET | `/models/{provider}/{task}/health` | Per-task health |

Example headless pipeline:

```bash
curl -H "Authorization: Bearer $TOKEN" -F file=@doc.pdf \
  http://localhost:8000/api/v1/projects/$PROJECT_ID/assets

curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"asset_id\":\"$ASSET_ID\",\"project_id\":\"$PROJECT_ID\"}" \
  http://localhost:8000/api/v1/pipelines/$PIPELINE_ID/runs

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/pipelines/$PIPELINE_ID/runs/$RUN_ID
```

## Analytics

| Prefix | Scope |
| --- | --- |
| `/analytics/*` | Current user |
| `/analytics/export` | User CSV |
| `/admin/analytics/*` | Platform-wide |

## Admin

| Method | Path | Purpose |
| --- | --- | --- |
| GET, POST | `/admin/users` | List / create |
| PATCH, DELETE | `/admin/users/{id}` | Role / deactivate |
| GET, PATCH | `/members` | Members |

Guards: `require_member_manager` (admin + view_admin), `require_admin` (admin only).
