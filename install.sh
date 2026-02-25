#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Voxora — Production Installer for Amazon Linux 2023 / EC2
# Usage: curl -fsSL https://raw.githubusercontent.com/voxora-cloud/voxora/main/install.sh | bash
# ============================================================

REPO_URL="https://github.com/voxora-cloud/voxora.git"
INSTALL_DIR="/opt/voxora"
DOCKER_DIR="${INSTALL_DIR}/docker"
REQUIRED_PORTS=(3000 3002 9001 9002 27017 6379)

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { printf "${BLUE}[•]${NC} %s\n" "$*"; }
success() { printf "${GREEN}[✔]${NC} %s\n" "$*"; }
warn()    { printf "${YELLOW}[!]${NC} %s\n" "$*"; }
error()   { printf "${RED}[✘]${NC} %s\n" "$*" >&2; }
die()     { error "$*"; exit 1; }
step()    { printf "\n${BOLD}${CYAN}━━━ %s ━━━${NC}\n\n" "$*"; }

# ── Banner ────────────────────────────────────────────────────────────────────
print_banner() {
  printf "${BLUE}"
  printf "██╗   ██╗ ██████╗ ██╗  ██╗ ██████╗ ██████╗  █████╗ \n"
  printf "██║   ██║██╔═══██╗╚██╗██╔╝██╔═══██╗██╔══██╗██╔══██╗\n"
  printf "██║   ██║██║   ██║ ╚███╔╝ ██║   ██║██████╔╝███████║\n"
  printf "╚██╗ ██╔╝██║   ██║ ██╔██╗ ██║   ██║██╔══██╗██╔══██║\n"
  printf " ╚████╔╝ ╚██████╔╝██╔╝ ██╗╚██████╔╝██║  ██║██║  ██║\n"
  printf "  ╚═══╝   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝\n"
  printf "${NC}"
  printf "\n${BOLD}  Production Installer${NC}  —  ${CYAN}github.com/voxora-cloud/voxora${NC}\n\n"
}

# ── Root check ────────────────────────────────────────────────────────────────
check_root() {
  step "Privilege Check"
  if [[ $EUID -ne 0 ]]; then
    if command -v sudo &>/dev/null; then
      warn "Not running as root. Re-executing with sudo..."
      exec sudo --preserve-env "$0" "$@"
    else
      die "This script must be run as root or with sudo."
    fi
  fi
  success "Running as root."
}

# ── System update ─────────────────────────────────────────────────────────────
update_system() {
  step "System Update"
  info "Updating dnf package lists..."
  dnf update -y -q
  info "Installing prerequisites (curl git ca-certificates gnupg2 jq lsof tar)..."
  dnf install -y -q curl git ca-certificates gnupg2 jq lsof tar
  success "System packages up to date."
}

# ── Docker install ────────────────────────────────────────────────────────────
install_docker() {
  step "Docker Installation"

  if command -v docker &>/dev/null && docker info &>/dev/null; then
    success "Docker already installed: $(docker --version)"
  else
    info "Adding Docker CE repository (RHEL/AL2023)..."
    dnf config-manager --add-repo \
      https://download.docker.com/linux/centos/docker-ce.repo

    info "Installing Docker Engine, CLI, Containerd, Buildx and Compose plugin..."
    dnf install -y -q \
      docker-ce docker-ce-cli containerd.io \
      docker-buildx-plugin docker-compose-plugin

    systemctl enable --now docker
    success "Docker installed: $(docker --version)"
  fi

  if ! docker compose version &>/dev/null; then
    die "docker compose plugin not found. Check your Docker installation."
  fi
  success "Docker Compose: $(docker compose version --short)"

  info "Running Docker smoke test..."
  if docker run --rm hello-world &>/dev/null; then
    success "Docker daemon is working."
  else
    die "Docker smoke test failed."
  fi
}

# ── Port availability check ───────────────────────────────────────────────────
check_ports() {
  step "Port Availability Check"
  local blocked=0
  for port in "${REQUIRED_PORTS[@]}"; do
    if ss -tlnp "sport = :${port}" 2>/dev/null | grep -q ":${port}"; then
      warn "Port ${port} is already in use:"
      ss -tlnp "sport = :${port}" | tail -n +2 | awk '{print "       " $0}'
      blocked=$((blocked + 1))
    else
      success "Port ${port} is free."
    fi
  done
  if [[ $blocked -gt 0 ]]; then
    die "${blocked} required port(s) are in use. Free them before installing."
  fi
}

# ── Clone / update repo ───────────────────────────────────────────────────────
setup_repo() {
  step "Repository Setup"
  if [[ -d "${INSTALL_DIR}/.git" ]]; then
    info "Repo already exists at ${INSTALL_DIR}. Pulling latest..."
    git -C "${INSTALL_DIR}" pull --ff-only
    success "Repository updated."
  else
    info "Cloning ${REPO_URL} → ${INSTALL_DIR} ..."
    git clone --depth=1 "${REPO_URL}" "${INSTALL_DIR}"
    success "Repository cloned."
  fi
}

# ── Strip protocol & trailing slashes typed by accident ──────────────────────
normalize_host() {
  local h="$1"
  h="${h// /}"
  h="${h#http://}"
  h="${h#https://}"
  h="${h%/}"
  printf '%s' "$h"
}

# ── Ask for API host and Web host ─────────────────────────────────────────────
ask_domains() {
  step "Domain / IP Configuration"

  # Auto-detect public IP
  local detected_ip
  detected_ip=$(curl -4 -fsSL --max-time 10 ifconfig.me 2>/dev/null || true)

  # ---------- API host ----------
  printf "${CYAN}Enter the host for the ${BOLD}API server${NC}${CYAN} (backend + sockets + MinIO CDN, ports 3002 / 9001).${NC}\n"
  if [[ -n "$detected_ip" ]]; then
    printf "${YELLOW}Detected public IP: ${BOLD}%s${NC}\n" "$detected_ip"
    read -rp "$(printf "${CYAN}API host [%s]: ${NC}" "$detected_ip")" _raw_api
    _raw_api="${_raw_api:-$detected_ip}"
  else
    read -rp "$(printf "${CYAN}API host (e.g. api.example.com or 1.2.3.4): ${NC}")" _raw_api
  fi
  API_HOST=$(normalize_host "$_raw_api")
  [[ -z "$API_HOST" ]] && die "API host cannot be empty."

  # ---------- Web / frontend host ----------
  printf "\n${CYAN}Enter the host for the ${BOLD}Web frontend${NC}${CYAN} (what users open in the browser, port 3000).${NC}\n"
  printf "${YELLOW}Press ENTER to use the same host as the API [${BOLD}%s${NC}${YELLOW}].${NC}\n" "$API_HOST"
  read -rp "$(printf "${CYAN}Web host [%s]: ${NC}" "$API_HOST")" _raw_web
  _raw_web="${_raw_web:-$API_HOST}"
  WEB_HOST=$(normalize_host "$_raw_web")
  [[ -z "$WEB_HOST" ]] && die "Web host cannot be empty."

  # ---------- HTTP vs HTTPS ----------
  printf "\n${CYAN}Use HTTPS? (only if a reverse-proxy with a valid TLS cert is already set up) (y/n) [n]: ${NC}"
  read -r _https
  if [[ "${_https,,}" == "y" ]]; then
    SCHEME="https"
    warn "Make sure your reverse proxy terminates TLS and forwards to the correct ports."
  else
    SCHEME="http"
  fi

  printf "\n"
  success "API host  : ${API_HOST}  (${SCHEME})"
  success "Web host  : ${WEB_HOST}  (${SCHEME})"
  printf "\n"
  export API_HOST WEB_HOST SCHEME
}

# ── Build docker/.env from .env.example, then patch domain values ─────────────
setup_docker_env() {
  step "Setting Up docker/.env"

  local compose_env="${DOCKER_DIR}/.env"
  local compose_example="${DOCKER_DIR}/.env.example"

  if [[ ! -f "$compose_env" ]]; then
    [[ -f "$compose_example" ]] || die "Missing ${compose_example}."
    cp "$compose_example" "$compose_env"
    info "Created docker/.env from .env.example."
  else
    info "docker/.env already exists — preserving existing values."
  fi

  # Only domain-dependent value in docker/.env
  sed -i "s|MINIO_PUBLIC_URL=.*|MINIO_PUBLIC_URL=${SCHEME}://${API_HOST}:9001|g" "$compose_env"
  success "docker/.env  →  MINIO_PUBLIC_URL=${SCHEME}://${API_HOST}:9001"
}

# ── Read a value from docker/.env  ───────────────────────────────────────────
# Usage: val=$(env_val KEY /path/to/.env)
env_val() {
  local key="$1" file="$2"
  grep -E "^${key}=" "$file" 2>/dev/null | cut -d= -f2- | tr -d '\r'
}

# ── Patch all per-service .env.docker files ────────────────────────────────────
patch_service_envs() {
  step "Patching Service .env.docker Files"

  local compose_env="${DOCKER_DIR}/.env"

  # Read credentials that are defined in docker/.env
  local MONGO_PASS; MONGO_PASS=$(env_val MONGO_ROOT_PASSWORD "$compose_env")
  local MONGO_USER; MONGO_USER=$(env_val MONGO_ROOT_USERNAME "$compose_env")
  local REDIS_PASS; REDIS_PASS=$(env_val REDIS_PASSWORD     "$compose_env")
  local MINIO_USER; MINIO_USER=$(env_val MINIO_ROOT_USER    "$compose_env")
  local MINIO_PASS; MINIO_PASS=$(env_val MINIO_ROOT_PASSWORD "$compose_env")

  [[ -z "$MONGO_PASS" ]] && warn "MONGO_ROOT_PASSWORD not set in docker/.env — MongoDB URI may be wrong."
  [[ -z "$REDIS_PASS" ]] && warn "REDIS_PASSWORD not set in docker/.env — Redis password may be wrong."

  # ── apps/api/.env.docker ────────────────────────────────────────────────
  local api_env="${INSTALL_DIR}/apps/api/.env.docker"
  if [[ -f "$api_env" ]]; then
    # Fix NODE_ENV
    sed -i "s|^NODE_ENV=.*|NODE_ENV=production|g" "$api_env"

    # API_URL — public-facing API base
    sed -i "s|^API_URL=.*|API_URL=${SCHEME}://${API_HOST}:3002/api|g" "$api_env"

    # MongoDB: swap localhost → docker service name "mongodb", sync credentials
    sed -i "s|MONGODB_URI=mongodb://[^@]*@localhost:[0-9]*/[^?]*|MONGODB_URI=mongodb://${MONGO_USER:-admin}:${MONGO_PASS:-dev123}@mongodb:27017/voxora-chat|g" "$api_env"
    # If the URI already uses "mongodb" hostname just sync credentials
    sed -i "s|MONGODB_URI=mongodb://[^@]*@mongodb:|MONGODB_URI=mongodb://${MONGO_USER:-admin}:${MONGO_PASS:-dev123}@mongodb:|g" "$api_env"

    # Redis: swap localhost → docker service name "redis", sync password
    sed -i "s|^REDIS_HOST=.*|REDIS_HOST=redis|g" "$api_env"
    sed -i "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=${REDIS_PASS:-dev123}|g" "$api_env"

    # MinIO: swap localhost → docker service name "minio", sync credentials
    sed -i "s|^MINIO_ENDPOINT=.*|MINIO_ENDPOINT=minio|g"           "$api_env"
    sed -i "s|^MINIO_ACCESS_KEY=.*|MINIO_ACCESS_KEY=${MINIO_USER:-minioadmin}|g" "$api_env"
    sed -i "s|^MINIO_SECRET_KEY=.*|MINIO_SECRET_KEY=${MINIO_PASS:-minioadmin}|g" "$api_env"

    # CLIENT_URL (CORS origin) — web frontend
    if grep -q "^CLIENT_URL=" "$api_env"; then
      sed -i "s|^CLIENT_URL=.*|CLIENT_URL=${SCHEME}://${WEB_HOST}:3000|g" "$api_env"
    else
      printf "\nCLIENT_URL=%s://%s:3000" "$SCHEME" "$WEB_HOST" >> "$api_env"
    fi

    success "apps/api/.env.docker patched."
  else
    warn "apps/api/.env.docker not found — skipping."
  fi

  # ── apps/web/.env.docker ────────────────────────────────────────────────
  local web_env="${INSTALL_DIR}/apps/web/.env.docker"
  if [[ -f "$web_env" ]]; then
    # Replace placeholder OR existing value
    sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=${SCHEME}://${API_HOST}:3002/api/v1|g"            "$web_env"
    sed -i "s|NEXT_PUBLIC_SOCKET_URL=.*|NEXT_PUBLIC_SOCKET_URL=${SCHEME}://${API_HOST}:3002|g"             "$web_env"
    sed -i "s|NEXT_PUBLIC_CDN_URL=.*|NEXT_PUBLIC_CDN_URL=${SCHEME}://${API_HOST}:9001/voxora-widget/v1/voxora.js|g" "$web_env"
    sed -i "s|^NEXT_PUBLIC_ENV=.*|NEXT_PUBLIC_ENV=production|g"                                            "$web_env"
    success "apps/web/.env.docker patched."
  else
    warn "apps/web/.env.docker not found — skipping."
  fi

  # ── apps/widget/.env.docker ─────────────────────────────────────────────
  local widget_env="${INSTALL_DIR}/apps/widget/.env.docker"
  if [[ -f "$widget_env" ]]; then
    sed -i "s|API_URL_PRODUCTION=.*|API_URL_PRODUCTION=${SCHEME}://${API_HOST}:3002|g" "$widget_env"
    sed -i "s|^MINIO_ACCESS_KEY=.*|MINIO_ACCESS_KEY=${MINIO_USER:-minioadmin}|g"       "$widget_env"
    sed -i "s|^MINIO_SECRET_KEY=.*|MINIO_SECRET_KEY=${MINIO_PASS:-minioadmin}|g"       "$widget_env"
    success "apps/widget/.env.docker patched."
  else
    warn "apps/widget/.env.docker not found — skipping."
  fi

  # ── apps/ai/.env.docker ─────────────────────────────────────────────────
  local ai_env="${INSTALL_DIR}/apps/ai/.env.docker"
  if [[ -f "$ai_env" ]]; then
    # Already uses Docker service names; just sync credentials
    sed -i "s|MONGODB_URI=mongodb://[^@]*@mongodb:|MONGODB_URI=mongodb://${MONGO_USER:-admin}:${MONGO_PASS:-dev123}@mongodb:|g" "$ai_env"
    sed -i "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=${REDIS_PASS:-dev123}|g"                                   "$ai_env"
    sed -i "s|^MINIO_ACCESS_KEY=.*|MINIO_ACCESS_KEY=${MINIO_USER:-minioadmin}|g"                           "$ai_env"
    sed -i "s|^MINIO_SECRET_KEY=.*|MINIO_SECRET_KEY=${MINIO_PASS:-minioadmin}|g"                           "$ai_env"
    success "apps/ai/.env.docker patched."
  else
    warn "apps/ai/.env.docker not found — skipping."
  fi

  printf "\n"
  info "All .env.docker files are up to date."
}

# ── Deploy with docker compose ────────────────────────────────────────────────
deploy() {
  step "Docker Deployment"
  cd "${DOCKER_DIR}"
  info "Pulling latest images..."
  docker compose pull
  info "Starting all services..."
  docker compose up -d
  info "Waiting 15 s for services to initialise..."
  sleep 15
}

# ── Health checks ─────────────────────────────────────────────────────────────
health_checks() {
  step "Health Checks"
  cd "${DOCKER_DIR}"

  # -- Container states (widget-deploy exits 0 on purpose) ------------------
  info "Checking container states..."
  local failed=()
  while IFS= read -r name; do
    [[ -n "$name" && "$name" != *widget-deploy* ]] && failed+=("$name")
  done < <(docker compose ps --format json 2>/dev/null \
           | jq -r 'select(.State != "running" and .State != "exited") | .Name' 2>/dev/null || true)

  if [[ ${#failed[@]} -gt 0 ]]; then
    error "The following containers failed to start:"
    for c in "${failed[@]}"; do
      error "  - $c"
      docker compose logs --tail=30 "$c" 2>/dev/null || true
    done
    die "Deployment failed. Review the logs above."
  fi
  success "All service containers are running."

  # -- API health (retry 60 s) -----------------------------------------------
  info "Waiting for API /health (up to 60 s)..."
  local api_ok=false
  for i in $(seq 1 12); do
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
           "http://localhost:3002/api/v1/health" 2>/dev/null || echo "000")
    if [[ "$code" == "200" ]]; then api_ok=true; break; fi
    info "  Attempt $i/12 — HTTP $code, retrying in 5 s..."
    sleep 5
  done
  if $api_ok; then
    success "API is healthy → http://localhost:3002/api/v1/health"
  else
    warn "API did not return 200 after 60 s. Check: docker compose logs api --tail=50"
  fi

  # -- Web frontend ----------------------------------------------------------
  info "Checking web frontend (port 3000)..."
  local web_code
  web_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 \
             "http://localhost:3000" 2>/dev/null || echo "000")
  if [[ "$web_code" =~ ^(200|301|302|307|308)$ ]]; then
    success "Web frontend is responding (HTTP ${web_code})."
  else
    warn "Web frontend returned HTTP ${web_code} — may still be starting."
    warn "Check: docker compose logs web --tail=50"
  fi

  # -- MinIO -----------------------------------------------------------------
  info "Checking MinIO (port 9001)..."
  local minio_code
  minio_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
               "http://localhost:9001/minio/health/live" 2>/dev/null || echo "000")
  if [[ "$minio_code" == "200" ]]; then
    success "MinIO is healthy."
  else
    warn "MinIO health returned HTTP ${minio_code}. Check: docker compose logs minio --tail=50"
  fi

  printf "\n"
  info "Container summary:"
  docker compose ps
}

# ── Success summary ────────────────────────────────────────────────────────────
print_success() {
  printf "\n"
  printf "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}\n"
  printf "${GREEN}║${NC}  ${BOLD}${GREEN}✔  Voxora deployed successfully!${NC}                       ${GREEN}║${NC}\n"
  printf "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}\n"
  printf "${GREEN}║${NC}                                                              ${GREEN}║${NC}\n"
  printf "${GREEN}║${NC}  ${CYAN}Dashboard :${NC}  %-46s${GREEN}║${NC}\n" "${SCHEME}://${WEB_HOST}:3000"
  printf "${GREEN}║${NC}  ${CYAN}API       :${NC}  %-46s${GREEN}║${NC}\n" "${SCHEME}://${API_HOST}:3002/api/v1/health"
  printf "${GREEN}║${NC}  ${CYAN}MinIO CDN :${NC}  %-46s${GREEN}║${NC}\n" "${SCHEME}://${API_HOST}:9001"
  printf "${GREEN}║${NC}                                                              ${GREEN}║${NC}\n"
  printf "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}\n"
  printf "${GREEN}║${NC}  ${YELLOW}Manage (from ${DOCKER_DIR}):${NC}                   ${GREEN}║${NC}\n"
  printf "${GREEN}║${NC}    docker compose ps                  — status            ${GREEN}║${NC}\n"
  printf "${GREEN}║${NC}    docker compose logs -f             — live logs         ${GREEN}║${NC}\n"
  printf "${GREEN}║${NC}    docker compose down                — stop all          ${GREEN}║${NC}\n"
  printf "${GREEN}║${NC}    docker compose pull && up -d       — update & restart  ${GREEN}║${NC}\n"
  printf "${GREEN}║${NC}                                                              ${GREEN}║${NC}\n"
  if [[ "$SCHEME" == "http" ]]; then
    printf "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}\n"
    printf "${GREEN}║${NC}  ${YELLOW}⚠  Running over HTTP.${NC}                                     ${GREEN}║${NC}\n"
    printf "${GREEN}║${NC}     Set up nginx + certbot and re-run for HTTPS.           ${GREEN}║${NC}\n"
  fi
  printf "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}\n\n"
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  print_banner
  check_root "$@"
  update_system
  install_docker
  check_ports
  setup_repo
  ask_domains
  setup_docker_env
  patch_service_envs
  deploy
  health_checks
  print_success
}

main "$@"
