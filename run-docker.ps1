# EvaSafe Docker Management Script
# Run this script from the EvaSafe root directory

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "staging", "prod", "test", "stop", "logs", "build", "clean")]
    [string]$Action,
    
    [Parameter(Mandatory=$false)]
    [string]$Service = ""
)

# Set location to Docker Compose directory
$DockerDir = ".\Devops\DockerComposeFile"
Push-Location $DockerDir

Write-Host "🚀 EvaSafe Docker Management" -ForegroundColor Green
Write-Host "Action: $Action" -ForegroundColor Yellow

switch ($Action) {
    "dev" {
        Write-Host "🔧 Starting Development Environment..." -ForegroundColor Blue
        
        # Check if .env exists
        if (-not (Test-Path ".env")) {
            Write-Host "⚠️  .env file not found. Creating from template..." -ForegroundColor Yellow
            Copy-Item ".env.template" ".env"
            Write-Host "✅ Please edit .env file with your settings before proceeding." -ForegroundColor Green
            Write-Host "Opening .env file..." -ForegroundColor Yellow
            Start-Process notepad ".env"
            Read-Host "Press Enter after configuring .env file"
        }
        
        docker-compose -f docker-compose.dev.yml up -d
        
        Write-Host "✅ Development environment started!" -ForegroundColor Green
        Write-Host "🌐 Access points:" -ForegroundColor Cyan
        Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
        Write-Host "   API: http://localhost:5000" -ForegroundColor White
        Write-Host "   MongoDB Express: http://localhost:8081" -ForegroundColor White
        Write-Host "   Redis Commander: http://localhost:8082" -ForegroundColor White
    }
    
    "staging" {
        Write-Host "🎭 Starting Staging Environment..." -ForegroundColor Blue
        docker-compose -f docker-compose.staging.yml up -d
        Write-Host "✅ Staging environment started!" -ForegroundColor Green
    }
    
    "prod" {
        Write-Host "🏭 Starting Production Environment..." -ForegroundColor Blue
        docker-compose up -d
        
        Write-Host "✅ Production environment started!" -ForegroundColor Green
        Write-Host "🌐 Access points:" -ForegroundColor Cyan
        Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
        Write-Host "   API: http://localhost:5000" -ForegroundColor White
        Write-Host "   Prometheus: http://localhost:9090" -ForegroundColor White
        Write-Host "   Grafana: http://localhost:3030" -ForegroundColor White
    }
    
    "test" {
        Write-Host "🧪 Running Tests..." -ForegroundColor Blue
        docker-compose -f docker-compose.test.yml up --abort-on-container-exit
        Write-Host "✅ Tests completed!" -ForegroundColor Green
    }
    
    "stop" {
        Write-Host "🛑 Stopping All Services..." -ForegroundColor Red
        docker-compose down
        docker-compose -f docker-compose.dev.yml down
        docker-compose -f docker-compose.staging.yml down
        docker-compose -f docker-compose.test.yml down
        Write-Host "✅ All services stopped!" -ForegroundColor Green
    }
    
    "logs" {
        if ($Service -ne "") {
            Write-Host "📋 Viewing logs for $Service..." -ForegroundColor Blue
            docker-compose logs -f $Service
        } else {
            Write-Host "📋 Viewing all logs..." -ForegroundColor Blue
            docker-compose logs -f
        }
    }
    
    "build" {
        if ($Service -ne "") {
            Write-Host "🔨 Building $Service..." -ForegroundColor Blue
            docker-compose build $Service
        } else {
            Write-Host "🔨 Building all services..." -ForegroundColor Blue
            docker-compose build
        }
        Write-Host "✅ Build completed!" -ForegroundColor Green
    }
    
    "clean" {
        Write-Host "🧹 Cleaning Docker resources..." -ForegroundColor Red
        $confirm = Read-Host "This will remove all stopped containers, networks, and images. Continue? (y/N)"
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            docker-compose down -v
            docker system prune -a -f
            Write-Host "✅ Cleanup completed!" -ForegroundColor Green
        } else {
            Write-Host "❌ Cleanup cancelled." -ForegroundColor Yellow
        }
    }
}

Pop-Location

Write-Host ""
Write-Host "💡 Usage Examples:" -ForegroundColor Cyan
Write-Host "   .\run-docker.ps1 dev              # Start development environment" -ForegroundColor White
Write-Host "   .\run-docker.ps1 prod             # Start production environment" -ForegroundColor White
Write-Host "   .\run-docker.ps1 logs main-api    # View logs for main-api service" -ForegroundColor White
Write-Host "   .\run-docker.ps1 build            # Build all services" -ForegroundColor White
Write-Host "   .\run-docker.ps1 stop             # Stop all services" -ForegroundColor White
Write-Host "   .\run-docker.ps1 clean            # Clean Docker resources" -ForegroundColor White