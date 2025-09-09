#!/bin/sh
set -e

echo "🚀 Starting Asset Management Backend..."

# Function to wait for database
wait_for_db() {
    echo "⏳ Waiting for database..."
    local db_host="${DB_HOST:-asset-db}"
    local db_port="${DB_PORT:-5432}"
    
    echo "📡 Checking database connection to ${db_host}:${db_port}"
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z "$db_host" "$db_port"; then
            echo "✅ Database is up!"
            return 0
        fi
        echo "📡 Database is unavailable - attempt $attempt/$max_attempts"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ Database connection timeout after $max_attempts attempts"
    exit 1
}

# Function to run migrations
run_migrations() {
    echo "🔄 Running database migrations..."
    
    # Try to run migrations with different approaches
    if command -v pnpm >/dev/null 2>&1; then
        pnpm run migration:run || {
            echo "⚠️  PNPM migration failed, trying npm..."
            npm run migration:run || echo "⚠️  Migration failed or no migrations to run"
        }
    elif command -v npm >/dev/null 2>&1; then
        npm run migration:run || echo "⚠️  Migration failed or no migrations to run"
    else
        echo "❌ No package manager found (pnpm/npm)"
        return 1
    fi
    
    echo "✅ Migrations completed!"
}

# Function to run seeding (optional)
run_seeding() {
    if [ "$RUN_SEED" = "true" ]; then
        echo "🌱 Running database seeding..."
        if command -v pnpm >/dev/null 2>&1; then
            pnpm run seed || echo "⚠️  Seeding failed or no seed data"
        else
            npm run seed || echo "⚠️  Seeding failed or no seed data"
        fi
        echo "✅ Seeding completed!"
    fi
}

# Main execution
main() {
    wait_for_db
    run_migrations
    run_seeding
    
    echo "🎯 Starting application..."
    exec "$@"
}

# Run main function
main "$@"
