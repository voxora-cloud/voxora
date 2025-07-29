#!/bin/bash

# Development Environment Setup Script
echo "Starting Voxora Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Create necessary directories
mkdir -p logs

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.development ]; then
        cp .env.development .env
        echo "Copied .env.development to .env"
    else
        echo "Warning: No environment file found. Please create .env file."
    fi
fi

# Build and start development environment
echo "Building development containers..."
docker-compose -f src/docker-compose.dev.yml build

echo "Starting development services..."
docker-compose -f src/docker-compose.dev.yml up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

echo "Development environment is ready!"
echo ""
echo "Services available at:"
echo "- API Server: http://localhost:3001"
echo "- MongoDB Express: http://localhost:8081 (admin/dev123)"
echo "- Redis Commander: http://localhost:8082"
echo ""
echo "To view logs: docker-compose -f src/docker-compose.dev.yml logs -f"
echo "To stop: docker-compose -f src/docker-compose.dev.yml down"
