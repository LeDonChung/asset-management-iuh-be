@echo off
REM Asset Management Backend Docker Build & Run Script for Windows

echo 🚀 Starting Asset Management Backend Docker Setup...

REM Build and start services
echo 📦 Building and starting services...
docker-compose up --build -d

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 10

REM Check if services are running
echo 🔍 Checking service status...
docker-compose ps

REM Show logs
echo 📋 Recent logs:
docker-compose logs --tail=20

echo ✅ Setup complete!
echo 🌐 Backend API: http://localhost:3000
echo 🐘 PostgreSQL: localhost:5432
echo 🔴 Redis: localhost:6379

echo.
echo 📖 Useful commands:
echo   - View logs: docker-compose logs -f
echo   - Stop services: docker-compose down
echo   - Restart: docker-compose restart
echo   - Shell into app: docker-compose exec app sh

pause
