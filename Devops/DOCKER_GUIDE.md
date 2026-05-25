# EvaSafe Docker Deployment Guide

## 🚀 Quick Start

### Prerequisites
```powershell
# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop/

# Verify installation
docker --version
docker-compose --version
```

### Initial Setup
```powershell
# 1. Navigate to the project root
cd C:\Users\Senaa\Desktop\EvaSafe

# 2. Copy environment template
cd Devops\DockerComposeFile
copy .env.template .env

# 3. Edit .env file with your actual values
notepad .env
```

## 📋 Environment Configuration

### Required Environment Variables
Edit the `.env` file with your values:
```bash
# Database
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your_secure_password

# Security
JWT_SECRET=your_jwt_secret_key
API_KEY=your_api_key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## 🔧 Running Different Environments

### 1. Development Environment (Recommended for Testing)
```powershell
# Navigate to docker compose directory
cd C:\Users\Senaa\Desktop\EvaSafe\Devops\DockerComposeFile

# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Access services:
# - Frontend: http://localhost:3000
# - API: http://localhost:5000
# - MongoDB Express: http://localhost:8081
# - Redis Commander: http://localhost:8082
```

### 2. Production Environment
```powershell
# Start production environment
docker-compose up -d

# Access services:
# - Frontend: http://localhost:3000
# - API: http://localhost:5000
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3030
```

### 3. Staging Environment
```powershell
# Start staging environment
docker-compose -f docker-compose.staging.yml up -d

# Access services:
# - Frontend: http://localhost:3000
# - API: http://localhost:5000
# - Prometheus: http://localhost:9091
```

## 🧪 Running Tests
```powershell
# Run integration tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# View test results
docker-compose -f docker-compose.test.yml logs test-runner
```

## 🎯 Running Individual Services

### Backend Services
```powershell
# Build and run main API only
docker-compose up main-api mongo redis

# Run crime detection service
docker-compose up crime-detection mongo redis

# Run alert engine
docker-compose up alert-engine mongo redis
```

### Frontend Services
```powershell
# Build and run frontend only
docker build -f Devops\Frontend-dockerFile\FrontendDockerfile -t evasafe-frontend .\Web_Application\frontend
docker run -p 3000:80 evasafe-frontend

# Run development frontend with hot reload
docker build -f Devops\Frontend-dockerFile\DevDockerfile -t evasafe-frontend-dev .\Web_Application\frontend
docker run -p 3000:3000 -v ${PWD}\Web_Application\frontend:/app evasafe-frontend-dev
```

### Mobile Apps (Flutter)
```powershell
# Build Flutter app
docker build -f Devops\BackendDockerFile\FlutterDockerfile -t evasafe-police-app .\CCTV_Police
docker run -p 8080:80 evasafe-police-app

# Build simulation app
docker build -f Devops\BackendDockerFile\FlutterDockerfile -t evasafe-simulation .\CCTV_Simulation
docker run -p 8081:80 evasafe-simulation
```

## 📊 Monitoring and Debugging

### View Container Status
```powershell
# List running containers
docker ps

# View container logs
docker logs <container-name>

# Execute commands in container
docker exec -it <container-name> /bin/sh
```

### Health Checks
```powershell
# Check service health
curl http://localhost:5000/api/health
curl http://localhost:3000/health

# Check container health
docker inspect <container-name> | findstr Health
```

### Performance Monitoring
```powershell
# View resource usage
docker stats

# Prometheus metrics
# Visit: http://localhost:9090

# Grafana dashboards
# Visit: http://localhost:3030 (admin/password from .env)
```

## 🛠️ Development Workflow

### Making Code Changes
```powershell
# For development environment (auto-reload)
# 1. Make changes to your code
# 2. Development containers will automatically reload

# For production testing
# 1. Rebuild specific service
docker-compose build main-api
docker-compose up -d main-api

# 2. Or rebuild all
docker-compose build
docker-compose up -d
```

### Database Management
```powershell
# Access MongoDB shell
docker exec -it evasafe-mongo-dev mongosh

# View MongoDB data via web interface
# Visit: http://localhost:8081 (username: admin, password: password)

# Access Redis CLI
docker exec -it evasafe-redis-dev redis-cli

# View Redis data via web interface
# Visit: http://localhost:8082
```

## 🔧 Troubleshooting

### Common Issues

#### Port Conflicts
```powershell
# Check what's using a port
netstat -ano | findstr :5000

# Stop conflicting services or change ports in docker-compose files
```

#### Container Build Failures
```powershell
# Clean build cache
docker system prune -a

# Rebuild from scratch
docker-compose build --no-cache <service-name>
```

#### Database Connection Issues
```powershell
# Ensure MongoDB is running
docker-compose logs mongo

# Check network connectivity
docker network ls
docker network inspect <network-name>
```

#### Memory Issues
```powershell
# Check Docker resources
docker system df

# Clean unused resources
docker system prune

# Increase Docker Desktop memory allocation in settings
```

### Logs and Debugging
```powershell
# View all logs
docker-compose logs

# Follow specific service logs
docker-compose logs -f crime-detection

# View container resource usage
docker stats

# Inspect container configuration
docker inspect <container-name>
```

## 🚢 Deployment to Production

### Building for Production
```powershell
# Build all production images
docker-compose build

# Tag images for registry
docker tag evasafe_main-api:latest your-registry/evasafe-main-api:latest

# Push to registry
docker push your-registry/evasafe-main-api:latest
```

### Environment-Specific Deployment
```powershell
# Deploy to staging
docker-compose -f docker-compose.staging.yml up -d

# Deploy to production with specific version
docker-compose -f docker-compose.yml up -d
```

## 🔐 Security Considerations

### Production Checklist
- [ ] Change default passwords in .env
- [ ] Enable SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Enable container logging
- [ ] Set up backup procedures
- [ ] Configure monitoring alerts

### SSL/HTTPS Setup
```powershell
# Generate SSL certificates (for testing)
mkdir Devops\DockerComposeFile\nginx\ssl
# Add your SSL certificates to this directory
# Update nginx.conf to enable HTTPS
```

## 📱 Mobile App Development

### Flutter Development
```powershell
# For local Flutter development (without Docker)
cd CCTV_Police
flutter pub get
flutter run

# For web deployment via Docker
docker build -f ..\Devops\BackendDockerFile\FlutterDockerfile -t police-app-web .
docker run -p 8080:80 police-app-web
```

## 🎮 Quick Commands Cheat Sheet

```powershell
# Start everything (development)
docker-compose -f docker-compose.dev.yml up -d

# Start everything (production)
docker-compose up -d

# Stop everything
docker-compose down

# Rebuild and restart
docker-compose build && docker-compose up -d

# View logs
docker-compose logs -f

# Clean everything
docker-compose down -v
docker system prune -a

# Scale services
docker-compose up -d --scale main-api=3

# Update single service
docker-compose build main-api && docker-compose up -d main-api
```

## 📞 Support

If you encounter issues:
1. Check logs: `docker-compose logs <service-name>`
2. Verify .env configuration
3. Ensure all required ports are available
4. Check Docker Desktop resources
5. Review this guide for troubleshooting steps