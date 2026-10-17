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
# Interpreter for backend/.venv-unlimited (mlx-vlm supports 3.10+).
UNLIMITED_PYTHON ?= $(shell command -v python3.12 || command -v python3.11 || echo python3)

COMPOSE_FILES := -f docker-compose.yml
ifneq ($(strip $(OVERLAY)),)
COMPOSE_FILES += -f $(OVERLAY)
endif
ifneq ($(strip $(PADDLE_PLATFORM)),)
COMPOSE_FILES += -f backend/docker/docker-compose.paddle-amd64.yml
endif

COMPOSE_CMD = $(COMPOSE) $(COMPOSE_FILES)

# Unlimited-OCR: host MLX service on Apple Silicon (a Dockerized gateway reaches
# it through host.docker.internal), CUDA container on NVIDIA hosts.
ifeq ($(SERVE_MODE),host)
export OCRFLOW_UNLIMITED_SERVICE_URL ?= http://host.docker.internal:8105
endif
ifeq ($(ACCELERATOR),nvidia)
UNLIMITED_PROFILE := --profile unlimited
UNLIMITED_SERVICE := unlimited
endif

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
	$(COMPOSE_CMD) $(ALL_PROFILES) $(UNLIMITED_PROFILE) up -d --build
endif

.PHONY: up-fg
up-fg: ## Same as `up` but in the foreground (streams logs, Ctrl-C to stop)
	$(COMPOSE) $(CORE_PROFILES) up --build

.PHONY: gpu-up
gpu-up: up-all ## Full stack with auto-detected GPU (NVIDIA / AMD / Apple host OCR)

.PHONY: nvidia-up
nvidia-up: ## Full stack with the NVIDIA CUDA overlay (Docling + Surya + Paddle + Liquid + Unlimited-OCR)
	$(MAKE) up-all ACCELERATOR=nvidia

.PHONY: amd-up
amd-up: ## Full stack with the AMD ROCm overlay (GPU Docling/Surya, CPU Paddle)
	$(MAKE) up-all ACCELERATOR=amd

.PHONY: down
down: ## Stop and remove the stack's containers (and host OCR processes)
	-$(HOST_OCR) stop
	$(COMPOSE) $(ALL_PROFILES) --profile unlimited --profile unlimited-vllm down

.PHONY: down-v
down-v: ## Stop the stack and delete its volumes (Postgres data, models, uploads)
	-$(HOST_OCR) stop
	$(COMPOSE) $(ALL_PROFILES) --profile unlimited --profile unlimited-vllm down -v

.PHONY: restart
restart: down up ## Recreate the core stack from scratch

.PHONY: build
build: ## Build core images without starting anything
	$(COMPOSE) $(CORE_PROFILES) build

.PHONY: build-ocr
build-ocr: ## Build OCR provider images for the detected accelerator
	$(COMPOSE_CMD) --profile surya --profile docling --profile paddle --profile liquid $(UNLIMITED_PROFILE) build surya docling paddle liquid $(UNLIMITED_SERVICE)

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

.PHONY: ocr-liquid
ocr-liquid: ## Start the Liquid LFM2.5-VL-1.6B service (:8104), GPU auto-detected
ifeq ($(SERVE_MODE),host)
	$(HOST_OCR) start liquid
else
	$(COMPOSE_CMD) --profile liquid up -d --build liquid
endif

.PHONY: ocr-unlimited-setup
ocr-unlimited-setup: ## One-time: create backend/.venv-unlimited (mlx-vlm on Apple Silicon, CUDA torch on Linux)
	cd $(BACKEND) && $(UNLIMITED_PYTHON) -m venv .venv-unlimited && \
		.venv-unlimited/bin/pip install -q --upgrade pip && \
		.venv-unlimited/bin/pip install -r requirements-unlimited.txt

.PHONY: ocr-unlimited
ocr-unlimited: ## Start the Baidu Unlimited-OCR service (:8105; MLX host on Apple Silicon, CUDA Docker elsewhere)
ifeq ($(SERVE_MODE),host)
	$(HOST_OCR) start unlimited
else
	$(COMPOSE_CMD) --profile unlimited up -d --build unlimited
endif

.PHONY: ocr-unlimited-vllm
ocr-unlimited-vllm: ## Start Unlimited-OCR backed by the official vLLM image (NVIDIA only)
	OCRFLOW_UNLIMITED_VLLM_URL=http://unlimited-vllm:8000 \
		$(COMPOSE_CMD) --profile unlimited --profile unlimited-vllm up -d --build unlimited unlimited-vllm

.PHONY: ocr-up
ocr-up: ## Start all OCR microservices (each or all; GPU auto-detected)
ifeq ($(SERVE_MODE),host)
	$(HOST_OCR) start surya
	$(HOST_OCR) start docling
	$(HOST_OCR) start liquid
	@if [ -x $(BACKEND)/.venv-unlimited/bin/uvicorn ]; then $(HOST_OCR) start unlimited; \
		else echo "Skipping Unlimited-OCR (run make ocr-unlimited-setup to enable it)"; fi
	$(COMPOSE_CMD) --profile paddle up -d --build paddle
else
	$(COMPOSE_CMD) --profile surya --profile docling --profile paddle --profile liquid $(UNLIMITED_PROFILE) up -d --build surya docling paddle liquid $(UNLIMITED_SERVICE)
endif

.PHONY: ocr-down
ocr-down: ## Stop OCR microservices (leaves postgres/redis/gateway alone)
	-$(HOST_OCR) stop
	-$(COMPOSE) stop surya docling paddle liquid unlimited unlimited-vllm
	-$(COMPOSE) rm -f surya docling paddle liquid unlimited unlimited-vllm

.PHONY: ocr-ps
ocr-ps: ## Show OCR microservice status (Docker + host)
	-$(COMPOSE) ps surya docling paddle liquid unlimited unlimited-vllm
	@$(HOST_OCR) status

.PHONY: ocr-logs
ocr-logs: ## Follow OCR logs (host files on Apple Silicon, else compose)
ifeq ($(SERVE_MODE),host)
	tail -f .ocr-run/surya.log .ocr-run/docling.log .ocr-run/paddle.log .ocr-run/liquid.log .ocr-run/unlimited.log 2>/dev/null || \
		$(COMPOSE) logs -f surya docling paddle liquid
else
	$(COMPOSE) --profile surya --profile docling --profile paddle --profile liquid $(UNLIMITED_PROFILE) logs -f surya docling paddle liquid $(UNLIMITED_SERVICE)
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

.PHONY: be-ocr-liquid
be-ocr-liquid: ## Host-dev Liquid LFM2.5-VL-1.6B service on :8104 (requires requirements-liquid)
	cd $(BACKEND) && OCRFLOW_SERVICE_PROVIDER=liquid OCRFLOW_RUNNER_MODE=local \
		OCRFLOW_DEFAULT_DEVICE=$(DEVICE) PYTORCH_ENABLE_MPS_FALLBACK=1 \
		uvicorn app.internal_service.app:app --host 127.0.0.1 --port 8104 --reload

.PHONY: be-ocr-unlimited
be-ocr-unlimited: ## Host-dev Unlimited-OCR service on :8105 (requires backend/.venv-unlimited)
	cd $(BACKEND) && OCRFLOW_SERVICE_PROVIDER=unlimited OCRFLOW_RUNNER_MODE=local \
		.venv-unlimited/bin/uvicorn app.internal_service.app:app --host 127.0.0.1 --port 8105 --reload

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
