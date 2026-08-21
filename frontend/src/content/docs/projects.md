---
title: Projects
description: Owner-scoped canvases for designing, testing, and iterating on OCR graphs.
---

A **project** is your scratchpad. Upload documents, drop models, wire them, test individual nodes, and run the whole graph. Projects are owner-scoped: you see yours; admins can see platform-wide counts in analytics.

## Create a project

From **Projects** in the workspace sidebar, open **Create project**. That calls `POST /api/v1/projects` and sends you to the canvas at `/app/projects/{id}/canvas`.

Give it a name you will recognize in analytics and jobs later. You can archive or edit metadata from the project card menu.

## What the canvas can do

- Drag models from the left **palette**, grouped by provider and category.
- Upload files onto loader nodes (`POST /api/v1/projects/{id}/assets`, plus batch upload).
- **Test-run** a single node to inspect outputs without executing the rest of the graph.
- Run the **full project graph** (`POST /api/v1/projects/{id}/runs`) or a batch of project runs.
- Drop a saved pipeline in as a **custom pipeline** composite node.
- Select a subgraph and **Create pipeline from canvas** — file loaders are stripped so the pipeline has a clean I/O boundary.

## Assets

Documents belong to the project. Loaders reference those assets. When you later create a **job**, you upload a separate batch against the pipeline; job assets are not the same records as experimental project files, even if the bytes look similar.

## Runs vs jobs

A project run is for **you, on this canvas**. A [job](/documentation/jobs) is for **a ready pipeline, many documents**. Use project runs while designing. Use jobs when the graph is stable.

## Filters

The projects list supports active vs archived and the usual sort/filter controls. Archived projects stay out of the way without deleting history.

## Permissions

Roles that can write (`user`, `admin`) create and edit projects. `view_admin` can open the admin panel but cannot mutate canvases — see [Admin](/documentation/admin).
