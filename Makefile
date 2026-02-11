.PHONY: help install dev build lint format clean docker-start docker-stop docker-clean widget-deploy docker-images all

REGISTRY ?= ompharate
VERSION := $(shell date +%Y.%m.%d)-$(shell git rev-parse --short HEAD)
PLATFORMS := linux/amd64,linux/arm64

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

all: install docker-start widget-deploy dev ## Install, start Docker, deploy widget, and run dev

install: ## Install dependencies
	npm install

dev: ## Start development servers
	npm run dev

build: ## Build all applications
	npm run build

lint: ## Run linters
	npm run lint

format: ## Format code
	npm run format

check-types: ## Type check
	npm run check-types

docker-start: ## Start Docker services
	cd docker && docker-compose -f docker-compose.dev.yml up -d redis mongodb mongo-express mailhog minio

docker-stop: ## Stop Docker services
	cd docker && docker-compose -f docker-compose.dev.yml down

docker-clean: ## Stop and remove volumes
	cd docker && docker-compose -f docker-compose.dev.yml down -v

docker-logs: ## Show Docker logs
	cd docker && docker-compose -f docker-compose.dev.yml logs -f

widget-deploy: ## build and Deploy widget to MinIO
	cd apps/widget && npm run build && npm run deploy

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

docker-images: docker-build-api docker-build-web ## Build all images

clean: ## Clean artifacts
	rm -rf node_modules apps/*/node_modules apps/*/dist apps/*/.turbo .turbo

