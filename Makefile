# OCRFlow — developer entrypoint.
#
# `make help` lists every target. Docker targets drive the full-stack
# docker-compose.yml at the repo root; the `be-*` / `fe-*` targets are for
# host-based development (activate your Python venv first for the backend ones).
#
# Accelerator detection is automatic (`make detect`). Override with
# ACCELERATOR=cpu|nvidia|amd|mlx on any target.

COMPOSE     ?= docker compose
DETECT      := scripts/detect-accelerator.sh
HOST_OCR    := scripts/run-ocr-host.sh
# Default Docker startup is core-only (no OCR providers). Use `make up-all` or
# `make ocr-up` when you want Surya/Docling/Paddle.
CORE_PROFILES := --profile gateway --profile frontend
ALL_PROFILES  := --profile all
BACKEND     := backend
FRONTEND    := frontend

# ---- platform / GPU detection (evaluated once; override ACCELERATOR=...) ----
ACCELERATOR    ?= $(shell $(DETECT) accelerator)
DEVICE         := $(shell ACCELERATOR=$(ACCELERATOR) $(DETECT) device)
SERVE_MODE     := $(shell ACCELERATOR=$(ACCELERATOR) $(DETECT) serve-mode)
OVERLAY        := $(shell ACCELERATOR=$(ACCELERATOR) $(DETECT) overlay)
PADDLE_DEVICE  := $(shell ACCELERATOR=$(ACCELERATOR) $(DETECT) paddle-device)
PADDLE_PLATFORM:= $(shell ACCELERATOR=$(ACCELERATOR) $(DETECT) paddle-platform)
PADDLE_SERVE   := $(shell ACCELERATOR=$(ACCELERATOR) $(DETECT) paddle-serve)

COMPOSE_FILES := -f docker-compose.yml
ifneq ($(strip $(OVERLAY)),)
COMPOSE_FILES += -f $(OVERLAY)
endif
ifneq ($(strip $(PADDLE_PLATFORM)),)
COMPOSE_FILES += -f backend/docker/docker-compose.paddle-amd64.yml
endif

COMPOSE_CMD = $(COMPOSE) $(COMPOSE_FILES)

# Pretty, self-documenting help built from `##` / `##@` comments.
.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nOCRFlow — make targets\n\nUsage: make \033[36m<target>\033[0m\n"} \
		/^[a-zA-Z0-9_-]+:.*?##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 } \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)
	@echo ""
	@$(DETECT)
	@echo ""

##@ Platform

.PHONY: detect
detect: ## Show OS, GPU vendor, device, and which compose overlay will be used
	@$(DETECT)

##@ Docker — full stack

.PHONY: up
up: ## Build + start core stack (frontend + gateway + worker + db; no OCR providers)
	$(COMPOSE) $(CORE_PROFILES) up -d --build

.PHONY: up-core
up-core: up ## Alias for `up` (core stack without OCR microservices)

.PHONY: up-all
up-all: ## Build + start full stack including OCR providers (GPU auto-detected)
ifeq ($(SERVE_MODE),host)
	$(COMPOSE) $(CORE_PROFILES) up -d --build
	$(MAKE) ocr-up ACCELERATOR=$(ACCELERATOR)
else
	$(COMPOSE_CMD) $(ALL_PROFILES) up -d --build
endif

.PHONY: up-fg
up-fg: ## Same as `up` but in the foreground (streams logs, Ctrl-C to stop)
	$(COMPOSE) $(CORE_PROFILES) up --build

.PHONY: gpu-up
gpu-up: up-all ## Full stack with auto-detected GPU (NVIDIA / AMD / Apple host OCR)

.PHONY: nvidia-up
nvidia-up: ## Full stack with the NVIDIA CUDA overlay (Docling + Surya + Paddle)
	$(MAKE) up-all ACCELERATOR=nvidia

.PHONY: amd-up
amd-up: ## Full stack with the AMD ROCm overlay (GPU Docling/Surya, CPU Paddle)
	$(MAKE) up-all ACCELERATOR=amd

.PHONY: down
down: ## Stop and remove the stack's containers (and host OCR processes)
	-$(HOST_OCR) stop
	$(COMPOSE) $(ALL_PROFILES) down

.PHONY: down-v
down-v: ## Stop the stack and delete its volumes (Postgres data, models, uploads)
	-$(HOST_OCR) stop
	$(COMPOSE) $(ALL_PROFILES) down -v

.PHONY: restart
restart: down up ## Recreate the core stack from scratch

.PHONY: build
build: ## Build core images without starting anything
	$(COMPOSE) $(CORE_PROFILES) build

.PHONY: build-ocr
build-ocr: ## Build OCR provider images for the detected accelerator
	$(COMPOSE_CMD) --profile surya --profile docling --profile paddle build surya docling paddle

.PHONY: ps
ps: ## Show the status of stack containers
	$(COMPOSE) $(ALL_PROFILES) ps
	@$(HOST_OCR) status

.PHONY: logs
logs: ## Follow logs from all services (make logs S=gateway for one)
	$(COMPOSE) $(ALL_PROFILES) logs -f $(S)

.PHONY: db-migrate
db-migrate: ## Run Alembic migrations inside the gateway container
	$(COMPOSE) run --rm gateway alembic upgrade head

##@ OCR microservices (optional; hybrid host gateway)

# Provider images listen on published localhost ports 8101/8102/8103 so a host
# `uvicorn` gateway with OCRFLOW_RUNNER_MODE=remote can reach them.
# On Apple Silicon, Docling/Surya run on the host (Metal/MPS); Paddle stays in
# Docker under linux/amd64 because there is no ARM GPU Paddle wheel.

.PHONY: ocr-surya
ocr-surya: ## Start the Surya OCR microservice (:8101), GPU auto-detected
ifeq ($(SERVE_MODE),host)
	$(HOST_OCR) start surya
else
	$(COMPOSE_CMD) --profile surya up -d --build surya
endif

.PHONY: ocr-docling
ocr-docling: ## Start the Docling OCR microservice (:8102), GPU auto-detected
ifeq ($(SERVE_MODE),host)
	$(HOST_OCR) start docling
else
	$(COMPOSE_CMD) --profile docling up -d --build docling
endif

.PHONY: ocr-paddle
ocr-paddle: ## Start the PaddleOCR microservice (:8103), GPU auto-detected
ifeq ($(PADDLE_SERVE),host)
	$(HOST_OCR) start paddle
else
	$(COMPOSE_CMD) --profile paddle up -d --build paddle
endif

.PHONY: ocr-up
ocr-up: ## Start all OCR microservices (each or all; GPU auto-detected)
ifeq ($(SERVE_MODE),host)
	$(HOST_OCR) start surya
	$(HOST_OCR) start docling
	$(COMPOSE_CMD) --profile paddle up -d --build paddle
else
	$(COMPOSE_CMD) --profile surya --profile docling --profile paddle up -d --build surya docling paddle
endif

.PHONY: ocr-down
ocr-down: ## Stop OCR microservices (leaves postgres/redis/gateway alone)
	-$(HOST_OCR) stop
	-$(COMPOSE) stop surya docling paddle
	-$(COMPOSE) rm -f surya docling paddle

.PHONY: ocr-ps
ocr-ps: ## Show OCR microservice status (Docker + host)
	-$(COMPOSE) ps surya docling paddle
	@$(HOST_OCR) status

.PHONY: ocr-logs
ocr-logs: ## Follow OCR logs (host files on Apple Silicon, else compose)
ifeq ($(SERVE_MODE),host)
	tail -f .ocr-run/surya.log .ocr-run/docling.log .ocr-run/paddle.log 2>/dev/null || \
		$(COMPOSE) logs -f surya docling paddle
else
	$(COMPOSE) --profile surya --profile docling --profile paddle logs -f surya docling paddle
endif

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

.PHONY: be-ocr-surya
be-ocr-surya: ## Host-dev Surya microservice on :8101 (requires requirements-surya)
	cd $(BACKEND) && OCRFLOW_SERVICE_PROVIDER=surya OCRFLOW_RUNNER_MODE=local \
		OCRFLOW_DEFAULT_DEVICE=$(DEVICE) PYTORCH_ENABLE_MPS_FALLBACK=1 \
		uvicorn app.internal_service.app:app --host 127.0.0.1 --port 8101 --reload

.PHONY: be-ocr-docling
be-ocr-docling: ## Host-dev Docling microservice on :8102 (requires requirements-docling)
	cd $(BACKEND) && OCRFLOW_SERVICE_PROVIDER=docling OCRFLOW_RUNNER_MODE=local \
		OCRFLOW_DEFAULT_DEVICE=$(DEVICE) PYTORCH_ENABLE_MPS_FALLBACK=1 \
		uvicorn app.internal_service.app:app --host 127.0.0.1 --port 8102 --reload

.PHONY: be-ocr-paddle
be-ocr-paddle: ## Host-dev Paddle microservice on :8103 (requires requirements-paddle)
	cd $(BACKEND) && OCRFLOW_SERVICE_PROVIDER=paddle OCRFLOW_RUNNER_MODE=local \
		OCRFLOW_DEFAULT_DEVICE=$(PADDLE_DEVICE) \
		uvicorn app.internal_service.app:app --host 127.0.0.1 --port 8103 --reload

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
