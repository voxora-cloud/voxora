#!/bin/bash
set -e

# ============================================================
# Voxora Installation Script
# Supports: Amazon Linux 2023 (more OS support coming soon)
# ============================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
        OS_NAME=$NAME
    else
        log_error "Cannot detect OS. /etc/os-release not found."
        exit 1
    fi
    
    log_info "Detected OS: $OS_NAME ($OS $OS_VERSION)"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root or with sudo"
        exit 1
    fi
}

# Check if Docker is installed
check_docker() {
    if command -v docker &> /dev/null; then
        log_success "Docker is already installed: $(docker --version)"
        return 0
    else
        return 1
    fi
}

# Check if Docker Compose is installed
check_docker_compose() {
    if docker compose version &> /dev/null; then
        log_success "Docker Compose is already installed: $(docker compose version)"
        return 0
    else
        return 1
    fi
}

# Install Docker on Amazon Linux 2023
install_docker_amazon_linux_2023() {
    # Check if Docker is already installed
    if command -v docker &> /dev/null; then
        log_success "Docker is already installed: $(docker --version)"
        
        # Ensure Docker is running
        if ! systemctl is-active --quiet docker; then
            log_info "Starting Docker service..."
            systemctl start docker
            systemctl enable docker
        fi
        
        # Add current user to docker group if not already member
        if [ -n "$SUDO_USER" ] && ! groups "$SUDO_USER" | grep -q docker; then
            usermod -aG docker "$SUDO_USER"
            log_info "Added $SUDO_USER to docker group. You may need to log out and back in."
        fi
        
        return 0
    fi
    
    log_info "Installing Docker on Amazon Linux 2023..."
    
    # Update system
    dnf update -y
    
    # Install Docker
    dnf install -y docker
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    # Add current user to docker group (if not root)
    if [ -n "$SUDO_USER" ]; then
        usermod -aG docker "$SUDO_USER"
        log_info "Added $SUDO_USER to docker group. You may need to log out and back in."
    fi
    
    log_success "Docker installed successfully"
}

# Install Docker Compose on Amazon Linux 2023
install_docker_compose_amazon_linux_2023() {
    # Check if docker compose (plugin) is already available
    if docker compose version &> /dev/null 2>&1; then
        log_success "Docker Compose is already installed: $(docker compose version)"
        return 0
    fi
    
    # Check if docker-compose (standalone) is already available
    if command -v docker-compose &> /dev/null && docker-compose --version &> /dev/null 2>&1; then
        log_success "Docker Compose is already installed: $(docker-compose --version)"
        return 0
    fi
    
    log_info "Installing Docker Compose CLI plugin..."
    
    # Create the directory for Docker CLI plugins if it doesn't exist
    mkdir -p /usr/local/lib/docker/cli-plugins
    
    # Get the latest Docker Compose version
    log_info "Fetching latest Docker Compose version..."
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f 4)
    
    if [ -z "$COMPOSE_VERSION" ]; then
        log_error "Failed to fetch Docker Compose version. Trying direct download..."
        COMPOSE_VERSION="latest"
    else
        log_info "Latest version: $COMPOSE_VERSION"
    fi
    
    # Download the latest Docker Compose plugin binary
    log_info "Downloading Docker Compose plugin..."
    curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/lib/docker/cli-plugins/docker-compose
    
    # Make the downloaded binary executable
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    
    # Verify installation
    if docker compose version &> /dev/null 2>&1; then
        log_success "Docker Compose installed successfully: $(docker compose version)"
    else
        log_error "Docker Compose installation failed. Please check the installation manually."
        exit 1
    fi
}

# Install dependencies for Amazon Linux 2023
install_dependencies_amazon_linux_2023() {
    log_info "Installing dependencies..."
    
    # Install git if not present
    if ! command -v git &> /dev/null; then
        dnf install -y git
    else
        log_success "git is already installed"
    fi
    
    # Check if curl is available (curl-minimal provides curl command)
    if ! command -v curl &> /dev/null; then
        # curl not available, install full curl package
        dnf install -y curl
    else
        log_success "curl is already available"
    fi
    
    log_success "Dependencies ready"
}

# Generic install function that routes to OS-specific installers
install_docker_and_compose() {
    case "$OS" in
        amzn)
            if [[ "$OS_VERSION" == "2023" ]]; then
                install_dependencies_amazon_linux_2023
                if ! check_docker; then
                    install_docker_amazon_linux_2023
                fi
                if ! check_docker_compose; then
                    install_docker_compose_amazon_linux_2023
                fi
            else
                log_error "Amazon Linux $OS_VERSION is not supported yet. Only Amazon Linux 2023 is supported."
                exit 1
            fi
            ;;
        ubuntu|debian)
            log_error "Ubuntu/Debian support coming soon. Please install Docker manually for now."
            exit 1
            ;;
        centos|rhel|rocky|almalinux)
            log_error "RHEL-based distributions support coming soon. Please install Docker manually for now."
            exit 1
            ;;
        *)
            log_error "Unsupported OS: $OS. Please install Docker manually."
            exit 1
            ;;
    esac
}

# Check if ports are available
check_ports() {
    log_info "Checking if required ports are available..."
    
    REQUIRED_PORTS=(80 443)
    BLOCKED_PORTS=()
    
    for port in "${REQUIRED_PORTS[@]}"; do
        if ss -tuln | grep -q ":$port "; then
            BLOCKED_PORTS+=($port)
        fi
    done
    
    if [ ${#BLOCKED_PORTS[@]} -gt 0 ]; then
        log_error "The following ports are already in use: ${BLOCKED_PORTS[*]}"
        log_error "Please stop the services using these ports and try again."
        exit 1
    fi
    
    log_success "All required ports are available"
}

# Prompt for configuration
prompt_config() {
    echo ""
    log_info "=== Voxora Configuration ==="
    echo ""
    
    # API Host
    read -p "Enter API domain (e.g., apivoxora.voxora.cloud): " API_HOST
    if [ -z "$API_HOST" ]; then
        log_error "API domain cannot be empty"
        exit 1
    fi
    
    # Web Host
    read -p "Enter Web domain (e.g., app.voxora.cloud): " WEB_HOST
    if [ -z "$WEB_HOST" ]; then
        log_error "Web domain cannot be empty"
        exit 1
    fi
    
    # CDN Host
    read -p "Enter CDN domain (e.g., cdn.voxora.cloud): " CDN_HOSTi
    if [ -z "$CDN_HOST" ]; then
        log_error "CDN domain cannot be empty"
        exit 1
    fi
    
    # Generate secure passwords
    MONGO_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    MINIO_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    
    echo ""
    log_success "Configuration collected successfully"
}

# Create .env files
create_env_files() {
    log_info "Creating environment files..."
    
    # docker/.env
    cat > docker/.env << EOF
# ============================================================
# docker/.env — Docker Compose configuration
# Generated by install.sh on $(date)
# ============================================================

# MongoDB
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=$MONGO_PASSWORD

# Redis
REDIS_PASSWORD=$REDIS_PASSWORD

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=$MINIO_PASSWORD

# MinIO public URL (CDN subdomain)
MINIO_PUBLIC_URL=https://$CDN_HOST

# Caddy reverse-proxy hosts
API_HOST=$API_HOST
WEB_HOST=$WEB_HOST
CDN_HOST=$CDN_HOST

# Widget API URL (baked into the widget JS at build time)
API_URL_PRODUCTION=https://$API_HOST
EOF
    
    # apps/api/.env.docker
    cat > apps/api/.env.docker << EOF
# ============================================================
# apps/api/.env.docker — API service configuration
# Generated by install.sh on $(date)
# ============================================================

NODE_ENV=production
PORT=3002

# MongoDB (service hostname: mongodb)
MONGODB_URI=mongodb://admin:$MONGO_PASSWORD@mongodb:27017/voxora-chat?authSource=admin

# Redis (service hostname: redis)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=$JWT_SECRET
REFRESH_TOKEN_EXPIRES_IN=30d

# MinIO (service hostname: minio)
MINIO_ENDPOINT=minio
MINIO_PORT=9001
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=$MINIO_PASSWORD
MINIO_USE_SSL=false
MINIO_PUBLIC_URL=https://$CDN_HOST

# CORS
CLIENT_URL=https://$WEB_HOST
ALLOWED_ORIGINS=https://$WEB_HOST,https://$API_HOST

# Email (configure your SMTP)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password
EMAIL_FROM=noreply@voxora.cloud
EOF
    
    # apps/web/.env.docker
    cat > apps/web/.env.docker << EOF
# ============================================================
# apps/web/.env.docker — Web frontend configuration
# Generated by install.sh on $(date)
# ============================================================

NEXT_PUBLIC_API_URL=https://$API_HOST/api/v1
NEXT_PUBLIC_SOCKET_URL=https://$API_HOST
NEXT_PUBLIC_CDN_URL=https://$CDN_HOST/voxora-widget/v1/voxora.js?v=2
EOF
    
    # apps/widget/.env.docker
    cat > apps/widget/.env.docker << EOF
# ============================================================
# apps/widget/.env.docker — Widget configuration
# Generated by install.sh on $(date)
# ============================================================

API_URL_PRODUCTION=https://$API_HOST
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=$MINIO_PASSWORD
EOF
    
    # apps/ai/.env.docker (if exists)
    if [ -d "apps/ai" ]; then
        cat > apps/ai/.env.docker << EOF
# ============================================================
# apps/ai/.env.docker — AI service configuration
# Generated by install.sh on $(date)
# ============================================================

NODE_ENV=production
PORT=3003

# MongoDB (service hostname: mongodb)
MONGODB_URI=mongodb://admin:$MONGO_PASSWORD@mongodb:27017/voxora-chat?authSource=admin

# Redis (service hostname: redis)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# MinIO (service hostname: minio)
MINIO_ENDPOINT=minio
MINIO_PORT=9001
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=$MINIO_PASSWORD
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=voxora-chat

# Qdrant (service hostname: qdrant)
QDRANT_URL=http://qdrant:6333

# LLM Provider (Gemini recommended, configure API key below)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
LLM_PROVIDER=gemini

# Embeddings
EMBEDDING_PROVIDER=gemini
GEMINI_EMBEDDING_MODEL=gemini-embedding-001

# RAG Configuration
RAG_TOP_K=5
CHAT_HISTORY_LIMIT=20

# Workers
WORKER_CONCURRENCY=5
INGESTION_CONCURRENCY=2
EOF
    fi
    
    log_success "Environment files created"
}

# Start services
start_services() {
    log_info "Starting Voxora services..."
    
    cd docker
    docker compose up -d
    
    log_info "Waiting for services to be healthy..."
    sleep 10
    
    # Check service health
    if docker compose ps | grep -q "unhealthy"; then
        log_warning "Some services are unhealthy. Check logs with: docker compose logs"
    else
        log_success "All services started successfully"
    fi
    
    cd ..
}

# Print success message
print_success() {
    echo ""
    echo "============================================================"
    log_success "Voxora has been installed successfully!"
    echo "============================================================"
    echo ""
    echo "Your Voxora instance is running at:"
    echo "  • Web:  https://$WEB_HOST"
    echo "  • API:  https://$API_HOST/api/v1"
    echo "  • CDN:  https://$CDN_HOST"
    echo ""
    echo "⚠️  IMPORTANT:"
    echo "  1. Ensure DNS A records point to this server's IP:"
    echo "     - $API_HOST → $(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
    echo "     - $WEB_HOST → $(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
    echo "     - $CDN_HOST → $(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
    echo ""
    echo "  2. Allow ports in your firewall/security group:"
    echo "     - TCP 80 (HTTP)"
    echo "     - TCP 443 (HTTPS)"
    echo "     - UDP 443 (HTTP/3, optional)"
    echo ""
    echo "  3. Caddy will automatically obtain Let's Encrypt SSL certificates"
    echo "     (may take a few minutes)"
    echo ""
    echo "  4. Configure email SMTP in apps/api/.env.docker for production use"
    echo ""
    echo "Useful commands:"
    echo "  • View logs:       cd docker && docker compose logs -f"
    echo "  • Stop services:   cd docker && docker compose down"
    echo "  • Restart:         cd docker && docker compose restart"
    echo ""
    echo "Credentials saved in docker/.env (keep this file secure!)"
    echo "============================================================"
}

# Main installation flow
main() {
    echo ""
    echo "============================================================"
    echo "           Voxora Installation Script"
    echo "============================================================"
    echo ""
    
    # Check if running as root
    check_root
    
    # Detect OS
    detect_os
    
    # Install Docker and Docker Compose
    install_docker_and_compose
    
    # Check ports
    check_ports
    
    # Prompt for configuration
    prompt_config
    
    # Create environment files
    create_env_files
    
    # Start services
    start_services
    
    # Print success message
    print_success
}

# Run main function
main
