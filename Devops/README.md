# EvaSafe DevOps Documentation

## Overview

This DevOps setup provides comprehensive CI/CD pipelines, monitoring, and infrastructure management for the EvaSafe AI-powered CCTV security system.

## Project Structure

```
EvaSafe/
├── CCTV_Guard/                 # Real-time monitoring system
├── CCTV_Police/               # Flutter mobile app for police
├── CCTV_Querying_System/      # Video query and search system  
├── CCTV_Simulation/           # Flutter simulation app
├── Contract_Deployment/       # Blockchain contracts
├── Contract_Explorer/         # Blockchain explorer
├── Crime_Detection/           # AI crime detection engine
├── Deploy/                    # Production deployment site
├── Devops/                    # DevOps configuration (this folder)
├── Live_Feed/                 # Live video feed processing
└── Web_Application/           # Main web application
```

## DevOps Components

### 1. CI/CD Pipeline (Jenkins)

**File**: `Jenkinsfile`

The Jenkins pipeline provides:
- **Multi-stage builds** for all components
- **Parallel execution** for efficiency
- **Quality gates** with SonarQube
- **Security scanning** with Trivy and dependency checks
- **Automated testing** for all services
- **Docker image building** and registry management
- **Staging and production deployments**

#### Pipeline Stages:
1. **Checkout** - Git repository checkout
2. **Setup Environment** - Node.js, Python, Flutter setup
3. **Code Quality & Security** - Linting, security scans, SonarQube analysis
4. **Testing** - Backend, frontend, mobile, and integration tests
5. **Build Images** - Docker image creation for all services
6. **Quality Gate** - SonarQube quality gate validation
7. **Deploy to Staging** - Automated staging deployment
8. **Deploy to Production** - Manual approval for production

### 2. Monitoring (Prometheus + Grafana)

**Files**: 
- `PrometheusFile/prometheus.yml` - Main configuration
- `PrometheusFile/alert_rules.yml` - Alert definitions
- `PrometheusFile/recording_rules.yml` - Recording rules

#### Monitored Services:
- **Backend APIs**: Main API, Realtime API, Alert Engine, Crime Detection
- **Frontend**: Web application, deployment site
- **Databases**: MongoDB, Redis
- **Infrastructure**: CPU, memory, disk, network
- **Live Feeds**: Camera feeds, video processing
- **Security**: Unauthorized access, incidents

#### Key Metrics:
- Request rates and response times
- Error rates and success rates
- Resource utilization
- Crime detection performance
- Alert system performance
- Video processing metrics

### 3. Container Orchestration

**Directory**: `DockerComposeFile/`

Docker Compose configurations for:
- **Development**: Local development environment
- **Testing**: Integration testing setup
- **Staging**: Staging environment
- **Production**: Production deployment

### 4. Quality Assurance

**Directory**: `SonarqubeFile/`

SonarQube configuration for:
- Code quality analysis
- Security hotspot detection
- Code coverage reporting
- Technical debt assessment

## Getting Started

### Prerequisites

1. **Jenkins** with required plugins:
   - Pipeline
   - Docker
   - SonarQube Scanner
   - Slack Notification
   - Email Extension

2. **Docker & Docker Compose**

3. **Prometheus & Grafana**

4. **SonarQube**

5. **Node.js** (v18+)

6. **Python** (3.9+)

7. **Flutter** (3.16+)

### Setup Instructions

1. **Configure Jenkins**:
   ```bash
   # Install Jenkins plugins
   # Configure credentials:
   # - sonar-token: SonarQube authentication token
   # - slack-webhook: Slack webhook URL
   # - docker-hub: Docker Hub credentials
   ```

2. **Setup Monitoring**:
   ```bash
   # Start Prometheus and Grafana
   cd Devops/
   docker-compose -f monitoring-compose.yml up -d
   ```

3. **Configure SonarQube**:
   ```bash
   # Start SonarQube
   docker-compose -f SonarqubeFile/docker-compose.yml up -d
   
   # Access: http://localhost:9000
   # Default: admin/admin
   ```

4. **Environment Variables**:
   ```bash
   # Required environment variables
   export DOCKER_HUB_REPO="your-dockerhub-repo"
   export SONAR_TOKEN="your-sonar-token"
   export SLACK_WEBHOOK="your-slack-webhook"
   export STAGING_DB_URL="staging-database-url"
   export PROD_DB_URL="production-database-url"
   ```

## Deployment Strategies

### Development
- **Trigger**: Push to develop branch
- **Process**: Automated build, test, and deploy to dev environment
- **Rollback**: Automatic on failure

### Staging
- **Trigger**: Push to staging branch or develop
- **Process**: Full pipeline with quality gates
- **Validation**: Automated integration tests
- **Approval**: Automatic if tests pass

### Production
- **Trigger**: Push to main branch
- **Process**: Full pipeline with manual approval gate
- **Validation**: Health checks and smoke tests
- **Rollback**: Manual trigger available

## Monitoring and Alerting

### Critical Alerts
- Service downtime (immediate notification)
- High error rates (>10% for 2 minutes)
- Performance degradation (response time >2s)
- Security incidents
- Resource exhaustion

### Warning Alerts
- High CPU/memory usage (>80%)
- Slow crime detection processing
- Alert delivery failures
- Database connection issues

### Notification Channels
- **Slack**: #devops channel for all alerts
- **Email**: devops@evasafe.com for critical issues
- **PagerDuty**: (Configure as needed for 24/7 support)

## Scaling Considerations

### Horizontal Scaling
- **API Services**: Scale based on request rate
- **Crime Detection**: Scale based on queue length
- **Live Feed**: Scale based on camera count
- **Database**: Consider sharding for large datasets

### Performance Optimization
- **Caching**: Redis for frequently accessed data
- **CDN**: Static assets and video thumbnails
- **Load Balancing**: Nginx for API distribution
- **Database Indexing**: Optimize query performance

## Security Measures

### Container Security
- **Image Scanning**: Trivy for vulnerability detection
- **Base Images**: Official, minimal images only
- **Secrets Management**: Kubernetes secrets or HashiCorp Vault
- **Network Policies**: Restrict inter-service communication

### Application Security
- **SAST**: Static analysis with SonarQube
- **DAST**: Dynamic analysis in staging
- **Dependency Scanning**: NPM audit, pip-audit
- **Secret Scanning**: GitLeaks for exposed secrets

### Infrastructure Security
- **Access Control**: Role-based access (RBAC)
- **Network Segmentation**: VPC and security groups
- **Encryption**: TLS/SSL for all communications
- **Audit Logging**: Centralized log aggregation

## Troubleshooting

### Common Issues

1. **Pipeline Failures**:
   ```bash
   # Check Jenkins logs
   # Verify environment variables
   # Check service dependencies
   ```

2. **Monitoring Issues**:
   ```bash
   # Verify Prometheus targets
   # Check service /metrics endpoints
   # Validate alert rule syntax
   ```

3. **Deployment Problems**:
   ```bash
   # Check container logs
   # Verify health endpoints
   # Review resource limits
   ```

### Log Locations
- **Jenkins**: `/var/log/jenkins/`
- **Docker**: `docker logs <container-name>`
- **Prometheus**: `http://localhost:9090/targets`
- **Application**: Service-specific log files

## Maintenance

### Regular Tasks
- **Weekly**: Review monitoring dashboards
- **Monthly**: Update dependencies and base images
- **Quarterly**: Performance and security audits
- **Annually**: Architecture and tooling review

### Backup Procedures
- **Database**: Daily automated backups
- **Configuration**: Git repository backups
- **Monitoring Data**: Prometheus long-term storage
- **Artifacts**: Jenkins build artifacts

## Contributing

### Adding New Services
1. Update `devops-config.yaml`
2. Add monitoring configuration to `prometheus.yml`
3. Create Docker configuration
4. Update Jenkins pipeline stages
5. Add health checks and alerts

### Modifying Alerts
1. Edit `alert_rules.yml`
2. Validate syntax: `promtool check rules`
3. Reload Prometheus configuration
4. Test alert conditions

### Performance Tuning
1. Monitor baseline metrics
2. Identify bottlenecks
3. Implement optimizations
4. Measure improvements
5. Update monitoring thresholds

## Support

For DevOps support:
- **Email**: devops@evasafe.com
- **Slack**: #devops channel
- **Documentation**: This file and inline comments
- **Runbooks**: Service-specific troubleshooting guides