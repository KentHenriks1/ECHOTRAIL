-- Verify EchoTrail AI database deployment

-- Check all tables are created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check custom types
SELECT typname as type_name 
FROM pg_type 
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND typtype = 'e'
ORDER BY typname;

-- Check extensions
SELECT extname, extversion FROM pg_extension ORDER BY extname;

-- Verify seeded data counts
SELECT 'Data Summary' as category, 
       (SELECT COUNT(*) FROM users) as users,
       (SELECT COUNT(*) FROM trails) as trails,
       (SELECT COUNT(*) FROM trail_points) as trail_points,
       (SELECT COUNT(*) FROM ai_stories) as ai_stories,
       (SELECT COUNT(*) FROM memories) as memories,
       (SELECT COUNT(*) FROM trail_sessions) as trail_sessions,
       (SELECT COUNT(*) FROM user_favorites) as favorites,
       (SELECT COUNT(*) FROM app_settings) as app_settings;

-- Check Norwegian trails with AI context
SELECT name, slug, difficulty, distance_km, region, featured, ai_generated_content_enabled
FROM trails 
ORDER BY featured DESC, name;

-- Check trail points with AI context
SELECT tp.name, t.name as trail_name, tp.point_type, tp.distance_from_start_km, 
       tp.trigger_radius_meters, COALESCE(tp.ai_story IS NOT NULL, false) as has_story
FROM trail_points tp
JOIN trails t ON tp.trail_id = t.id
ORDER BY t.name, tp.distance_from_start_km;

-- Check AI stories
SELECT title, content_type, language, ai_model, user_rating, play_count
FROM ai_stories 
ORDER BY play_count DESC;

-- Check users with AI preferences
SELECT display_name, role, 
       ai_preferences->>'language' as preferred_language,
       ai_preferences->>'experience_level' as experience_level,
       stats->>'trails_completed' as trails_completed
FROM users
ORDER BY display_name;

-- Check geospatial data is working
SELECT name, 
       ST_X(start_location::geometry) as longitude,
       ST_Y(start_location::geometry) as latitude
FROM trails
ORDER BY name;

-- Verify indexes on key tables
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('trails', 'trail_points', 'ai_stories', 'users')
ORDER BY tablename, indexname;