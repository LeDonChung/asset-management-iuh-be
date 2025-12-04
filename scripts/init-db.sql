-- Initialize Asset Management Database
-- This script runs when the PostgreSQL container starts for the first time

-- Create database if not exists (handled by POSTGRES_DB environment variable)
-- CREATE DATABASE IF NOT EXISTS asset_management;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'Asia/Ho_Chi_Minh';

-- Create indexes for better performance (will be created by TypeORM migrations)
-- This is just a placeholder for future optimizations