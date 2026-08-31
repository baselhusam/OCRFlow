---
title: Admin
description: Roles, the admin panel, user management, and platform-wide analytics.
---

The **Admin panel** (`/app/admin`) is hidden unless the signed-in user has `admin` or `view_admin`. Everyone else is redirected to `/app`.

## Roles

| Role | Write canvases / projects | Admin panel | Manage users |
| --- | --- | --- | --- |
| `user` | Yes | No | No |
| `view_admin` | No | Yes (read) | No |
| `admin` | Yes | Yes | Yes |

`view_admin` is an observer: inventory, analytics, user list. They cannot create users or change roles. `admin` can.

The first account whose email matches `ADMIN_EMAIL` is promoted on register/login. Set that in the gateway environment before the first signup.

## Users page

The **Users** page (`/app/admin/users`) is the account directory for the instance. It shows every account with its role, account status, projects, runs, pages processed, last login, and latest run.

Sortable columns: user, role, projects, runs, last login, last run, status.

Admins can:

- Create a user
- Change roles
- Change a password
- Suspend or reactivate an account
- Permanently delete an account and its owned projects, runs, and activity

OCRFlow protects the signed-in account, the account configured through `ADMIN_EMAIL`, and the final active administrator from being suspended, demoted, or deleted.

View-admins see the same table read-only.

## Analytics tab

Admin analytics uses `/api/v1/admin/analytics/*` and is **not** filtered by `owner_id`. Sub-tabs:

| Tab | Contents |
| --- | --- |
| Overview | Platform inventory — projects, nodes, definitions, models, files, totals, pages, runs today, success rate, complexity |
| Engagement | Active users, platform health (errors), user leaderboard |
| Pipelines | Pipeline-focused platform stats |
| Breakdown | Cross-workspace tables, including `owner_email` on projects |
| Timeline | Activity deep dive for the instance |

Limits are higher than the user dashboard (for example more recent runs and models). Export uses the admin export URL.

Shared chart components (outcomes, model usage, activity) are reused; the difference is **scope**.

## Members API

Role changes also flow through `/api/v1/members` for listing and patches. UI user management is the supported path; do not grant admin by editing Postgres unless you are recovering a lockout.

## Security

Treat admin as production access to every tenant on the instance. Rotate `SECRET_KEY`, keep the panel off the public internet if that is your threat model, and prefer `view_admin` for stakeholders who only need dashboards.
