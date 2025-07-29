# Development Environment Setup Script for Windows
Write-Host "Starting Voxora Development Environment..." -ForegroundColor Green

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "Error: Docker is not running. Please start Docker and try again." -ForegroundColor Red
    exit 1
}

# Create necessary directories
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs"
}

# Copy environment file if it doesn't exist
if (!(Test-Path ".env")) {
    if (Test-Path ".env.development") {
        Copy-Item ".env.development" ".env"
        Write-Host "Copied .env.development to .env" -ForegroundColor Yellow
    } else {
        Write-Host "Warning: No environment file found. Please create .env file." -ForegroundColor Yellow
    }
}

# Build and start development environment
Write-Host "Building development containers..." -ForegroundColor Blue
docker-compose -f src/docker-compose.dev.yml build

Write-Host "Starting development services..." -ForegroundColor Blue
docker-compose -f src/docker-compose.dev.yml up -d

# Wait for services to be ready
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep 10

Write-Host "Development environment is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Services available at:" -ForegroundColor Cyan
Write-Host "- API Server: http://localhost:3001" -ForegroundColor White
Write-Host "- MongoDB Express: http://localhost:8081 (admin/dev123)" -ForegroundColor White
Write-Host "- Redis Commander: http://localhost:8082" -ForegroundColor White
Write-Host ""
Write-Host "To view logs: docker-compose -f src/docker-compose.dev.yml logs -f" -ForegroundColor Gray
Write-Host "To stop: docker-compose -f src/docker-compose.dev.yml down" -ForegroundColor Gray
