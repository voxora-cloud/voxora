#!/bin/bash
set -e

# ============================================================
# InteraOne Installation Script
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

# Install Docker and Docker Compose on Ubuntu/Debian
install_docker_ubuntu_debian() {
    if command -v docker &> /dev/null; then
        log_success "Docker already installed: $(docker --version)"
        if ! systemctl is-active --quiet docker; then
            systemctl start docker
            systemctl enable docker
        fi
        if [ -n "$SUDO_USER" ] && ! groups "$SUDO_USER" | grep -q docker; then
            usermod -aG docker "$SUDO_USER"
        fi
        return 0
    fi

    log_info "Installing Docker on $OS_NAME using official Docker apt repository..."
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg lsb-release git

    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL "https://download.docker.com/linux/${OS}/gpg" | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Set up the repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${OS} \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    systemctl start docker
    systemctl enable docker

    if [ -n "$SUDO_USER" ]; then
        usermod -aG docker "$SUDO_USER"
    fi

    log_success "Docker installed: $(docker --version)"
    log_success "Docker Compose installed: $(docker compose version)"
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
            install_docker_ubuntu_debian
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
    # Initialize all configuration variables to prevent leakage/overwriting
    API_HOST=""
    WEB_HOST=""
    CDN_HOST=""
    EMAIL_PROVIDER=""
    AWS_REGION=""
    AWS_ACCESS_KEY_ID=""
    AWS_SECRET_ACCESS_KEY=""
    GEMINI_API_KEY=""
    GEMINI_MODEL=""
    GEMINI_EMBEDDING_MODEL=""
    BEDROCK_MODEL=""
    BEDROCK_EMBEDDING_MODEL=""
    BEDROCK_EMBEDDING_DIMENSIONS=""
    HF_TOKEN=""
    HF_MODEL=""
    HF_EMBEDDING_MODEL=""
    HF_EMBEDDING_DIMENSIONS=""
    OPENAI_API_KEY=""
    OPENAI_MODEL=""
    OPENAI_EMBEDDING_MODEL=""
    OPENAI_EMBEDDING_DIMENSIONS=""
    OLLAMA_HOST=""
    OLLAMA_PORT=""
    OLLAMA_MODEL=""
    OLLAMA_EMBEDDING_MODEL=""
    OLLAMA_EMBEDDING_DIMENSIONS=""

    echo ""
    log_info "=== InteraOne Configuration ==="
    echo ""
    
    # API Host
    read -p "Enter API domain (e.g., api.interaone.cloud): " API_HOST
    if [ -z "$API_HOST" ]; then
        log_error "API domain cannot be empty"
        exit 1
    fi
    
    # Web Host
    read -p "Enter Web domain (e.g., app.interaone.cloud): " WEB_HOST
    if [ -z "$WEB_HOST" ]; then
        log_error "Web domain cannot be empty"
        exit 1
    fi
    
    # CDN Host
    read -p "Enter CDN domain (e.g., cdn.interaone.cloud): " CDN_HOST
    if [ -z "$CDN_HOST" ]; then
        log_error "CDN domain cannot be empty"
        exit 1
    fi

    echo ""
    log_info "=== Email Provider Configuration ==="
    echo ""

    echo "Choose an Email Provider:"
    # Temporarily set PS3 prompt for select statement
    OLD_PS3="$PS3"
    PS3="Enter selection [1-3]: "
    select email_opt in "AWS SES" "MailHog (local dev)" "Disabled"; do
        case $email_opt in
            "AWS SES")
                EMAIL_PROVIDER="ses"
                read -p "Enter AWS Access Key ID: " AWS_ACCESS_KEY_ID
                read -p "Enter AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
                read -p "Enter AWS Region [us-east-1]: " AWS_REGION
                AWS_REGION=${AWS_REGION:-us-east-1}
                break
                ;;
            "MailHog (local dev)")
                EMAIL_PROVIDER="mailhog"
                AWS_ACCESS_KEY_ID=""
                AWS_SECRET_ACCESS_KEY=""
                AWS_REGION="us-east-1"
                break
                ;;
            "Disabled")
                EMAIL_PROVIDER="disabled"
                AWS_ACCESS_KEY_ID=""
                AWS_SECRET_ACCESS_KEY=""
                AWS_REGION="us-east-1"
                break
                ;;
            *) echo "Invalid option. Please choose 1, 2, or 3.";;
        esac
    done

    echo ""
    log_info "=== LLM & Embedding Provider Configuration ==="
    echo ""

    echo "Choose an LLM & Embedding Provider:"
    PS3="Enter selection [1-5]: "
    select llm_opt in "Google Gemini" "AWS Bedrock" "Hugging Face" "OpenAI" "Ollama (local)"; do
        case $llm_opt in
            "Google Gemini")
                LLM_PROVIDER="gemini"
                EMBEDDING_PROVIDER="gemini"
                GEMINI_MODEL="gemini-2.5-flash"
                GEMINI_EMBEDDING_MODEL="gemini-embedding-001"
                read -p "Enter Gemini API Key: " GEMINI_API_KEY
                if [ -z "$GEMINI_API_KEY" ]; then
                    log_warning "Gemini API key not provided. AI features will not work."
                fi
                break
                ;;
            "AWS Bedrock")
                LLM_PROVIDER="bedrock"
                EMBEDDING_PROVIDER="bedrock"
                
                # If AWS keys were not collected in SES step, prompt for them
                if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
                    read -p "Enter AWS Access Key ID: " AWS_ACCESS_KEY_ID
                    read -p "Enter AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
                    read -p "Enter AWS Region [us-east-1]: " AWS_REGION
                    AWS_REGION=${AWS_REGION:-us-east-1}
                fi
                
                echo ""
                echo "Choose AWS Bedrock Model:"
                PS3="Enter selection [1-5]: "
                select model_opt in "Amazon Nova Pro" "Amazon Nova Lite" "Amazon Nova Micro" "Meta Llama 3.1 70B" "Claude 3.5 Sonnet"; do
                    case $model_opt in
                        "Amazon Nova Pro")
                            BEDROCK_MODEL="amazon.nova-pro-v1:0"
                            break
                            ;;
                        "Amazon Nova Lite")
                            BEDROCK_MODEL="amazon.nova-lite-v1:0"
                            break
                            ;;
                        "Amazon Nova Micro")
                            BEDROCK_MODEL="amazon.nova-micro-v1:0"
                            break
                            ;;
                        "Meta Llama 3.1 70B")
                            BEDROCK_MODEL="meta.llama3-1-70b-instruct-v1:0"
                            break
                            ;;
                        "Claude 3.5 Sonnet")
                            BEDROCK_MODEL="us.anthropic.claude-3-5-sonnet-20241022-v2:0"
                            break
                            ;;
                        *) echo "Invalid option. Please choose 1, 2, 3, 4, or 5.";;
                    esac
                done
                
                echo ""
                echo "Choose AWS Bedrock Embedding Model:"
                PS3="Enter selection [1-2]: "
                select embed_opt in "Titan Embeddings v2 (1024 dim)" "Cohere Embed Multilingual v3 (1024 dim)"; do
                    case $embed_opt in
                        "Titan Embeddings v2 (1024 dim)")
                            BEDROCK_EMBEDDING_MODEL="amazon.titan-embed-text-v2:0"
                            BEDROCK_EMBEDDING_DIMENSIONS="1024"
                            break
                            ;;
                        "Cohere Embed Multilingual v3 (1024 dim)")
                            BEDROCK_EMBEDDING_MODEL="cohere.embed-multilingual-v3"
                            BEDROCK_EMBEDDING_DIMENSIONS="1024"
                            break
                            ;;
                        *) echo "Invalid option. Please choose 1 or 2.";;
                    esac
                done
                break
                ;;
            "Hugging Face")
                LLM_PROVIDER="huggingface"
                EMBEDDING_PROVIDER="huggingface"
                read -p "Enter Hugging Face Token (HF_TOKEN): " HF_TOKEN
                read -p "Enter Hugging Face LLM Model [deepseek-ai/DeepSeek-V4-Flash]: " HF_MODEL
                HF_MODEL=${HF_MODEL:-deepseek-ai/DeepSeek-V4-Flash}
                read -p "Enter Hugging Face Embedding Model [sentence-transformers/all-MiniLM-L6-v2]: " HF_EMBEDDING_MODEL
                HF_EMBEDDING_MODEL=${HF_EMBEDDING_MODEL:-sentence-transformers/all-MiniLM-L6-v2}
                read -p "Enter Hugging Face Embedding Dimensions [384]: " HF_EMBEDDING_DIMENSIONS
                HF_EMBEDDING_DIMENSIONS=${HF_EMBEDDING_DIMENSIONS:-384}
                break
                ;;
            "OpenAI")
                LLM_PROVIDER="openai"
                EMBEDDING_PROVIDER="openai"
                read -p "Enter OpenAI API Key: " OPENAI_API_KEY
                read -p "Enter OpenAI LLM Model [gpt-4o-mini]: " OPENAI_MODEL
                OPENAI_MODEL=${OPENAI_MODEL:-gpt-4o-mini}
                read -p "Enter OpenAI Embedding Model [text-embedding-3-small]: " OPENAI_EMBEDDING_MODEL
                OPENAI_EMBEDDING_MODEL=${OPENAI_EMBEDDING_MODEL:-text-embedding-3-small}
                read -p "Enter OpenAI Embedding Dimensions [1536]: " OPENAI_EMBEDDING_DIMENSIONS
                OPENAI_EMBEDDING_DIMENSIONS=${OPENAI_EMBEDDING_DIMENSIONS:-1536}
                break
                ;;
            "Ollama (local)")
                LLM_PROVIDER="ollama"
                EMBEDDING_PROVIDER="ollama"
                read -p "Enter Ollama Host [ollama]: " OLLAMA_HOST
                OLLAMA_HOST=${OLLAMA_HOST:-ollama}
                read -p "Enter Ollama Port [11434]: " OLLAMA_PORT
                OLLAMA_PORT=${OLLAMA_PORT:-11434}
                read -p "Enter Ollama LLM Model [llama3.2]: " OLLAMA_MODEL
                OLLAMA_MODEL=${OLLAMA_MODEL:-llama3.2}
                read -p "Enter Ollama Embedding Model [nomic-embed-text]: " OLLAMA_EMBEDDING_MODEL
                OLLAMA_EMBEDDING_MODEL=${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}
                read -p "Enter Ollama Embedding Dimensions [768]: " OLLAMA_EMBEDDING_DIMENSIONS
                OLLAMA_EMBEDDING_DIMENSIONS=${OLLAMA_EMBEDDING_DIMENSIONS:-768}
                break
                ;;
            *) echo "Invalid option. Please choose 1, 2, 3, 4, or 5.";;
        esac
    done
    PS3="$OLD_PS3"

    echo ""
    # ── Dodo Payments ──
    log_info "=== Dodo Payments Configuration ==="
    read -p "Dodo Payments API key: " DODO_PAYMENTS_API_KEY
    [ -z "$DODO_PAYMENTS_API_KEY" ] && log_warning "Dodo API key empty — billing portal will be unavailable."

    read -p "Dodo webhook secret (whsec_...): " DODO_PAYMENTS_WEBHOOK_SECRET
    [ -z "$DODO_PAYMENTS_WEBHOOK_SECRET" ] && log_warning "Webhook secret empty — payment webhooks will be rejected."

    read -p "Dodo Product ID — Pro plan (pdt_...): " DODO_PAYMENTS_PRODUCT_PRO
    read -p "Dodo Product ID — Pro+ plan (pdt_...): " DODO_PAYMENTS_PRODUCT_PROPLUS
    
    # Generate (or reuse) secure passwords
    if [ -f "docker/.env" ] && grep -q "^MONGO_ROOT_PASSWORD=" docker/.env; then
        log_info "Existing docker/.env detected — reusing database passwords to preserve MongoDB data."
        MONGO_PASSWORD=$(grep "^MONGO_ROOT_PASSWORD=" docker/.env | cut -d= -f2-)
        REDIS_PASSWORD=$(grep "^REDIS_PASSWORD=" docker/.env | cut -d= -f2-)
        MINIO_PASSWORD=$(grep "^MINIO_ROOT_PASSWORD=" docker/.env | cut -d= -f2-)
        JWT_SECRET=$(grep "^JWT_SECRET=" docker/.env | cut -d= -f2-)
        AI_TOOL_SECRET=$(grep "^AI_TOOL_SECRET=" docker/.env | cut -d= -f2-)
        LOG_VIEWER_PORT=$(grep "^LOG_VIEWER_PORT=" docker/.env | cut -d= -f2- || echo "")
        # Reuse Dodo Payments keys if they exist, else use what user just input
        [ -z "$DODO_PAYMENTS_API_KEY" ] && DODO_PAYMENTS_API_KEY=$(grep "^DODO_PAYMENTS_API_KEY=" docker/.env | cut -d= -f2- || echo "")
        [ -z "$DODO_PAYMENTS_WEBHOOK_SECRET" ] && DODO_PAYMENTS_WEBHOOK_SECRET=$(grep "^DODO_PAYMENTS_WEBHOOK_SECRET=" docker/.env | cut -d= -f2- || echo "")
        [ -z "$DODO_PAYMENTS_PRODUCT_PRO" ] && DODO_PAYMENTS_PRODUCT_PRO=$(grep "^DODO_PAYMENTS_PRODUCT_PRO=" docker/.env | cut -d= -f2- || echo "")
        [ -z "$DODO_PAYMENTS_PRODUCT_PROPLUS" ] && DODO_PAYMENTS_PRODUCT_PROPLUS=$(grep "^DODO_PAYMENTS_PRODUCT_PROPLUS=" docker/.env | cut -d= -f2- || echo "")
    else
        MONGO_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        MINIO_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
        AI_TOOL_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    fi

    [ -z "$LOG_VIEWER_PORT" ] && LOG_VIEWER_PORT="8888"

    # Only generate users.yml if it does not exist
    if [ ! -f "docker/users.yml" ]; then
        LOG_VIEWER_USER="admin"
        LOG_VIEWER_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-20)
        SHOULD_GENERATE_USERS_YML="true"
    else
        SHOULD_GENERATE_USERS_YML="false"
    fi
    
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

# Widget runtime configuration (baked into the widget JS at deployment)
API_URL_PRODUCTION=https://$API_HOST
CDN_URL_PRODUCTION=https://$CDN_HOST

# JWT (used for re-run password recovery)
JWT_SECRET=$JWT_SECRET

# AI Tool auth (stored to keep re-runs in sync)
AI_TOOL_SECRET=$AI_TOOL_SECRET

# Dodo Payments (EE billing)
DODO_PAYMENTS_API_KEY=$DODO_PAYMENTS_API_KEY
DODO_PAYMENTS_WEBHOOK_SECRET=$DODO_PAYMENTS_WEBHOOK_SECRET
DODO_PAYMENTS_PRODUCT_PRO=$DODO_PAYMENTS_PRODUCT_PRO
DODO_PAYMENTS_PRODUCT_PROPLUS=$DODO_PAYMENTS_PRODUCT_PROPLUS

# Dozzle Log Viewer (OSS Log Console)
LOG_VIEWER_PORT=$LOG_VIEWER_PORT
EOF
    
    # Generate users.yml with bcrypt hashed password for Dozzle if it doesn't exist
    if [ "$SHOULD_GENERATE_USERS_YML" = "true" ]; then
        PASSWORD_HASH=$(node -e "console.log(require('./apps/gateway/node_modules/bcryptjs').hashSync('$LOG_VIEWER_PASSWORD', 10))")
        cat > docker/users.yml << EOF
users:
  $LOG_VIEWER_USER:
    name: "$LOG_VIEWER_USER"
    password: "$PASSWORD_HASH"
EOF
    fi
    
    # Resolve InteraOne Mode dynamically based on Dodo Payments config
    INTERAONE_MODE="self-host"
    if [ -n "$DODO_PAYMENTS_API_KEY" ]; then
        INTERAONE_MODE="cloud"
    fi

    # apps/gateway/.env.docker
    cat > apps/gateway/.env.docker << EOF
# ============================================================
# apps/gateway/.env.docker — API service configuration
# Generated by install.sh on $(date)
# ============================================================

NODE_ENV=production
PORT=3002
INTERAONE_MODE=$INTERAONE_MODE

# MongoDB (service hostname: mongodb)
MONGODB_URI=mongodb://admin:$MONGO_PASSWORD@mongodb:27017/interaone?authSource=admin

# Redis (service hostname: redis)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=$JWT_SECRET
JWT_REFRESH_EXPIRES_IN=30d

# MinIO (service hostname: minio)
MINIO_ENDPOINT=minio
MINIO_PORT=9001
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=$MINIO_PASSWORD
MINIO_USE_SSL=false
MINIO_PUBLIC_URL=https://$CDN_HOST
MINIO_BUCKET_NAME=interaone-chat

# CORS
CLIENT_URL=https://$WEB_HOST
ALLOWED_ORIGINS=https://$WEB_HOST,https://$API_HOST,https://$CDN_HOST

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Email
EMAIL_PROVIDER=$EMAIL_PROVIDER
EMAIL_FROM_NAME=InteraOne
EMAIL_FROM_EMAIL=noreply@interaone.app

# AWS SES credentials
AWS_REGION=$AWS_REGION
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY

# AI Tool auth (shared secret between gateway and agent services)
AI_TOOL_SECRET=$AI_TOOL_SECRET

# Public API URL for webhooks
PUBLIC_API_URL=https://$API_HOST

# Dodo Payments (EE billing)
DODO_PAYMENTS_API_KEY=$DODO_PAYMENTS_API_KEY
DODO_PAYMENTS_WEBHOOK_SECRET=$DODO_PAYMENTS_WEBHOOK_SECRET
DODO_PAYMENTS_PRODUCT_PRO=$DODO_PAYMENTS_PRODUCT_PRO
DODO_PAYMENTS_PRODUCT_PROPLUS=$DODO_PAYMENTS_PRODUCT_PROPLUS
EOF
    
    # apps/console/.env.docker
    cat > apps/console/.env.docker << EOF
# ============================================================
# apps/console/.env.docker — Web frontend configuration
# Generated by install.sh on $(date)
# ============================================================

VITE_API_URL=https://$API_HOST/api/v1
VITE_SOCKET_URL=https://$API_HOST
VITE_WIDGET_URL=https://$CDN_HOST/interaone-widget/v1/InteraOne.js?v=2
VITE_PUBLIC_ENV=production
VITE_INTERAONE_MODE=self-host
EOF
    
    # apps/launcher/.env.docker
    cat > apps/launcher/.env.docker << EOF
# ============================================================
# apps/launcher/.env.docker — Widget configuration
# Generated by install.sh on $(date)
# ============================================================

API_URL_PRODUCTION=https://$API_HOST
CDN_URL_PRODUCTION=https://$CDN_HOST
MINIO_ENDPOINT=minio
MINIO_PORT=9001
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=$MINIO_PASSWORD
MINIO_USE_SSL=false
EOF
    
    # apps/agent/.env.docker (if exists)
    if [ -d "apps/agent" ]; then
        cat > apps/agent/.env.docker << EOF
# ============================================================
# apps/agent/.env.docker — AI service configuration
# Generated by install.sh on $(date)
# ============================================================

NODE_ENV=production
PORT=3003

# MongoDB (service hostname: mongodb)
MONGODB_URI=mongodb://admin:$MONGO_PASSWORD@mongodb:27017/interaone?authSource=admin

# Redis (service hostname: redis)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# API (internal service hostname)
API_URL=http://gateway:3002/api/v1

# MinIO (service hostname: minio)
MINIO_ENDPOINT=minio
MINIO_PORT=9001
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=$MINIO_PASSWORD
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=interaone-chat

# Qdrant (service hostname: qdrant)
QDRANT_URL=http://qdrant:6333

# LLM Configuration
LLM_PROVIDER=$LLM_PROVIDER

# AWS Bedrock LLM
AWS_REGION=$AWS_REGION
BEDROCK_MODEL=$BEDROCK_MODEL
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY

# Google Gemini LLM
GEMINI_API_KEY=$GEMINI_API_KEY
GEMINI_MODEL=$GEMINI_MODEL

# Hugging Face LLM
HF_TOKEN=$HF_TOKEN
HF_MODEL=$HF_MODEL

# Ollama LLM
OLLAMA_HOST=$OLLAMA_HOST
OLLAMA_PORT=$OLLAMA_PORT
OLLAMA_MODEL=$OLLAMA_MODEL

# OpenAI LLM
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_MODEL=$OPENAI_MODEL


# Embedding Configuration
EMBEDDING_PROVIDER=$EMBEDDING_PROVIDER

# AWS Bedrock Embeddings
BEDROCK_EMBEDDING_MODEL=$BEDROCK_EMBEDDING_MODEL
BEDROCK_EMBEDDING_DIMENSIONS=$BEDROCK_EMBEDDING_DIMENSIONS

# Google Gemini Embeddings
GEMINI_EMBEDDING_MODEL=$GEMINI_EMBEDDING_MODEL

# Hugging Face Embeddings
HF_EMBEDDING_MODEL=$HF_EMBEDDING_MODEL
HF_EMBEDDING_DIMENSIONS=$HF_EMBEDDING_DIMENSIONS

# Ollama Embeddings
OLLAMA_EMBEDDING_MODEL=$OLLAMA_EMBEDDING_MODEL
OLLAMA_EMBEDDING_DIMENSIONS=$OLLAMA_EMBEDDING_DIMENSIONS

# OpenAI Embeddings
OPENAI_EMBEDDING_MODEL=$OPENAI_EMBEDDING_MODEL
OPENAI_EMBEDDING_DIMENSIONS=$OPENAI_EMBEDDING_DIMENSIONS


# RAG Settings
RAG_TOP_K=5
CHAT_HISTORY_LIMIT=6

# Workers
WORKER_CONCURRENCY=5
INGESTION_CONCURRENCY=2

# Tool auth (shared secret between api and ai services)
AI_TOOL_SECRET=$AI_TOOL_SECRET
EOF
    fi
    
    # apps/worker/.env.docker (if exists)
    if [ -d "apps/worker" ]; then
        cat > apps/worker/.env.docker << EOF
# ============================================================
# apps/worker/.env.docker — Worker service configuration
# Generated by install.sh on $(date)
# ============================================================

NODE_ENV=production

# MongoDB (service hostname: mongodb)
MONGODB_URI=mongodb://admin:$MONGO_PASSWORD@mongodb:27017/interaone?authSource=admin

# Redis (service hostname: redis)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# Email provider: mailhog | ses | disabled
EMAIL_PROVIDER=$EMAIL_PROVIDER

# AWS SES (required when EMAIL_PROVIDER=ses)
AWS_REGION=$AWS_REGION
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY

# Email sender identity
EMAIL_FROM_NAME=InteraOne
EMAIL_FROM_EMAIL=noreply@interaone.app

# Worker tuning
WORKER_CONCURRENCY=5
EOF
    fi
    
    log_success "Environment files created"
}

# Start services
start_services() {
    log_info "Starting InteraOne services..."
    
    DOCKER_COMPOSE_CMD="docker compose"
    if ! docker compose version &> /dev/null 2>&1; then
        if command -v docker-compose &> /dev/null; then
            DOCKER_COMPOSE_CMD="docker-compose"
        fi
    fi
    
    cd docker
    $DOCKER_COMPOSE_CMD up -d
    
    log_info "Waiting for services to be healthy..."
    sleep 10
    
    # Check service health
    if $DOCKER_COMPOSE_CMD ps | grep -q "unhealthy"; then
        log_warning "Some services are unhealthy. Check logs with: $DOCKER_COMPOSE_CMD logs"
    else
        log_success "All services started successfully"
    fi
    
    cd ..
}

# Print success message
print_success() {
    echo ""
    echo "============================================================"
    log_success "InteraOne has been installed successfully!"
    echo "============================================================"
    echo ""
    echo "Your InteraOne instance is running at:"
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
    echo "  4. Configure email SMTP in apps/gateway/.env.docker for production use"
    echo ""
    echo "Useful commands:"
    echo "  • View logs:       cd docker && $DOCKER_COMPOSE_CMD logs -f"
    echo "  • Stop services:   cd docker && $DOCKER_COMPOSE_CMD down"
    echo "  • Restart:         cd docker && $DOCKER_COMPOSE_CMD restart"
    echo ""
    echo "Credentials saved in docker/.env (keep this file secure!)"
    if [ "$SHOULD_GENERATE_USERS_YML" = "true" ]; then
        echo ""
        echo "🔒 Log Viewer Credentials (Dozzle):"
        echo "  • URL:      http://localhost:$LOG_VIEWER_PORT"
        echo "  • Username: $LOG_VIEWER_USER"
        echo "  • Password: $LOG_VIEWER_PASSWORD"
    else
        echo ""
        echo "🔒 Log Viewer (Dozzle) is active."
        echo "  • URL:      http://localhost:$LOG_VIEWER_PORT"
        echo "  • Credentials: (preserved in docker/users.yml)"
    fi
    echo "============================================================"
}

# Main installation flow
main() {
    echo ""
    echo "============================================================"
    echo "           InteraOne Installation Script"
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
