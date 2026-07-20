# OCRFlow — developer entrypoint.
#
# `make help` lists every target. Docker targets drive the full-stack
# docker-compose.yml at the repo root; the `be-*` / `fe-*` targets are for
# host-based development (activate your Python venv first for the backend ones).

COMPOSE     ?= docker compose
GPU_OVERLAY := backend/docker/docker-compose.gpu.yml
PROFILE     := --profile all
BACKEND     := backend
FRONTEND    := frontend

# Pretty, self-documenting help built from `##` / `##@` comments.
.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nOCRFlow — make targets\n\nUsage: make \033[36m<target>\033[0m\n"} \
		/^[a-zA-Z0-9_-]+:.*?##/ { printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2 } \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)
	@echo ""

##@ Docker — full stack

.PHONY: up
up: ## Build + start the whole stack in the background (frontend + gateway + providers + db)
	$(COMPOSE) $(PROFILE) up -d --build

.PHONY: up-fg
up-fg: ## Same as `up` but in the foreground (streams logs, Ctrl-C to stop)
	$(COMPOSE) $(PROFILE) up --build

.PHONY: gpu-up
gpu-up: ## Start the full stack with the NVIDIA GPU overlay
	$(COMPOSE) -f docker-compose.yml -f $(GPU_OVERLAY) $(PROFILE) up -d --build

.PHONY: down
down: ## Stop and remove the stack's containers
	$(COMPOSE) $(PROFILE) down

.PHONY: down-v
down-v: ## Stop the stack and delete its volumes (Postgres data, models, uploads)
	$(COMPOSE) $(PROFILE) down -v

.PHONY: restart
restart: down up ## Recreate the stack from scratch

.PHONY: build
build: ## Build all images without starting anything
	$(COMPOSE) $(PROFILE) build

.PHONY: ps
ps: ## Show the status of stack containers
	$(COMPOSE) $(PROFILE) ps

.PHONY: logs
logs: ## Follow logs from all services (make logs S=gateway for one)
	$(COMPOSE) $(PROFILE) logs -f $(S)

.PHONY: db-migrate
db-migrate: ## Run Alembic migrations inside the gateway container
	$(COMPOSE) run --rm gateway alembic upgrade head

##@ Backend — host dev (activate your venv first)

.PHONY: be-install
be-install: ## Install backend runtime + dev dependencies
	cd $(BACKEND) && pip install -r requirements.txt -r requirements-dev.txt

.PHONY: be-migrate
be-migrate: ## Apply Alembic migrations against your local DATABASE_URL
	cd $(BACKEND) && alembic upgrade head

.PHONY: be-api
be-api: ## Run the FastAPI app with autoreload on :8000
	cd $(BACKEND) && uvicorn app.main:app --reload --port 8000

.PHONY: be-worker
be-worker: ## Run a Celery worker for background jobs
	cd $(BACKEND) && celery -A app.celery_app:celery_app worker --loglevel=info

.PHONY: be-test
be-test: ## Run the backend test suite (skips GPU tests)
	cd $(BACKEND) && pytest -m "not gpu"

##@ Frontend — host dev

.PHONY: fe-install
fe-install: ## Install frontend dependencies
	cd $(FRONTEND) && npm install

.PHONY: fe-dev
fe-dev: ## Run the Next.js dev server on :3000
	cd $(FRONTEND) && npm run dev

.PHONY: fe-build
fe-build: ## Production build of the frontend
	cd $(FRONTEND) && npm run build

.PHONY: fe-test
fe-test: ## Run frontend tests (vitest)
	cd $(FRONTEND) && npm run test

.PHONY: fe-lint
fe-lint: ## Lint the frontend (eslint)
	cd $(FRONTEND) && npm run lint

##@ Combined

.PHONY: install
install: be-install fe-install ## Install both backend and frontend dependencies

.PHONY: test
test: be-test fe-test ## Run backend and frontend test suites
