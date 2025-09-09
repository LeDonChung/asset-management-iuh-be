#!/bin/bash

# Database restore script for Asset Management System
# Usage: ./restore-db.sh backup_file.sql.gz

set -e

# Configuration
CONTAINER_NAME="asset_management_db_prod"
DB_NAME="asset"
DB_USER="postgres"

if [ -z "$1" ]; then
    echo "❌ Usage: $0 <backup_file.sql.gz>"
    echo "📋 Available backups:"
    ls -la backups/backup_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file '$BACKUP_FILE' not found!"
    exit 1
fi

echo "🔄 Starting database restore..."
echo "📄 Backup file: $BACKUP_FILE"

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ Database container '$CONTAINER_NAME' is not running!"
    exit 1
fi

# Confirm restore
read -p "⚠️  This will replace the current database. Are you sure? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled."
    exit 1
fi

# Extract and restore
echo "🔄 Extracting and restoring backup..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"
else
    cat "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"
fi

echo "✅ Database restore completed successfully!"
echo "🔄 Restarting application container..."
docker-compose restart asset-app

echo "🎉 Restore process completed!"
