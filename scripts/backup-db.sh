#!/bin/bash

# Database backup script for Asset Management System
# Usage: ./backup-db.sh [backup_name]

set -e

# Configuration
CONTAINER_NAME="asset_management_db_prod"
DB_NAME="asset"
DB_USER="postgres"
BACKUP_DIR="/home/$(whoami)/asset-management/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME=${1:-"backup_${DATE}"}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting database backup..."
echo "📁 Backup directory: $BACKUP_DIR"
echo "📦 Backup name: $BACKUP_NAME"

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ Database container '$CONTAINER_NAME' is not running!"
    exit 1
fi

# Create backup
echo "🔄 Creating backup..."
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_DIR/${BACKUP_NAME}.sql"

# Compress backup
echo "🗜️ Compressing backup..."
gzip "$BACKUP_DIR/${BACKUP_NAME}.sql"

echo "✅ Backup completed successfully!"
echo "📄 Backup file: $BACKUP_DIR/${BACKUP_NAME}.sql.gz"
echo "📊 Backup size: $(du -h "$BACKUP_DIR/${BACKUP_NAME}.sql.gz" | cut -f1)"

# Keep only last 7 backups
echo "🧹 Cleaning old backups (keeping last 7)..."
cd "$BACKUP_DIR"
ls -t backup_*.sql.gz | tail -n +8 | xargs -r rm -f

echo "📋 Current backups:"
ls -lah backup_*.sql.gz 2>/dev/null || echo "No backups found"

echo "🎉 Backup process completed!"
