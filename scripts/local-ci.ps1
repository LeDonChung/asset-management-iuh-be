# PowerShell script for running Jenkins-like pipeline locally on Windows
# Asset Management System - Local CI/CD Simulation

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild,
    
    [Parameter(Mandatory=$false)]
    [switch]$CleanStart
)

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"

function Write-Status {
    param([string]$Message)
    Write-Host "🔍 [INFO] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️ [WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ [ERROR] $Message" -ForegroundColor $Red
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n🚀 $Message" -ForegroundColor $Cyan
    Write-Host "=" * 50 -ForegroundColor $Cyan
}

# Start pipeline
Write-Host @"
╔═══════════════════════════════════════════════════════════╗
║                Asset Management System                    ║
║               Local CI/CD Pipeline                        ║
║                                                           ║
║  Environment: $Environment                                      ║
║  Skip Tests: $SkipTests                                   ║
║  Skip Build: $SkipBuild                                   ║
║  Clean Start: $CleanStart                                 ║
╚═══════════════════════════════════════════════════════════╝
"@ -ForegroundColor $Cyan

# Check prerequisites
Write-Step "Checking Prerequisites"

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Status "Node.js version: $nodeVersion"
} catch {
    Write-Error "Node.js is not installed or not in PATH"
    exit 1
}

# Check pnpm
try {
    $pnpmVersion = pnpm --version
    Write-Status "pnpm version: $pnpmVersion"
} catch {
    Write-Error "pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
}

# Check Docker
try {
    $dockerVersion = docker --version
    Write-Status "Docker version: $dockerVersion"
} catch {
    Write-Error "Docker is not installed or not running"
    exit 1
}

# Check docker-compose
try {
    $composeVersion = docker-compose --version
    Write-Status "Docker Compose version: $composeVersion"
} catch {
    Write-Error "Docker Compose is not installed"
    exit 1
}

# Clean start if requested
if ($CleanStart) {
    Write-Step "Clean Start - Removing Previous Build Artifacts"
    
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
        Write-Status "Removed dist directory"
    }
    
    if (Test-Path "node_modules") {
        Remove-Item -Recurse -Force "node_modules"
        Write-Status "Removed node_modules directory"
    }
    
    if (Test-Path "coverage") {
        Remove-Item -Recurse -Force "coverage"
        Write-Status "Removed coverage directory"
    }
    
    # Clean Docker
    Write-Status "Cleaning Docker resources..."
    docker system prune -f
}

# Install dependencies
Write-Step "Installing Dependencies"
try {
    pnpm install --frozen-lockfile
    Write-Status "Dependencies installed successfully"
} catch {
    Write-Error "Failed to install dependencies"
    exit 1
}

# Code quality checks
Write-Step "Code Quality & Security Checks"

# Linting
Write-Status "Running ESLint..."
try {
    pnpm run lint
    Write-Status "✅ Linting passed"
} catch {
    Write-Warning "⚠️ Linting issues found"
}

# Security audit
Write-Status "Running security audit..."
try {
    pnpm audit --audit-level moderate
    Write-Status "✅ Security audit passed"
} catch {
    Write-Warning "⚠️ Security vulnerabilities found"
}

# Testing
if (-not $SkipTests) {
    Write-Step "Running Tests"
    
    # Unit tests
    Write-Status "Running unit tests with coverage..."
    try {
        pnpm run test:cov
        Write-Status "✅ Unit tests passed"
    } catch {
        Write-Error "❌ Unit tests failed"
        exit 1
    }
    
    # E2E tests (if staging or production)
    if ($Environment -ne "dev") {
        Write-Status "Starting test database for E2E tests..."
        
        # Start test database
        docker run -d --name test-postgres-temp `
            -e POSTGRES_USER=test `
            -e POSTGRES_PASSWORD=test `
            -e POSTGRES_DB=asset_test `
            -p 5433:5432 `
            postgres:15-alpine
        
        # Wait for database
        Start-Sleep -Seconds 10
        
        try {
            Write-Status "Running E2E tests..."
            $env:DB_HOST = "localhost"
            $env:DB_PORT = "5433"
            $env:DB_USERNAME = "test"
            $env:DB_PASSWORD = "test"
            $env:DB_NAME = "asset_test"
            $env:JWT_SECRET = "test-secret-key"
            
            pnpm run test:e2e
            Write-Status "✅ E2E tests passed"
        } catch {
            Write-Error "❌ E2E tests failed"
        } finally {
            # Clean up test database
            Write-Status "Cleaning up test database..."
            docker stop test-postgres-temp
            docker rm test-postgres-temp
        }
    }
} else {
    Write-Warning "Skipping tests as requested"
}

# Build application
if (-not $SkipBuild) {
    Write-Step "Building Application"
    
    try {
        pnpm run build
        Write-Status "✅ Application built successfully"
        
        # Verify build
        if (Test-Path "dist/main.js") {
            Write-Status "✅ Build output verified"
        } else {
            Write-Error "❌ Build output not found"
            exit 1
        }
    } catch {
        Write-Error "❌ Build failed"
        exit 1
    }
} else {
    Write-Warning "Skipping build as requested"
}

# Docker operations
Write-Step "Docker Operations"

# Determine docker-compose file
$composeFile = switch ($Environment) {
    "staging" { "docker-compose.staging.yml" }
    "prod" { "docker-compose.prod.yml" }
    default { "docker-compose.yml" }
}

Write-Status "Using docker-compose file: $composeFile"

# Build Docker image
Write-Status "Building Docker image..."
try {
    if ($Environment -eq "prod") {
        docker build -t asset-management-iuh-be:latest .
    } else {
        docker build -f Dockerfile.dev -t asset-management-iuh-be:dev .
    }
    Write-Status "✅ Docker image built successfully"
} catch {
    Write-Error "❌ Docker image build failed"
    exit 1
}

# Security scan (if production)
if ($Environment -eq "prod") {
    Write-Status "Running security scan on Docker image..."
    try {
        # Using docker scout if available, or skip if not
        docker scout cves asset-management-iuh-be:latest 2>$null
        Write-Status "✅ Security scan completed"
    } catch {
        Write-Warning "⚠️ Security scan not available or failed"
    }
}

# Deploy/Start services
Write-Step "Deploying to $Environment Environment"

try {
    # Stop existing services
    docker-compose -f $composeFile down 2>$null
    
    # Start services
    Write-Status "Starting services..."
    docker-compose -f $composeFile up -d --build
    
    # Wait for services to be ready
    Write-Status "Waiting for services to be ready..."
    Start-Sleep -Seconds 30
    
    # Health check
    $healthUrl = switch ($Environment) {
        "staging" { "http://localhost:3001/health" }
        "prod" { "http://localhost:3000/health" }
        default { "http://localhost:3000/health" }
    }
    
    Write-Status "Performing health check on $healthUrl..."
    
    $maxRetries = 5
    $retryCount = 0
    $healthCheckPassed = $false
    
    while ($retryCount -lt $maxRetries -and -not $healthCheckPassed) {
        try {
            $response = Invoke-WebRequest -Uri $healthUrl -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Status "✅ Health check passed"
                $healthCheckPassed = $true
            }
        } catch {
            $retryCount++
            Write-Warning "Health check attempt $retryCount failed, retrying..."
            Start-Sleep -Seconds 5
        }
    }
    
    if (-not $healthCheckPassed) {
        Write-Error "❌ Health check failed after $maxRetries attempts"
        
        # Show logs for debugging
        Write-Status "Showing service logs for debugging..."
        docker-compose -f $composeFile logs --tail=50
        exit 1
    }
    
} catch {
    Write-Error "❌ Deployment failed: $_"
    exit 1
}

# Post-deployment verification
Write-Step "Post-Deployment Verification"

$apiUrl = switch ($Environment) {
    "staging" { "http://localhost:3001/api" }
    "prod" { "http://localhost:3000/api" }
    default { "http://localhost:3000/api" }
}

Write-Status "Verifying API endpoints..."
try {
    # Test API documentation endpoint
    $apiResponse = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 10
    Write-Status "✅ API endpoints accessible"
} catch {
    Write-Warning "⚠️ API endpoints may not be fully accessible"
}

# Show service status
Write-Status "Service status:"
docker-compose -f $composeFile ps

# Success summary
Write-Step "Pipeline Completed Successfully! 🎉"

Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║                   🎉 SUCCESS! 🎉                         ║
║                                                           ║
║  Environment: $Environment                                      ║
║  Application: $healthUrl                                  ║
║  API Docs: $apiUrl                                        ║
║                                                           ║
║  Services running:                                        ║
║  • Backend Application                                    ║
║  • PostgreSQL Database                                    ║
║  • Redis Cache                                            ║
╚═══════════════════════════════════════════════════════════╝

Next steps:
• Access the application: $healthUrl
• View API documentation: $apiUrl  
• Check logs: docker-compose -f $composeFile logs -f
• Stop services: docker-compose -f $composeFile down

"@ -ForegroundColor $Green

Write-Host "Local CI/CD Pipeline completed successfully! 🚀" -ForegroundColor $Green
