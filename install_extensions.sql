-- Install required extensions for EchoTrail AI features
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Verify installations
SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'postgis', 'vector', 'pg_trgm');