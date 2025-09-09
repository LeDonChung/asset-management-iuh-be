#!/bin/sh

echo "Waiting for database..."
until nc -z asset-db 5432; do
  echo "Database is unavailable - sleeping"
  sleep 1
done

echo "Database is up - executing migrations"
pnpm run migration:run || echo "Migration failed or no migrations to run"

echo "Starting application..."
exec "$@"
