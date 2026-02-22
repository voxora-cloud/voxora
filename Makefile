.PHONY: help install dev build lint format clean docker-start docker-stop docker-clean widget-deploy docker-images docker-release all check-docker check-ports docker-health verify

REGISTRY ?= ompharate
VERSION := $(shell date +%Y.%m.%d)-$(shell git rev-parse --short HEAD)
PLATFORMS := linux/amd64,linux/arm64

# Colors
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

define BANNER
	@printf "$(BLUE)"
@printf "██╗   ██╗ ██████╗ ██╗  ██╗ ██████╗ ██████╗  █████╗ \n"
@printf "██║   ██║██╔═══██╗╚██╗██╔╝██╔═══██╗██╔══██╗██╔══██╗\n"
@printf "██║   ██║██║   ██║ ╚███╔╝ ██║   ██║██████╔╝███████║\n"
@printf "╚██╗ ██╔╝██║   ██║ ██╔██╗ ██║   ██║██╔══██╗██╔══██║\n"
@printf " ╚████╔╝ ╚██████╔╝██╔╝ ██╗╚██████╔╝██║  ██║██║  ██║\n"
@printf "  ╚═══╝   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝\n"
	@printf "$(NC)"
	@echo ""
endef

help: ## Show available commands
	$(BANNER)
	@echo "$(BLUE)Voxora Development Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)First time setup?$(NC) Run: make check-docker && make all"

check-docker: ## Check Docker installation and requirements
	@echo "$(BLUE)🔍 Checking Docker setup...$(NC)"
	@command -v docker >/dev/null 2>&1 || { \
		echo "$(RED)❌ Docker is not installed!$(NC)"; \
		echo ""; \
		echo "$(YELLOW)Please install Docker Desktop:$(NC)"; \
		echo "  macOS: https://docs.docker.com/desktop/install/mac-install/"; \
		echo "  Linux: https://docs.docker.com/engine/install/"; \
		echo "  Windows: https://docs.docker.com/desktop/install/windows-install/"; \
		echo ""; \
		exit 1; \
	}
	@docker info >/dev/null 2>&1 || { \
		echo "$(RED)❌ Docker daemon is not running!$(NC)"; \
		echo ""; \
		echo "$(YELLOW)Please start Docker Desktop and try again.$(NC)"; \
		echo ""; \
		exit 1; \
	}
	@command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1 || { \
		echo "$(RED)❌ docker-compose is not installed!$(NC)"; \
		echo ""; \
		echo "$(YELLOW)Please install docker-compose:$(NC)"; \
		echo "  https://docs.docker.com/compose/install/"; \
		echo ""; \
		exit 1; \
	}
	@echo "$(GREEN)✅ Docker is installed and running$(NC)"
	@docker --version
	@docker-compose --version 2>/dev/null || docker compose version

check-ports: ## Check if required ports are available
	@echo "$(BLUE)🔍 Checking required ports...$(NC)"
	@for port in 3000 3001 3002 6379 9001 9002 27017 8081 1025 8025; do \
		if lsof -Pi :$$port -sTCP:LISTEN -t >/dev/null 2>&1; then \
			echo "$(YELLOW)⚠️  Port $$port is already in use$(NC)"; \
			lsof -Pi :$$port -sTCP:LISTEN | head -2; \
			echo ""; \
		fi; \
	done
	@echo "$(GREEN)✅ Port check complete$(NC)"

verify: ## Verify system requirements (git, node, npm, ports)
	@echo "$(BLUE)🔍 Verifying system requirements...$(NC)"
	@echo ""
	@echo "$(BLUE)📋 Checking installed tools:$(NC)"
	@command -v git >/dev/null 2>&1 && { \
		echo "$(GREEN)✅ Git:$(NC) $$(git --version)"; \
	} || { \
		echo "$(RED)❌ Git is not installed!$(NC)"; \
		echo "$(YELLOW)Please install Git: https://git-scm.com/downloads$(NC)"; \
		exit 1; \
	}
	@command -v node >/dev/null 2>&1 && { \
		echo "$(GREEN)✅ Node.js:$(NC) $$(node --version)"; \
	} || { \
		echo "$(RED)❌ Node.js is not installed!$(NC)"; \
		echo "$(YELLOW)Please install Node.js: https://nodejs.org/$(NC)"; \
		exit 1; \
	}
	@command -v npm >/dev/null 2>&1 && { \
		echo "$(GREEN)✅ npm:$(NC) $$(npm --version)"; \
	} || { \
		echo "$(RED)❌ npm is not installed!$(NC)"; \
		echo "$(YELLOW)Please install Node.js (includes npm): https://nodejs.org/$(NC)"; \
		exit 1; \
	}
	@echo ""
	@echo "$(BLUE)🔌 Checking required ports:$(NC)"
	@ports_in_use=0; \
	for port in 3000 3001 3002 6379 9001 9002 27017 8081 1025 8025; do \
		if lsof -Pi :$$port -sTCP:LISTEN -t >/dev/null 2>&1; then \
			echo "$(YELLOW)⚠️  Port $$port is in use$(NC)"; \
			ports_in_use=$$((ports_in_use + 1)); \
		else \
			echo "$(GREEN)✅ Port $$port is available$(NC)"; \
		fi; \
	done; \
	if [ $$ports_in_use -gt 0 ]; then \
		echo ""; \
		echo "$(YELLOW)⚠️  $$ports_in_use port(s) in use. Run 'make check-ports' for details.$(NC)"; \
	fi
	@echo ""
	@echo "$(GREEN)✅ System verification complete!$(NC)"

all: ## Install, start Docker, deploy widget, and run dev (api + web + ai)
	$(BANNER)
	@echo "$(BLUE)  Installing Voxora...$(NC)"
	@echo ""
	@sleep 2
	@$(MAKE) verify
	@$(MAKE) check-docker
	@$(MAKE) install
	@$(MAKE) docker-start
	@$(MAKE) widget-deploy
	@$(MAKE) dev

use-localhost: ## Switch all env files back to localhost
	@./scripts/use-host.sh localhost

use-network: ## Switch all env files to your local network IP (auto-detected)
	@HOST=$$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $$1}'); \
	if [ -z "$$HOST" ]; then \
		echo "$(RED)Could not auto-detect network IP. Run: make use-network-ip IP=192.168.x.x$(NC)"; \
		exit 1; \
	fi; \
	./scripts/use-host.sh $$HOST

use-network-ip: ## Switch all env files to a specific IP: make use-network-ip IP=192.168.1.100
	@if [ -z "$(IP)" ]; then echo "$(RED)Usage: make use-network-ip IP=192.168.x.x$(NC)"; exit 1; fi
	@./scripts/use-host.sh $(IP)

install: ## Install dependencies
	@echo "$(BLUE)📦 Installing dependencies...$(NC)"
	@command -v npm >/dev/null 2>&1 || { \
		echo "$(RED)❌ npm is not installed!$(NC)"; \
		echo ""; \
		echo "$(YELLOW)Please install Node.js (includes npm):$(NC)"; \
		echo "  https://nodejs.org/"; \
		echo ""; \
		exit 1; \
	}
	@npm install || { \
		echo "$(RED)❌ npm install failed!$(NC)"; \
		echo ""; \
		echo "$(YELLOW)Try the following:$(NC)"; \
		echo "  1. Delete node_modules: rm -rf node_modules apps/*/node_modules"; \
		echo "  2. Clear npm cache: npm cache clean --force"; \
		echo "  3. Run again: make install"; \
		echo ""; \
		exit 1; \
	}
	@echo "$(GREEN)✅ Dependencies installed$(NC)"

dev: ## Start development servers (api, web, ai)

	@echo "$(BLUE)🚀 Starting all dev servers via Turbo (api, web, ai)...$(NC)"
	npm run dev

build: ## Build all applications
	npm run build

lint: ## Run linters
	npm run lint

format: ## Format code
	npm run format

check-types: ## Type check
	npm run check-types

docker-start: check-docker ## Start Docker services
	@echo "$(BLUE)🐳 Starting Docker services...$(NC)"
	@cd docker && docker-compose -f docker-compose.dev.yml up -d redis mongodb mongo-express mailhog minio qdrant || { \
		echo "$(RED)❌ Failed to start Docker services!$(NC)"; \
		echo ""; \
		echo "$(YELLOW)Common issues:$(NC)"; \
		echo "  1. Port conflicts - Run: make check-ports"; \
		echo "  2. Docker daemon not running - Start Docker Desktop"; \
		echo "  3. Insufficient resources - Check Docker Desktop settings"; \
		echo ""; \
		echo "$(YELLOW)View logs:$(NC) make docker-logs"; \
		exit 1; \
	}
	@echo ""
	@echo "$(GREEN)✅ Docker services started successfully!$(NC)"
	@echo ""
	@echo "$(BLUE)📋 Available services:$(NC)"
	@echo "  $(GREEN)✓$(NC) MongoDB        → mongodb://localhost:27017 (admin/dev123)"
	@echo "  $(GREEN)✓$(NC) Mongo Express  → http://localhost:8081 (admin/dev123)"
	@echo "  $(GREEN)✓$(NC) Redis          → localhost:6379 (password: dev123)"
	@echo "  $(GREEN)✓$(NC) MailHog UI     → http://localhost:8025"
	@echo "  $(GREEN)✓$(NC) MinIO API      → http://localhost:9001"
	@echo "  $(GREEN)✓$(NC) MinIO Console  → http://localhost:9002 (minioadmin/minioadmin)"
	@echo ""
	@echo "$(BLUE)📋 App services (started via 'make dev' / turbo):$(NC)"
	@echo "  $(GREEN)✓$(NC) API            → http://localhost:3002"
	@echo "  $(GREEN)✓$(NC) Web            → http://localhost:3000"
	@echo "  $(GREEN)✓$(NC) AI Worker      → BullMQ worker (queue: ai-processing)"
	@echo ""
	@sleep 2
	@$(MAKE) docker-health

docker-health: ## Check health of Docker services
	@echo "$(BLUE)🏥 Checking service health...$(NC)"
	@sleep 3
	@docker ps --filter "name=voxora-" --format "table {{.Names}}\t{{.Status}}" | grep -v "NAMES" | while read line; do \
		if echo "$$line" | grep -q "Up"; then \
			echo "$(GREEN)✓$(NC) $$line"; \
		else \
			echo "$(RED)✗$(NC) $$line"; \
		fi; \
	done || true
	@echo ""

docker-stop: ## Stop Docker services
	cd docker && docker-compose -f docker-compose.dev.yml down

docker-clean: ## Stop and remove volumes
	cd docker && docker-compose -f docker-compose.dev.yml down -v

docker-logs: ## Show Docker logs
	$(BANNER)
	cd docker && docker-compose -f docker-compose.dev.yml logs -f

widget-deploy: ## Build and deploy widget to MinIO
	@echo "$(BLUE)📦 Building and deploying widget...$(NC)"
	@cd apps/widget && npm run build && npm run deploy || { \
		echo "$(RED)❌ Widget deployment failed!$(NC)"; \
		echo ""; \
		echo "$(YELLOW)Make sure:$(NC)"; \
		echo "  1. MinIO is running - Run: make docker-start"; \
		echo "  2. Dependencies are installed - Run: make install"; \
		echo "  3. Widget build completes - Check apps/widget/dist/"; \
		echo ""; \
		exit 1; \
	}
	@echo "$(GREEN)✅ Widget deployed to MinIO$(NC)"
	@echo "$(BLUE)📍 Widget URL:$(NC) http://localhost:9001/voxora-widget/v1/voxora.js"
	@echo ""

docker-setup-builder:
	@docker buildx create --use --name voxora-builder 2>/dev/null || docker buildx use voxora-builder

docker-build-api: docker-setup-builder ## Build API image
	docker buildx build --platform $(PLATFORMS) \
		--tag $(REGISTRY)/voxora-api:$(VERSION) \
		--tag $(REGISTRY)/voxora-api:latest \
		--push -f apps/api/Dockerfile apps/api

docker-build-web: docker-setup-builder ## Build Web image
	docker buildx build --platform $(PLATFORMS) \
		--tag $(REGISTRY)/voxora-web:$(VERSION) \
		--tag $(REGISTRY)/voxora-web:latest \
		--push -f apps/web/Dockerfile apps/web

docker-build-ai: docker-setup-builder ## Build AI worker image
	docker buildx build --platform $(PLATFORMS) \
		--tag $(REGISTRY)/voxora-ai:$(VERSION) \
		--tag $(REGISTRY)/voxora-ai:latest \
		--push -f apps/ai/Dockerfile apps/ai

docker-images: docker-build-api docker-build-web docker-build-ai ## Build all images

docker-release: docker-setup-builder ## Build and push all images with RELEASE_VERSION (e.g. make docker-release RELEASE_VERSION=0.9.0-beta)
	@[ "$(RELEASE_VERSION)" ] || { echo "$(RED)❌ RELEASE_VERSION is required$(NC)  usage: make docker-release RELEASE_VERSION=0.9.0-beta"; exit 1; }
	docker buildx build --platform $(PLATFORMS) \
		--tag $(REGISTRY)/voxora-api:$(RELEASE_VERSION) \
		--tag $(REGISTRY)/voxora-api:latest \
		--push -f apps/api/Dockerfile apps/api
	docker buildx build --platform $(PLATFORMS) \
		--tag $(REGISTRY)/voxora-web:$(RELEASE_VERSION) \
		--tag $(REGISTRY)/voxora-web:latest \
		--push -f apps/web/Dockerfile apps/web
	docker buildx build --platform $(PLATFORMS) \
		--tag $(REGISTRY)/voxora-ai:$(RELEASE_VERSION) \
		--tag $(REGISTRY)/voxora-ai:latest \
		--push -f apps/ai/Dockerfile apps/ai
	@echo "$(GREEN)✅ Released $(RELEASE_VERSION) to Docker Hub$(NC)"

clean: ## Clean artifacts
	rm -rf node_modules apps/*/node_modules apps/*/dist apps/*/.turbo .turbo

