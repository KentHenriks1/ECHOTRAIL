-- EchoTrail Comprehensive AI Schema Deployment
-- Drop existing tables and deploy new AI-enhanced schema

-- Drop existing tables (in correct order to handle foreign keys)
DROP TABLE IF EXISTS share_links CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS track_points CASCADE;
DROP TABLE IF EXISTS trails CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Custom types for better type safety
CREATE TYPE user_role AS ENUM ('user', 'admin', 'guide', 'ai_agent');
CREATE TYPE difficulty_level AS ENUM ('easy', 'moderate', 'hard', 'expert');
CREATE TYPE point_type AS ENUM ('viewpoint', 'rest_area', 'water', 'shelter', 'danger', 'landmark', 'photo_spot', 'story_trigger');
CREATE TYPE content_type AS ENUM ('story', 'historical_fact', 'legend', 'safety_tip', 'natural_info', 'adventure', 'folklore');
CREATE TYPE session_status AS ENUM ('active', 'completed', 'paused', 'abandoned');
CREATE TYPE visibility_type AS ENUM ('private', 'friends', 'public');
CREATE TYPE interaction_type AS ENUM ('played', 'skipped', 'liked', 'disliked', 'shared', 'saved');

-- Users table with AI preferences
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    ai_preferences JSONB DEFAULT '{
        "story_types": ["legend", "historical_fact", "adventure"],
        "language": "no",
        "voice_model": "nova",
        "story_length": "medium",
        "interests": [],
        "experience_level": "beginner"
    }',
    interest_vector vector(1536), -- For AI personalization
    preferences JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{
        "trails_completed": 0,
        "total_distance_km": 0,
        "stories_listened": 0,
        "memories_created": 0
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Trails table with AI context
CREATE TABLE trails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    difficulty difficulty_level NOT NULL,
    distance_km DECIMAL(8,2) NOT NULL,
    elevation_gain_m INTEGER,
    estimated_duration_hours DECIMAL(5,2),
    start_location GEOGRAPHY(POINT, 4326) NOT NULL,
    end_location GEOGRAPHY(POINT, 4326),
    trail_path GEOGRAPHY(LINESTRING, 4326),
    region VARCHAR(100) NOT NULL,
    country VARCHAR(50) DEFAULT 'Norway',
    story_themes JSONB DEFAULT '[]', -- Themes for AI story generation
    cultural_context JSONB DEFAULT '{}', -- Historical/cultural background
    natural_features JSONB DEFAULT '{}', -- Flora, fauna, geology
    ai_story_prompts JSONB DEFAULT '[]', -- Custom prompts for this trail
    season_best JSONB DEFAULT '["summer", "autumn"]',
    images JSONB DEFAULT '[]',
    safety_info JSONB DEFAULT '{}',
    facilities JSONB DEFAULT '{}',
    weather_info JSONB DEFAULT '{}',
    featured BOOLEAN DEFAULT false,
    ai_generated_content_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Trail points with story triggers and AI context
CREATE TABLE trail_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    point_type point_type NOT NULL,
    distance_from_start_km DECIMAL(6,2),
    story_context JSONB DEFAULT '{}', -- Context for AI story generation
    ai_story_prompt TEXT, -- Custom prompt for this specific point
    story_themes JSONB DEFAULT '[]', -- Specific themes for this point
    ai_story TEXT, -- Pre-generated or cached story
    audio_url TEXT, -- TTS audio file URL
    trigger_radius_meters INTEGER DEFAULT 50, -- GPS trigger distance
    images JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI-generated stories with embeddings and context
CREATE TABLE ai_stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
    trail_point_id UUID REFERENCES trail_points(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- For personalized stories
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    content_type content_type DEFAULT 'story',
    language VARCHAR(10) DEFAULT 'no' CHECK (language IN ('no', 'en', 'se', 'da')),
    ai_model VARCHAR(100) NOT NULL, -- e.g., 'gpt-4', 'claude-3'
    generation_prompt TEXT NOT NULL,
    generation_context JSONB DEFAULT '{}',
    content_embeddings vector(1536), -- For semantic search and recommendations
    audio_url TEXT,
    audio_duration_seconds INTEGER,
    voice_model VARCHAR(50) DEFAULT 'nova',
    user_rating DECIMAL(2,1) CHECK (user_rating >= 1.0 AND user_rating <= 5.0),
    play_count INTEGER DEFAULT 0,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    CHECK ((trail_id IS NOT NULL) OR (trail_point_id IS NOT NULL))
);

-- Enhanced memories with AI integration
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trail_id UUID REFERENCES trails(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT, 4326),
    location_name VARCHAR(200),
    media_urls JSONB DEFAULT '[]', -- photos, videos, voice recordings
    weather_conditions JSONB,
    hiking_companions JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    ai_generated_summary TEXT, -- AI-generated summary of the memory
    sentiment_score DECIMAL(3,2), -- -1.0 to 1.0 sentiment analysis
    visibility visibility_type DEFAULT 'private',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User trail sessions with detailed tracking
CREATE TABLE trail_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    status session_status DEFAULT 'active',
    actual_distance_km DECIMAL(8,2),
    actual_duration_hours DECIMAL(6,2),
    path_taken GEOGRAPHY(LINESTRING, 4326),
    visited_points UUID[] DEFAULT '{}',
    stories_played UUID[] DEFAULT '{}',
    weather_data JSONB,
    device_info JSONB,
    performance_metrics JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Story generation cache for performance
CREATE TABLE story_generation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    context_hash VARCHAR(64) NOT NULL, -- SHA256 of generation context
    generation_context JSONB NOT NULL,
    story_id UUID REFERENCES ai_stories(id) ON DELETE CASCADE,
    generated_story TEXT NOT NULL,
    audio_url TEXT,
    cache_hits INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    UNIQUE(context_hash, location)
);

-- User story interactions for AI learning
CREATE TABLE user_story_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID NOT NULL REFERENCES ai_stories(id) ON DELETE CASCADE,
    interaction_type interaction_type NOT NULL,
    rating DECIMAL(2,1) CHECK (rating >= 1.0 AND rating <= 5.0),
    interaction_context JSONB DEFAULT '{}', -- Location, time, weather, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voice recordings and TTS cache
CREATE TABLE voice_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID, -- Could reference ai_stories or other content
    content_type VARCHAR(50) NOT NULL,
    text_content TEXT NOT NULL,
    text_hash VARCHAR(64) NOT NULL, -- For deduplication
    voice_model VARCHAR(50) DEFAULT 'nova',
    language VARCHAR(10) DEFAULT 'no',
    audio_url TEXT NOT NULL,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    quality_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI agent performance metrics
CREATE TABLE ai_agent_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    metric_unit VARCHAR(20) NOT NULL,
    context JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App settings and configuration
CREATE TABLE app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- User favorites
CREATE TABLE user_favorites (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, trail_id)
);

-- Performance indexes
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_active ON users (is_active) WHERE is_active = true;

CREATE INDEX idx_trails_location ON trails USING GIST (start_location);
CREATE INDEX idx_trails_difficulty ON trails (difficulty);
CREATE INDEX idx_trails_region ON trails (region);
CREATE INDEX idx_trails_featured ON trails (featured) WHERE featured = true;
CREATE INDEX idx_trails_active ON trails (is_active) WHERE is_active = true;
CREATE INDEX idx_trails_slug ON trails (slug);

CREATE INDEX idx_trail_points_location ON trail_points USING GIST (location);
CREATE INDEX idx_trail_points_trail ON trail_points (trail_id);
CREATE INDEX idx_trail_points_type ON trail_points (point_type);

CREATE INDEX idx_ai_stories_trail ON ai_stories (trail_id);
CREATE INDEX idx_ai_stories_point ON ai_stories (trail_point_id);
CREATE INDEX idx_ai_stories_user ON ai_stories (user_id);
CREATE INDEX idx_ai_stories_language ON ai_stories (language);
CREATE INDEX idx_ai_stories_embeddings ON ai_stories USING ivfflat (content_embeddings vector_cosine_ops);

CREATE INDEX idx_memories_user ON memories (user_id);
CREATE INDEX idx_memories_trail ON memories (trail_id);
CREATE INDEX idx_memories_location ON memories USING GIST (location);
CREATE INDEX idx_memories_visibility ON memories (visibility);
CREATE INDEX idx_memories_created ON memories (created_at DESC);

CREATE INDEX idx_trail_sessions_user ON trail_sessions (user_id);
CREATE INDEX idx_trail_sessions_trail ON trail_sessions (trail_id);
CREATE INDEX idx_trail_sessions_status ON trail_sessions (status);
CREATE INDEX idx_trail_sessions_started ON trail_sessions (started_at DESC);

CREATE INDEX idx_story_cache_location ON story_generation_cache USING GIST (location);
CREATE INDEX idx_story_cache_hash ON story_generation_cache (context_hash);
CREATE INDEX idx_story_cache_expires ON story_generation_cache (expires_at);

CREATE INDEX idx_interactions_user ON user_story_interactions (user_id);
CREATE INDEX idx_interactions_story ON user_story_interactions (story_id);
CREATE INDEX idx_interactions_type ON user_story_interactions (interaction_type);
CREATE INDEX idx_interactions_created ON user_story_interactions (created_at DESC);

CREATE INDEX idx_voice_recordings_content ON voice_recordings (content_id, content_type);
CREATE INDEX idx_voice_recordings_hash ON voice_recordings (text_hash);
CREATE INDEX idx_voice_recordings_expires ON voice_recordings (expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_ai_metrics_type ON ai_agent_metrics (metric_type);
CREATE INDEX idx_ai_metrics_recorded ON ai_agent_metrics (recorded_at DESC);

-- Full-text search indexes
CREATE INDEX idx_trails_search ON trails USING GIN (to_tsvector('norwegian', name || ' ' || description));
CREATE INDEX idx_memories_search ON memories USING GIN (to_tsvector('norwegian', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_ai_stories_search ON ai_stories USING GIN (to_tsvector('norwegian', title || ' ' || content));

-- Utility functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_user_interests(user_uuid UUID)
RETURNS void AS $$
BEGIN
    -- Update user interest vector based on their interactions
    -- This would be called after user interactions to maintain personalization
    UPDATE users SET updated_at = NOW() WHERE id = user_uuid;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM story_generation_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM voice_recordings WHERE expires_at < NOW();
    
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trails_updated_at 
    BEFORE UPDATE ON trails
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memories_updated_at 
    BEFORE UPDATE ON memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initial app settings
INSERT INTO app_settings (key, value, description, is_public) VALUES
('ai_models', '{"story_generation": "gpt-4o", "tts": "openai-tts-1", "embeddings": "text-embedding-3-large"}', 'AI models configuration', false),
('feature_flags', '{"ai_stories": true, "voice_generation": true, "personalization": true}', 'Feature toggles', false),
('cache_settings', '{"story_cache_ttl_days": 7, "voice_cache_ttl_days": 30, "max_cache_size_mb": 1000}', 'Cache configuration', false),
('app_version', '"1.0.0"', 'Current app version', true);

-- Schema deployment complete
SELECT 'EchoTrail AI Schema deployed successfully!' as status;