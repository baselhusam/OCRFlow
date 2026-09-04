---
title: API
description: REST surface for auth, projects, pipelines, developer integrations, jobs, models, analytics, and admin.
---

Base path: `/api/v1` on the gateway (`http://localhost:8000` in host dev). Browser apps call the Next.js BFF under `/api/...`, which attaches the session cookie. Headless clients can send `Authorization: Bearer <jwt>` for the session API, or an API key for the developer API.

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

## Developer API keys

Admins and **Developer** users can create and revoke their own keys in **Account & settings → API keys**. The full secret is displayed only once, and OCRFlow stores a one-way hash. Standard users cannot create or use API keys; admins retain both their own developer access and the platform-wide key view.

| Method | Path | Purpose |
| --- | --- | --- |
| GET, POST | `/account/api-keys` | List / create the current developer's keys (JWT) |
| DELETE | `/account/api-keys/{keyId}` | Revoke a key (JWT) |
| GET | `/account/api-keys/{keyId}/usage` | Per-key request timeline and totals (JWT) |
| GET | `/developer/pipelines` | List pipelines available to a key (`X-API-Key`) |
| POST | `/developer/pipelines/{pipelineId}/documents` | Upload one or many PDF/image files and queue OCR (`X-API-Key`) |
| GET | `/developer/pipelines/{pipelineId}/runs/{runId}` | Poll the JSON result/error (`X-API-Key`) |
| GET | `/developer/jobs/{jobId}` | Poll a batch and its document statuses (`X-API-Key`) |

The upload endpoint accepts repeated multipart `files` fields (up to 50) and `output_format=json`. Uploaded documents are stored in OCRFlow's protected pipeline namespace; arbitrary server output paths are intentionally not accepted. The `202` response includes job and run retrieval paths. Requests, documents, outcomes, errors, pipeline scope, and last activity are tracked for both the developer and admin views.

```python
import requests

base_url = "http://localhost:8000/api/v1"
api_key = "ocrflow_..."  # keep in an environment variable in real applications
headers = {"X-API-Key": api_key}

pipeline_id = requests.get(f"{base_url}/developer/pipelines", headers=headers).json()["items"][0]["id"]
with open("invoice.pdf", "rb") as document:
    queued = requests.post(
        f"{base_url}/developer/pipelines/{pipeline_id}/documents",
        headers=headers,
        files=[("files", ("invoice.pdf", document, "application/pdf"))],
        data={"output_format": "json"},
    )
queued.raise_for_status()
run_id = queued.json()["runs"][0]["id"]
result = requests.get(f"{base_url}/developer/pipelines/{pipeline_id}/runs/{run_id}", headers=headers).json()
```

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
| GET | `/admin/api-keys` | Platform key inventory and usage totals |
| GET | `/admin/api-keys/{keyId}/usage` | Per-key request timeline |
| GET, PATCH | `/members` | Members |

Guards: `require_member_manager` (admin + view_admin), `require_admin` (admin only). API-key usage is readable to view-admins; issuing/revoking remains limited to the owning developer or admin.
