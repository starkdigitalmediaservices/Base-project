#!/usr/bin/env bash
#
# run.sh — run the Base Project locally (FastAPI backend + React frontend). No Docker.
#
# Usage:
#   ./run.sh start [--detach]     check tools, install what is missing, migrate, start both
#   ./run.sh stop                 stop both (works from any terminal)
#   ./run.sh restart [--detach]   stop, then start
#   ./run.sh status               show process and health status
#   ./run.sh logs [backend|frontend] [-n LINES]   follow the logs
#
# Without --detach, `start` stays in the foreground, streams both logs, and Ctrl+C stops both.
# With --detach it returns after both services are up; use `status`, `logs`, and `stop`.
#
# Optional environment overrides:
#   BACKEND_HOST (127.0.0.1)  BACKEND_PORT (8000)  BACKEND_RELOAD (1)
#   FRONTEND_HOST (127.0.0.1) FRONTEND_PORT (5173)
#   PYTHON=/path/to/python3.11   interpreter used to create backend/.venv
#   STARTUP_TIMEOUT (60)  STOP_TIMEOUT (10)   seconds
#
# PostgreSQL must already be installed and running; the connection comes from DATABASE_URL in
# backend/.env. See README.md → "PostgreSQL setup".

set -uo pipefail

# --- Paths (resolved from this file, so the script works from any directory) ----------------
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
STATE_DIR="$ROOT_DIR/.run"
LOG_DIR="$STATE_DIR/logs"
VENV_DIR="$BACKEND_DIR/.venv"
VENV_PY="$VENV_DIR/bin/python"
BACKEND_REQUIREMENTS="$BACKEND_DIR/requirements-dev.txt"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

# --- Settings ------------------------------------------------------------------------------
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
BACKEND_RELOAD="${BACKEND_RELOAD:-1}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
STARTUP_TIMEOUT="${STARTUP_TIMEOUT:-60}"
STOP_TIMEOUT="${STOP_TIMEOUT:-10}"
MIN_PYTHON="3.11"
MIN_NODE="22.22" # react-router 8 / vitest 5 requirement (frontend/package.json "engines")

# --- Output helpers --------------------------------------------------------------------------
if [[ -t 1 ]]; then
  C_RESET=$'\033[0m' C_BOLD=$'\033[1m' C_DIM=$'\033[2m' C_RED=$'\033[31m' C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m' C_BLUE=$'\033[34m' C_MAGENTA=$'\033[35m' C_CYAN=$'\033[36m'
else
  C_RESET='' C_BOLD='' C_DIM='' C_RED='' C_GREEN='' C_YELLOW='' C_BLUE='' C_MAGENTA='' C_CYAN=''
fi

step() { printf '\n%s==> %s%s\n' "$C_BOLD$C_CYAN" "$*" "$C_RESET"; }
info() { printf '    %s\n' "$*"; }
ok() { printf '    %s✔%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn() { printf '    %s!%s %s\n' "$C_YELLOW" "$C_RESET" "$*" >&2; }
err() { printf '%s✖ %s%s\n' "$C_RED" "$*" "$C_RESET" >&2; }
die() {
  err "$*"
  exit 1
}
indent() { sed -e '/^[[:space:]]*$/d' -e 's/^/      /'; }
rel() { printf '%s' "${1#"$ROOT_DIR"/}"; }

usage() {
  sed -n '3,22p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

# --- Generic helpers -------------------------------------------------------------------------
pid_file() { printf '%s/%s.pid' "$STATE_DIR" "$1"; }
url_file() { printf '%s/%s.url' "$STATE_DIR" "$1"; }

read_pid() {
  local file
  file="$(pid_file "$1")"
  [[ -s $file ]] || return 1
  cat -- "$file"
}

# Each service runs in its own process group (PGID == PID), so signals reach every child
# (uvicorn's reloader + worker, node + esbuild, ...). The leader PID is checked too: right after
# launch the child may not have called setsid() yet, so its group does not exist for a moment.
group_alive() { [[ -n ${1:-} ]] && { kill -0 -- "-$1" 2>/dev/null || kill -0 "$1" 2>/dev/null; }; }
signal_group() { kill "-$1" -- "-$2" 2>/dev/null || kill "-$1" "$2" 2>/dev/null || true; }

service_alive() {
  local pid
  pid="$(read_pid "$1")" || return 1
  group_alive "$pid"
}

connect_host() {
  case "$1" in
  0.0.0.0 | localhost | '') printf '127.0.0.1' ;;
  *) printf '%s' "$1" ;;
  esac
}

port_in_use() { # host port → true if something accepts connections there
  local probe
  probe="exec 3<>/dev/tcp/$(connect_host "$1")/$2"
  if command -v timeout >/dev/null 2>&1; then
    timeout 2 bash -c "$probe" >/dev/null 2>&1
  else
    (eval "$probe") >/dev/null 2>&1
  fi
}

http_ok() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS -o /dev/null --max-time 3 "$1" >/dev/null 2>&1
  else
    local py="python3"
    [[ -x $VENV_PY ]] && py="$VENV_PY"
    "$py" -c 'import sys, urllib.request; urllib.request.urlopen(sys.argv[1], timeout=3)' "$1" \
      >/dev/null 2>&1
  fi
}

sha256_of() { # file [extra text]  (uses the venv's or Node's hashing so no extra tools are needed)
  if [[ -x $VENV_PY ]]; then
    "$VENV_PY" -c 'import hashlib, sys
h = hashlib.sha256(open(sys.argv[1], "rb").read()); h.update(sys.argv[2].encode()); print(h.hexdigest())' \
      "$1" "${2:-}"
  else
    node -e 'const c=require("crypto").createHash("sha256");c.update(require("fs").readFileSync(process.argv[1]));c.update(process.argv[2]||"");console.log(c.digest("hex"))' \
      "$1" "${2:-}"
  fi
}

# --- Prerequisites ---------------------------------------------------------------------------
node_version_ok() {
  command -v node >/dev/null 2>&1 || return 1
  node -e "const [a,b]=process.versions.node.split('.').map(Number);const [x,y]='$MIN_NODE'.split('.').map(Number);process.exit(a>x||(a===x&&b>=y)?0:1)" \
    >/dev/null 2>&1
}

ensure_node() {
  if ! node_version_ok; then
    # Use nvm (and frontend/.nvmrc) when it is installed; nvm is a shell function, not a binary.
    local nvm_sh="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
    if [[ -s $nvm_sh ]]; then
      set +u
      # shellcheck source=/dev/null
      . "$nvm_sh" --no-use >/dev/null 2>&1
      if pushd "$FRONTEND_DIR" >/dev/null; then
        nvm use --silent >/dev/null 2>&1 # reads frontend/.nvmrc
        popd >/dev/null || true
      fi
      set -u
    fi
  fi
  if ! node_version_ok; then
    die "Node.js >= $MIN_NODE is required (found: $(node --version 2>/dev/null || echo 'none')).
  Install Node.js 24 LTS: https://nodejs.org or with nvm: 'nvm install 24' (frontend/.nvmrc)."
  fi
  ok "Node.js $(node --version) ($(command -v node))"
}

detect_package_manager() {
  if [[ -f $FRONTEND_DIR/package-lock.json ]] && command -v npm >/dev/null 2>&1; then
    PKG_MANAGER=npm
  elif [[ -f $FRONTEND_DIR/pnpm-lock.yaml ]] && command -v pnpm >/dev/null 2>&1; then
    PKG_MANAGER=pnpm
  elif command -v npm >/dev/null 2>&1; then
    PKG_MANAGER=npm
  elif command -v pnpm >/dev/null 2>&1; then
    PKG_MANAGER=pnpm
  else
    die "npm or pnpm is required (npm ships with Node.js)."
  fi
  ok "$PKG_MANAGER $("$PKG_MANAGER" --version)"
}

python_ok() { # interpreter → usable for creating the venv (version + venv/ensurepip modules)
  "$1" -c "import sys, venv, ensurepip; sys.exit(0 if sys.version_info >= tuple(map(int, '$MIN_PYTHON'.split('.'))) else 1)" \
    >/dev/null 2>&1
}

venv_ok() {
  [[ -x $VENV_PY ]] &&
    "$VENV_PY" -c "import sys; sys.exit(0 if sys.version_info >= tuple(map(int, '$MIN_PYTHON'.split('.'))) else 1)" \
      >/dev/null 2>&1
}

find_python() {
  local candidates=() candidate root found
  [[ -n ${PYTHON:-} ]] && candidates+=("$PYTHON")
  candidates+=(python3.14 python3.13 python3.12 python3.11 python3 python)
  if command -v pyenv >/dev/null 2>&1 && root="$(pyenv root 2>/dev/null)"; then
    for candidate in "$root"/versions/*/bin/python3; do
      [[ -x $candidate ]] && candidates+=("$candidate")
    done
  fi
  if command -v uv >/dev/null 2>&1 && found="$(uv python find ">=$MIN_PYTHON" 2>/dev/null)"; then
    candidates+=("$found")
  fi
  for candidate in "${candidates[@]}"; do
    if command -v "$candidate" >/dev/null 2>&1 && python_ok "$candidate"; then
      command -v "$candidate"
      return 0
    fi
  done
  return 1
}

ensure_python() {
  if venv_ok; then
    ok "$("$VENV_PY" --version 2>&1) ($(rel "$VENV_DIR"))"
    return
  fi
  PYTHON_BIN="$(find_python)" || die "Python >= $MIN_PYTHON (with the venv module) was not found.
  Install it (Ubuntu: 'sudo apt install python3.12 python3.12-venv', macOS: 'brew install python@3.12',
  or pyenv) or point to it: PYTHON=/path/to/python3.12 ./run.sh start"
  ok "$("$PYTHON_BIN" --version 2>&1) ($PYTHON_BIN)"
}

check_postgres_tools() {
  local tool
  for tool in pg_isready psql; do
    if command -v "$tool" >/dev/null 2>&1; then
      ok "PostgreSQL client tools ($("$tool" --version | awk '{print $1, $3}'))"
      return
    fi
  done
  warn "PostgreSQL client tools (psql, pg_isready) are not on PATH. That is fine for a remote"
  warn "server; for local development install PostgreSQL (README.md → \"PostgreSQL setup\")."
}

ensure_env_files() {
  if [[ ! -f $BACKEND_DIR/.env ]]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    die "Created backend/.env from backend/.env.example.
  1. Create the PostgreSQL user and database (README.md → \"PostgreSQL setup\").
  2. Set DATABASE_URL (and FIRST_ADMIN_EMAIL / FIRST_ADMIN_PASSWORD) in backend/.env.
  3. Run './run.sh start' again."
  fi
  if [[ -z ${DATABASE_URL:-} ]] && ! grep -Eq '^[[:space:]]*DATABASE_URL[[:space:]]*=[[:space:]]*[^[:space:]]' "$BACKEND_DIR/.env"; then
    die "DATABASE_URL is not set in backend/.env (format: postgresql://USER:PASSWORD@HOST:5432/DBNAME)."
  fi
  ok "backend/.env found"
  if [[ ! -f $FRONTEND_DIR/.env && ! -f $FRONTEND_DIR/.env.local ]]; then
    cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
    ok "Created frontend/.env from frontend/.env.example"
  else
    ok "frontend/.env found"
  fi
}

# --- Setup -----------------------------------------------------------------------------------
ensure_venv() {
  if venv_ok; then
    return
  fi
  if [[ -e $VENV_DIR ]]; then
    warn "backend/.venv is broken or older than Python $MIN_PYTHON; recreating it."
    rm -rf -- "$VENV_DIR"
  fi
  info "Creating backend/.venv with $("$PYTHON_BIN" --version 2>&1)…"
  "$PYTHON_BIN" -m venv "$VENV_DIR" ||
    die "Could not create backend/.venv (Debian/Ubuntu: install the matching 'pythonX.Y-venv' package)."
  ok "Created $(rel "$VENV_DIR")"
}

ensure_backend_deps() {
  local stamp="$VENV_DIR/.requirements.sha256" want have=""
  want="$(sha256_of "$BACKEND_REQUIREMENTS" "$("$VENV_PY" --version 2>&1)")"
  [[ -f $stamp ]] && have="$(cat -- "$stamp")"
  if [[ $want == "$have" ]]; then
    ok "Backend dependencies up to date"
    return
  fi
  if ! "$VENV_PY" -m pip --version >/dev/null 2>&1; then
    info "Bootstrapping pip inside the virtual environment…"
    "$VENV_PY" -m ensurepip --upgrade >/dev/null 2>&1 || die "Could not install pip into backend/.venv."
  fi
  info "Installing backend dependencies from $(rel "$BACKEND_REQUIREMENTS")…"
  if ! "$VENV_PY" -m pip install --disable-pip-version-check --no-input -q -r "$BACKEND_REQUIREMENTS"; then
    die "Installing backend dependencies failed (see the pip output above)."
  fi
  printf '%s\n' "$want" >"$stamp"
  ok "Backend dependencies installed"
}

ensure_frontend_deps() {
  local lock="$FRONTEND_DIR/package.json" stamp="$FRONTEND_DIR/node_modules/.deps.sha256" want have=""
  [[ $PKG_MANAGER == npm && -f $FRONTEND_DIR/package-lock.json ]] && lock="$FRONTEND_DIR/package-lock.json"
  [[ $PKG_MANAGER == pnpm && -f $FRONTEND_DIR/pnpm-lock.yaml ]] && lock="$FRONTEND_DIR/pnpm-lock.yaml"
  want="$(sha256_of "$lock" "$PKG_MANAGER $(node --version)")"
  [[ -f $stamp ]] && have="$(cat -- "$stamp")"
  if [[ -d $FRONTEND_DIR/node_modules && $want == "$have" ]]; then
    ok "Frontend dependencies up to date"
    return
  fi
  info "Installing frontend dependencies with $PKG_MANAGER…"
  local -a install_cmd
  case "$PKG_MANAGER:$(basename "$lock")" in
  npm:package-lock.json) install_cmd=(npm ci --no-audit --no-fund) ;;
  npm:*) install_cmd=(npm install --no-audit --no-fund) ;;
  pnpm:pnpm-lock.yaml) install_cmd=(pnpm install --frozen-lockfile) ;;
  pnpm:*) install_cmd=(pnpm install) ;;
  esac
  if ! (cd "$FRONTEND_DIR" && "${install_cmd[@]}" 2>&1 | indent); then
    die "Installing frontend dependencies failed ('${install_cmd[*]}' in frontend/)."
  fi
  printf '%s\n' "$want" >"$stamp"
  ok "Frontend dependencies installed"
}

check_database() {
  info "Connecting with DATABASE_URL from backend/.env…"
  local output
  if ! output="$(cd "$BACKEND_DIR" && "$VENV_PY" -m app.scripts.manage check-db 2>&1)"; then
    printf '%s\n' "$output" | indent >&2
    die "PostgreSQL is not available. Fix the problem above, then run './run.sh start' again."
  fi
  ok "${output##*$'\n'}"
}

run_migrations() {
  info "alembic upgrade head"
  if ! (cd "$BACKEND_DIR" && "$VENV_PY" -m alembic upgrade head 2>&1 | indent); then
    die "Database migrations failed (see the output above)."
  fi
  ok "Database schema is up to date"
  info "Ensuring the first admin user (FIRST_ADMIN_* in backend/.env)…"
  if ! (cd "$BACKEND_DIR" && LOG_FORMAT=console "$VENV_PY" -m app.scripts.manage seed 2>&1 | indent); then
    die "Seeding the admin user failed (see the output above)."
  fi
}

# --- Process management ----------------------------------------------------------------------
launch() { # name workdir logfile command...
  local name=$1 dir=$2 log=$3
  shift 3
  if command -v setsid >/dev/null 2>&1; then
    # New session + process group, detached from this terminal (survives --detach).
    (cd "$dir" && exec setsid "$@" </dev/null >>"$log" 2>&1) &
    LAUNCHED_PID=$!
  else # macOS has no setsid: job control gives the child its own process group instead.
    set -m
    (cd "$dir" && exec nohup "$@" </dev/null >>"$log" 2>&1) &
    LAUNCHED_PID=$!
    set +m
  fi
  printf '%s\n' "$LAUNCHED_PID" >"$(pid_file "$name")"
}

show_log_tail() {
  printf '%s---- last lines of %s ----%s\n' "$C_DIM" "$(rel "$1")" "$C_RESET" >&2
  tail -n 40 "$1" 2>/dev/null | indent >&2
}

wait_until_ready() { # name pid url logfile
  local name=$1 pid=$2 url=$3 log=$4 deadline=$((SECONDS + STARTUP_TIMEOUT))
  while :; do
    if ! group_alive "$pid"; then
      err "The $name exited during startup."
      show_log_tail "$log"
      return 1
    fi
    # uvicorn --reload keeps its supervisor alive when the app fails to import or start.
    if [[ $name == backend ]] && grep -qE 'Application startup failed|Error loading ASGI app|Startup aborted|Traceback \(most recent call last\)' "$log" 2>/dev/null; then
      err "The backend failed to start."
      show_log_tail "$log"
      return 1
    fi
    if http_ok "$url"; then
      return 0
    fi
    if ((SECONDS >= deadline)); then
      err "The $name did not respond at $url within ${STARTUP_TIMEOUT}s."
      show_log_tail "$log"
      return 1
    fi
    sleep 0.5
  done
}

stop_service() { # name [quiet]
  local name=$1 quiet=${2:-} pid
  if ! pid="$(read_pid "$name")"; then
    [[ -n $quiet ]] || info "$name: not running"
    return 0
  fi
  if group_alive "$pid"; then
    [[ -n $quiet ]] || info "Stopping $name (pid $pid)…"
    signal_group TERM "$pid"
    local waited=0
    while group_alive "$pid" && ((waited < STOP_TIMEOUT * 10)); do
      sleep 0.1
      waited=$((waited + 1))
    done
    if group_alive "$pid"; then
      warn "$name did not stop within ${STOP_TIMEOUT}s; killing it."
      signal_group KILL "$pid"
    fi
    [[ -n $quiet ]] || ok "$name stopped"
  else
    [[ -n $quiet ]] || info "$name: not running (removed stale pid file)"
  fi
  rm -f -- "$(pid_file "$name")" "$(url_file "$name")"
}

stop_all() {
  stop_service frontend "${1:-}"
  stop_service backend "${1:-}"
}

rotate_log() {
  [[ -f $1 ]] && mv -f -- "$1" "$1.1"
  : >"$1"
}

STREAM_PIDS=()
stream_logs() { # name logfile color lines
  local prefix
  prefix="$(printf '%s%-8s|%s ' "$3" "$1" "$C_RESET")"
  tail -n "${4:-0}" -F "$2" 2>/dev/null > >(awk -v p="$prefix" '{ print p $0; fflush() }') &
  STREAM_PIDS+=($!)
}

stop_streams() {
  local pid
  for pid in ${STREAM_PIDS[@]+"${STREAM_PIDS[@]}"}; do
    kill "$pid" 2>/dev/null || true
  done
  STREAM_PIDS=()
}

# --- Commands --------------------------------------------------------------------------------
cmd_start() {
  local detach=0 arg
  for arg in "$@"; do
    case "$arg" in
    -d | --detach) detach=1 ;;
    *) die "Unknown option for start: $arg" ;;
    esac
  done

  mkdir -p "$LOG_DIR"
  if service_alive backend || service_alive frontend; then
    warn "Already running. Use './run.sh restart' to restart."
    cmd_status
    return 0
  fi
  stop_all quiet # clears stale pid files

  step "Checking prerequisites"
  ensure_node
  detect_package_manager
  ensure_python
  check_postgres_tools
  ensure_env_files

  step "Backend environment"
  ensure_venv
  ensure_backend_deps

  step "Frontend environment"
  ensure_frontend_deps

  step "Database"
  check_database
  run_migrations

  step "Starting services"
  # backend_url is what this script and the Vite proxy connect to; the *_display URLs are printed.
  local backend_url backend_display frontend_url="http://localhost:$FRONTEND_PORT"
  backend_url="http://$(connect_host "$BACKEND_HOST"):$BACKEND_PORT"
  backend_display="http://localhost:$BACKEND_PORT"
  [[ $(connect_host "$BACKEND_HOST") != 127.0.0.1 ]] && backend_display="http://$BACKEND_HOST:$BACKEND_PORT"
  [[ $(connect_host "$FRONTEND_HOST") != 127.0.0.1 ]] && frontend_url="http://$FRONTEND_HOST:$FRONTEND_PORT"
  port_in_use "$BACKEND_HOST" "$BACKEND_PORT" &&
    die "Port $BACKEND_PORT is already in use. Stop that process or run: BACKEND_PORT=8001 ./run.sh start"
  port_in_use "$FRONTEND_HOST" "$FRONTEND_PORT" &&
    die "Port $FRONTEND_PORT is already in use. Stop that process or run: FRONTEND_PORT=5174 ./run.sh start"

  local api_prefix
  api_prefix="$(cd "$BACKEND_DIR" && "$VENV_PY" -c 'from app.core.config import settings; print(settings.api_v1_prefix)')"

  rotate_log "$BACKEND_LOG"
  local -a backend_cmd=("$VENV_PY" -m uvicorn app.main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT")
  [[ $BACKEND_RELOAD == 1 ]] && backend_cmd+=(--reload --reload-dir app)
  launch backend "$BACKEND_DIR" "$BACKEND_LOG" "${backend_cmd[@]}"
  local backend_pid=$LAUNCHED_PID
  info "Backend starting (pid $backend_pid)…"
  if ! wait_until_ready backend "$backend_pid" "$backend_url$api_prefix/health/ready" "$BACKEND_LOG"; then
    stop_service backend quiet
    die "Backend startup failed. Full log: $(rel "$BACKEND_LOG")"
  fi
  printf '%s\n' "$backend_url" >"$(url_file backend)"
  ok "Backend ready"

  rotate_log "$FRONTEND_LOG"
  launch frontend "$FRONTEND_DIR" "$FRONTEND_LOG" \
    env "VITE_API_PROXY_TARGET=$backend_url" \
    "$FRONTEND_DIR/node_modules/.bin/vite" --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" --strictPort
  local frontend_pid=$LAUNCHED_PID
  info "Frontend starting (pid $frontend_pid)…"
  if ! wait_until_ready frontend "$frontend_pid" "http://$(connect_host "$FRONTEND_HOST"):$FRONTEND_PORT/" "$FRONTEND_LOG"; then
    stop_all quiet
    die "Frontend startup failed. Full log: $(rel "$FRONTEND_LOG")"
  fi
  printf '%s\n' "$frontend_url" >"$(url_file frontend)"
  ok "Frontend ready"

  printf '\n%s%sBase Project is running%s\n' "$C_BOLD" "$C_GREEN" "$C_RESET"
  printf '  %-10s %s\n' "Frontend" "$frontend_url"
  printf '  %-10s %s\n' "Backend" "$backend_display$api_prefix"
  printf '  %-10s %s\n' "API docs" "$backend_display/docs"
  printf '  %-10s %s, %s\n' "Logs" "$(rel "$FRONTEND_LOG")" "$(rel "$BACKEND_LOG")"

  if ((detach)); then
    printf '\n  Running in the background. Use ./run.sh status | logs | stop\n'
    return 0
  fi

  printf '\n  Streaming logs. Press %sCtrl+C%s to stop both services.\n\n' "$C_BOLD" "$C_RESET"
  stream_logs backend "$BACKEND_LOG" "$C_BLUE"
  stream_logs frontend "$FRONTEND_LOG" "$C_MAGENTA"
  trap on_interrupt INT TERM HUP
  local name
  while :; do
    for name in backend frontend; do
      if [[ ! -f $(pid_file "$name") ]]; then # stopped by `./run.sh stop` elsewhere
        stop_streams
        printf '\n'
        info "Services were stopped from another terminal."
        stop_all quiet
        exit 0
      fi
      if ! service_alive "$name"; then
        stop_streams
        printf '\n'
        err "The $name exited unexpectedly. Log: $(rel "$LOG_DIR/$name.log")"
        stop_all
        exit 1
      fi
    done
    sleep 1
  done
}

on_interrupt() {
  trap '' INT TERM HUP
  stop_streams
  printf '\n'
  step "Stopping"
  stop_all
  exit 0
}

cmd_stop() {
  if ! service_alive backend && ! service_alive frontend; then
    stop_all quiet
    info "Nothing is running."
    return 0
  fi
  stop_all
}

cmd_status() {
  local name pid url health rc=0 color
  for name in backend frontend; do
    if service_alive "$name"; then
      pid="$(read_pid "$name")"
      url="$(cat "$(url_file "$name")" 2>/dev/null || echo '?')"
      if [[ $name == backend ]]; then
        local prefix="/api/v1"
        [[ -x $VENV_PY ]] && prefix="$(cd "$BACKEND_DIR" && "$VENV_PY" -c 'from app.core.config import settings; print(settings.api_v1_prefix)' 2>/dev/null || echo /api/v1)"
        if http_ok "$url$prefix/health/ready"; then health="ready (database ok)"; else health="NOT ready"; fi
      else
        if http_ok "$url/"; then health="responding"; else health="NOT responding"; fi
      fi
      color=$C_GREEN
      [[ $health == NOT* ]] && color=$C_YELLOW && rc=1
      printf '%-9s %srunning%s  pid %-7s %-24s %s%s%s\n' "$name" "$C_GREEN" "$C_RESET" "$pid" "$url" "$color" "$health" "$C_RESET"
    else
      printf '%-9s %sstopped%s\n' "$name" "$C_RED" "$C_RESET"
      rc=3
    fi
  done
  return "$rc"
}

cmd_logs() {
  local which=all lines=100
  while (($#)); do
    case "$1" in
    backend | frontend | all) which=$1 ;;
    -n | --lines)
      lines="${2:-}"
      shift
      ;;
    *) die "Usage: ./run.sh logs [backend|frontend] [-n LINES]" ;;
    esac
    shift
  done
  [[ $lines =~ ^[0-9]+$ ]] || die "LINES must be a number."
  if [[ $which != all ]]; then
    [[ -f $LOG_DIR/$which.log ]] || die "No $which log yet. Start the project with ./run.sh start."
    exec tail -n "$lines" -F "$LOG_DIR/$which.log"
  fi
  [[ -f $BACKEND_LOG || -f $FRONTEND_LOG ]] || die "No logs yet. Start the project with ./run.sh start."
  trap 'stop_streams; exit 0' INT TERM HUP
  stream_logs backend "$BACKEND_LOG" "$C_BLUE" "$lines"
  stream_logs frontend "$FRONTEND_LOG" "$C_MAGENTA" "$lines"
  wait
}

main() {
  local command="${1:-}"
  [[ $# -gt 0 ]] && shift
  case "$command" in
  start) cmd_start "$@" ;;
  stop) cmd_stop ;;
  restart)
    cmd_stop
    cmd_start "$@"
    ;;
  status) cmd_status ;;
  logs) cmd_logs "$@" ;;
  -h | --help | help) usage ;;
  *)
    usage
    exit 2
    ;;
  esac
}

main "$@"
