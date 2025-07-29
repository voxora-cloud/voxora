# Stop Development Environment Script for Windows
Write-Host "Stopping Voxora Development Environment..." -ForegroundColor Yellow

# Stop all development containers
docker-compose -f src/docker-compose.dev.yml down

Write-Host "Development environment stopped!" -ForegroundColor Green
Write-Host ""
Write-Host "To remove volumes (this will delete all data): docker-compose -f src/docker-compose.dev.yml down -v" -ForegroundColor Gray
