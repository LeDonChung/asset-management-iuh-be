#!/bin/bash

# Asset Management Backend Docker Build & Run Script

echo "🚀 Starting Asset Management Backend Docker Setup..."

# Build and start services
echo "📦 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

# Show logs
echo "📋 Recent logs:"
docker-compose logs --tail=20

echo "✅ Setup complete!"
echo "🌐 Backend API: http://localhost:3000"
echo "🐘 PostgreSQL: localhost:5432"
echo "🔴 Redis: localhost:6379"

echo ""
echo "📖 Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart: docker-compose restart"
echo "  - Shell into app: docker-compose exec app sh"
