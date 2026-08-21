#!/usr/bin/env bash
# Run an OCR provider as a host microservice (Apple Silicon GPU path).
#
# Usage:
#   scripts/run-ocr-host.sh start <surya|docling|paddle>
#   scripts/run-ocr-host.sh stop  [surya|docling|paddle]
#   scripts/run-ocr-host.sh status
#
# Apple GPU is not available inside Docker Desktop's Linux VM, so Docling and
# Surya run on the host with PyTorch MPS. Paddle has no macOS ARM GPU build;
# prefer `make ocr-paddle` (Docker linux/amd64, CPU) on Apple Silicon.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
RUNDIR="$ROOT/.ocr-run"
ACTION="${1:-}"
PROVIDER="${2:-}"

mkdir -p "$RUNDIR"

die() { echo "$*" >&2; exit 1; }

port_for() {
  case "$1" in
    surya) echo 8101 ;;
    docling) echo 8102 ;;
    paddle) echo 8103 ;;
    *) die "Unknown provider '$1' (surya|docling|paddle)" ;;
  esac
}

device_for() {
  case "$1" in
    paddle) echo "${OCRFLOW_PADDLE_DEVICE:-cpu}" ;;
    *) echo "${OCRFLOW_DEFAULT_DEVICE:-mps}" ;;
  esac
}

find_uvicorn() {
  if [ -x "$BACKEND/.venv/bin/uvicorn" ]; then
    echo "$BACKEND/.venv/bin/uvicorn"
  elif [ -x "$ROOT/.venv/bin/uvicorn" ]; then
    echo "$ROOT/.venv/bin/uvicorn"
  elif command -v uvicorn >/dev/null 2>&1; then
    command -v uvicorn
  else
    return 1
  fi
}

is_running() {
  local pidfile="$RUNDIR/$1.pid"
  [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null
}

start_one() {
  local provider="$1"
  local port device pidfile logfile uvicorn
  port="$(port_for "$provider")"
  device="$(device_for "$provider")"
  pidfile="$RUNDIR/$provider.pid"
  logfile="$RUNDIR/$provider.log"

  if is_running "$provider"; then
    echo "$provider already running on :$port (pid $(cat "$pidfile"))"
    return 0
  fi

  uvicorn="$(find_uvicorn)" || die \
    "uvicorn not found. On Apple Silicon, OCR runs on the host so Metal/MPS can be used.
Create a venv in backend/ and install the provider extras, then retry:
  cd backend && python -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt -r requirements-${provider}.txt
Or force CPU containers: make ocr-${provider} ACCELERATOR=cpu"

  echo "Starting $provider on :$port (device=$device) ..."
  (
    cd "$BACKEND"
    export OCRFLOW_SERVICE_PROVIDER="$provider"
    export OCRFLOW_RUNNER_MODE=local
    export OCRFLOW_DEFAULT_DEVICE="$device"
    export PYTORCH_ENABLE_MPS_FALLBACK="${PYTORCH_ENABLE_MPS_FALLBACK:-1}"
    exec "$uvicorn" app.internal_service.app:app --host 127.0.0.1 --port "$port"
  ) >"$logfile" 2>&1 &
  echo $! >"$pidfile"

  local i
  for i in $(seq 1 20); do
    if curl -fsS "http://127.0.0.1:${port}/internal/health" >/dev/null 2>&1; then
      echo "Started $provider on :$port (pid $(cat "$pidfile"), device=$device)"
      return 0
    fi
    if ! kill -0 "$(cat "$pidfile")" 2>/dev/null; then
      die "$provider exited. See $logfile"
    fi
    sleep 0.5
  done
  echo "Started $provider on :$port (pid $(cat "$pidfile")) — health not ready yet, see $logfile"
}

stop_one() {
  local provider="$1"
  local pidfile="$RUNDIR/$provider.pid"
  if ! is_running "$provider"; then
    rm -f "$pidfile"
    echo "$provider is not running on the host"
    return 0
  fi
  kill "$(cat "$pidfile")" 2>/dev/null || true
  rm -f "$pidfile"
  echo "Stopped host $provider"
}

status_one() {
  local provider="$1"
  local port pidfile
  port="$(port_for "$provider")"
  pidfile="$RUNDIR/$provider.pid"
  if is_running "$provider"; then
    echo "$provider  host  :$port  running  pid=$(cat "$pidfile")"
  else
    echo "$provider  host  :$port  stopped"
  fi
}

case "$ACTION" in
  start)
    [ -n "$PROVIDER" ] || die "usage: $0 start <surya|docling|paddle>"
    start_one "$PROVIDER"
    ;;
  stop)
    if [ -n "$PROVIDER" ]; then
      stop_one "$PROVIDER"
    else
      stop_one surya
      stop_one docling
      stop_one paddle
    fi
    ;;
  status)
    status_one surya
    status_one docling
    status_one paddle
    ;;
  *)
    die "usage: $0 start <surya|docling|paddle> | stop [provider] | status"
    ;;
esac
