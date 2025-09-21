-- Check available extensions
SELECT name, default_version, installed_version 
FROM pg_available_extensions 
WHERE name IN ('postgis', 'vector', 'uuid-ossp', 'pg_trgm')
ORDER BY name;

-- Check current extensions
SELECT extname, extversion FROM pg_extension;