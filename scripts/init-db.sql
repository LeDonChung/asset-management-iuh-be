-- Init script for Asset Management Database
-- This script runs when PostgreSQL container starts for the first time

-- Create additional databases if needed
-- CREATE DATABASE asset_test;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'Asia/Ho_Chi_Minh';

-- Create schema if needed
-- CREATE SCHEMA IF NOT EXISTS asset_management;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE asset TO postgres;
