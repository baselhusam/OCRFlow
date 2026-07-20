# Contributing to OCRFlow

Thanks for your interest in improving OCRFlow! This guide covers how to get set
up, the conventions we follow, and how to get a change merged.

By participating you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting set up

The fastest path is Docker + `make` (see the [README](README.md#-getting-started)):

```bash
cp backend/docker/.env.example backend/docker/.env
make up            # frontend :3000, API :8000
make db-migrate
```

For host-based development:

```bash
make install       # backend (venv active) + frontend deps
make be-migrate    # apply migrations
make be-api        # FastAPI on :8000
make be-worker     # Celery worker (separate terminal)
make fe-dev        # Next.js on :3000
```

Run `make help` for the full list of targets.

## Before you open a pull request

Please make sure the same checks CI runs pass locally:

```bash
make test          # backend pytest (non-GPU) + frontend vitest
make fe-lint       # eslint
```

- **Backend tests** need Postgres and Redis running (`make up` provides both, or
  point `DATABASE_URL` / `REDIS_URL` at your own). GPU tests are marked
  `@pytest.mark.gpu` and skipped by default — run them with `pytest -m gpu` on a
  CUDA host.
- **New behavior** should come with tests. Bug fixes should include a test that
  fails before the fix.
- **Database schema changes** require an Alembic migration
  (`cd backend && alembic revision --autogenerate -m "…"`), committed alongside
  the model change.

## Commit and PR conventions

- Write clear, imperative commit subjects (e.g. `fix: handle empty page list`).
  We loosely follow [Conventional Commits](https://www.conventionalcommits.org/)
  prefixes (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`).
- Keep pull requests focused; describe what changed and why, and link any
  related issue.
- Ensure CI is green before requesting review.

## Reporting bugs and requesting features

Open a [GitHub issue](https://github.com/baselhusam/OCRFlow/issues) with clear
reproduction steps (for bugs) or a description of the use case (for features).
For security issues, please follow [SECURITY.md](SECURITY.md) instead of opening
a public issue.

## Project layout

| Path         | What lives there                                            |
|--------------|-------------------------------------------------------------|
| `backend/`   | FastAPI service, model runners, Celery tasks, Alembic       |
| `frontend/`  | Next.js app (canvas UI + landing)                           |
| `docs/`      | GitHub Pages site                                           |
| `branding/`  | Logos, brand guidelines                                     |

See `backend/.cursor/PROJECT.md` for a deeper tour of the backend package layout.
