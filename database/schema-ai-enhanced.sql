-- EchoTrail Database Schema with Neon AI Agent Integration
-- Optimized for real-time story generation and vector embeddings
-- Version: 2.0.0 (AI Enhanced)

-- Enable required extensions for AI functionality
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query performance monitoring

-- Enhanced Users table with AI preferences
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'guide', 'ai_agent')),
    
    -- AI Agent preferences and context
    ai_preferences JSONB DEFAULT '{
        "story_types": ["historical", "nature", "adventure"],
        "language": "no",
        "voice_model": "nova",
        "story_length": "medium",
        "interests": [],
        "experience_level": "intermediate"
    }',
    
    -- User behavior vectors for personalization
    interest_vector vector(512), -- User interest embeddings
    location_preferences GEOGRAPHY(POINT, 4326)[], -- Preferred locations
    
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Enhanced Trails table with AI context
CREATE TABLE trails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'moderate', 'hard', 'expert')),
    distance_km DECIMAL(6,2) NOT NULL,
    elevation_gain_m INTEGER,
    estimated_duration_hours DECIMAL(4,2),
    start_location GEOGRAPHY(POINT, 4326) NOT NULL,
    end_location GEOGRAPHY(POINT, 4326),
    trail_path GEOGRAPHY(LINESTRING, 4326),
    region VARCHAR(100) NOT NULL,
    country VARCHAR(50) DEFAULT 'Norway',
    season_best JSONB DEFAULT '["summer", "autumn"]',
    
    -- AI enhancement fields
    content_embeddings vector(1536), -- Trail description embeddings for similarity
    story_themes JSONB DEFAULT '[]', -- Themes for AI story generation
    cultural_context JSONB DEFAULT '{}', -- Historical/cultural data for stories
    natural_features JSONB DEFAULT '{}', -- Flora, fauna, geology for AI context
    ai_story_prompts JSONB DEFAULT '[]', -- Pre-defined prompts for story generation
    
    tags JSONB DEFAULT '[]',
    images JSONB DEFAULT '[]',
    safety_info JSONB DEFAULT '{}',
    facilities JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    ai_generated_content_enabled BOOLEAN DEFAULT true
);

-- Enhanced Points of Interest with AI story triggers
CREATE TABLE trail_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    point_type VARCHAR(50) NOT NULL CHECK (point_type IN ('viewpoint', 'rest_area', 'water', 'shelter', 'danger', 'landmark', 'photo_spot', 'story_trigger')),
    distance_from_start_km DECIMAL(6,2),
    
    -- AI story generation context
    story_context JSONB DEFAULT '{}', -- Historical facts, legends, natural info
    ai_story_prompt TEXT, -- Custom prompt for this specific point
    story_themes JSONB DEFAULT '[]', -- Themes available for stories here
    content_embeddings vector(1536), -- Embeddings for content matching
    
    -- Cached AI-generated content
    ai_story TEXT, -- Current AI-generated story
    audio_url TEXT, -- TTS audio URL
    audio_cached_at TIMESTAMP WITH TIME ZONE,
    audio_expires_at TIMESTAMP WITH TIME ZONE,
    
    images JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Trigger radius for AI story activation
    trigger_radius_meters INTEGER DEFAULT 50
);

-- AI-generated stories with vector embeddings
CREATE TABLE ai_stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
    trail_point_id UUID REFERENCES trail_points(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- If personalized
    
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'story' CHECK (content_type IN ('story', 'historical_fact', 'legend', 'safety_tip', 'natural_info', 'adventure', 'folklore')),
    language VARCHAR(10) DEFAULT 'no' CHECK (language IN ('no', 'en', 'se', 'da')),
    
    -- AI generation metadata
    ai_model VARCHAR(100) NOT NULL, -- e.g., 'neon-gpt-4o', 'claude-3.5'
    generation_prompt TEXT NOT NULL,
    generation_context JSONB DEFAULT '{}', -- Weather, time of day, user context used
    
    -- Vector embeddings for similarity and matching
    content_embeddings vector(1536) NOT NULL,
    theme_embeddings vector(512), -- Theme/mood embeddings
    location_embeddings vector(256), -- Geographic context embeddings
    
    -- Cached TTS audio
    audio_url TEXT,
    audio_duration_seconds INTEGER,
    audio_file_size_bytes INTEGER,
    voice_model VARCHAR(50) DEFAULT 'nova',
    audio_generated_at TIMESTAMP WITH TIME ZONE,
    audio_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Performance and feedback
    generation_time_ms INTEGER,
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    play_count INTEGER DEFAULT 0,
    
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    model_version VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    
    CHECK ((trail_id IS NOT NULL) OR (trail_point_id IS NOT NULL))
);

-- Real-time story generation requests/cache
CREATE TABLE story_generation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Request context
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
    trail_point_id UUID REFERENCES trail_points(id) ON DELETE CASCADE,
    
    -- Generation context
    context_hash VARCHAR(64) NOT NULL, -- SHA256 hash of generation context
    generation_context JSONB NOT NULL, -- Weather, time, user prefs, etc.
    
    -- Cached result
    story_id UUID REFERENCES ai_stories(id) ON DELETE CASCADE,
    generated_story TEXT,
    audio_url TEXT,
    
    -- Cache management
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    cache_hits INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Performance tracking
    generation_time_ms INTEGER,
    cache_size_bytes INTEGER,
    
    UNIQUE(context_hash, location)
);

-- User story interactions and preferences learning
CREATE TABLE user_story_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID NOT NULL REFERENCES ai_stories(id) ON DELETE CASCADE,
    
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('played', 'skipped', 'liked', 'disliked', 'shared', 'saved')),
    interaction_context JSONB DEFAULT '{}', -- Location, weather, time when interacted
    
    -- Feedback for AI learning
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback_text TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (user_id, story_id, interaction_type, created_at)
);

-- Enhanced voice recordings with intelligent caching
CREATE TABLE voice_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL, -- References ai_stories or other content
    content_type VARCHAR(50) NOT NULL,
    content_hash VARCHAR(64) NOT NULL, -- Hash of text content for deduplication
    
    text_content TEXT NOT NULL,
    voice_model VARCHAR(50) DEFAULT 'nova',
    language VARCHAR(10) DEFAULT 'no',
    
    -- Audio file information
    audio_url TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    audio_quality VARCHAR(20) DEFAULT 'standard', -- standard, high, ultra
    
    -- Intelligent caching
    cache_priority INTEGER DEFAULT 1, -- 1=low, 10=critical
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Storage optimization
    compressed BOOLEAN DEFAULT false,
    compression_ratio DECIMAL(4,2),
    
    UNIQUE(content_hash, voice_model, language)
);

-- AI Agent performance monitoring
CREATE TABLE ai_agent_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    metric_type VARCHAR(100) NOT NULL, -- 'story_generation', 'tts_cache_hit', 'recommendation'
    metric_value DECIMAL(10,4) NOT NULL,
    metric_unit VARCHAR(50), -- 'ms', 'count', 'percentage'
    
    context JSONB DEFAULT '{}',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    trail_id UUID REFERENCES trails(id) ON DELETE SET NULL,
    
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Partitioning key for time-series data
    recorded_date DATE GENERATED ALWAYS AS (recorded_at::DATE) STORED
);

-- Enhanced indexes for AI operations
CREATE INDEX idx_users_interest_vector ON users USING ivfflat (interest_vector vector_cosine_ops);
CREATE INDEX idx_trails_content_embeddings ON trails USING ivfflat (content_embeddings vector_cosine_ops);
CREATE INDEX idx_trail_points_embeddings ON trail_points USING ivfflat (content_embeddings vector_cosine_ops);
CREATE INDEX idx_trail_points_trigger_location ON trail_points USING GIST (location, trigger_radius_meters);

CREATE INDEX idx_ai_stories_embeddings ON ai_stories USING ivfflat (content_embeddings vector_cosine_ops);
CREATE INDEX idx_ai_stories_theme_embeddings ON ai_stories USING ivfflat (theme_embeddings vector_cosine_ops);
CREATE INDEX idx_ai_stories_location_embeddings ON ai_stories USING ivfflat (location_embeddings vector_cosine_ops);
CREATE INDEX idx_ai_stories_active ON ai_stories (is_active, generated_at DESC) WHERE is_active = true;

CREATE INDEX idx_story_cache_location ON story_generation_cache USING GIST (location);
CREATE INDEX idx_story_cache_expires ON story_generation_cache (expires_at) WHERE expires_at > NOW();
CREATE INDEX idx_story_cache_hash ON story_generation_cache (context_hash);

CREATE INDEX idx_user_interactions_user_time ON user_story_interactions (user_id, created_at DESC);
CREATE INDEX idx_user_interactions_story ON user_story_interactions (story_id, interaction_type);

CREATE INDEX idx_voice_recordings_hash ON voice_recordings (content_hash, voice_model);
CREATE INDEX idx_voice_recordings_expires ON voice_recordings (expires_at) WHERE expires_at > NOW();
CREATE INDEX idx_voice_recordings_priority ON voice_recordings (cache_priority DESC, access_count DESC);

-- Partitioned table for AI metrics (time-series data)
CREATE INDEX idx_ai_metrics_type_date ON ai_agent_metrics (metric_type, recorded_date DESC);
CREATE INDEX idx_ai_metrics_recorded ON ai_agent_metrics (recorded_at DESC);

-- Functions for AI operations
CREATE OR REPLACE FUNCTION find_nearby_stories(
    user_location GEOGRAPHY,
    search_radius_meters INTEGER DEFAULT 1000,
    user_preferences JSONB DEFAULT '{}',
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE(
    story_id UUID,
    distance_meters FLOAT,
    relevance_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        ST_Distance(tp.location, user_location)::FLOAT,
        (
            1.0 - (content_embeddings <=> (user_preferences->>'interest_vector')::vector) +
            EXP(-ST_Distance(tp.location, user_location) / 500.0)
        ) / 2.0
    FROM ai_stories s
    JOIN trail_points tp ON s.trail_point_id = tp.id
    WHERE ST_DWithin(tp.location, user_location, search_radius_meters)
      AND s.is_active = true
    ORDER BY relevance_score DESC, ST_Distance(tp.location, user_location)
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to update user interest vector based on interactions
CREATE OR REPLACE FUNCTION update_user_interests(user_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE users SET 
        interest_vector = (
            SELECT AVG(s.content_embeddings)::vector
            FROM user_story_interactions usi
            JOIN ai_stories s ON usi.story_id = s.id
            WHERE usi.user_id = user_uuid 
              AND usi.interaction_type IN ('played', 'liked', 'saved')
              AND usi.created_at > NOW() - INTERVAL '30 days'
        ),
        updated_at = NOW()
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Cache cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Clean up expired story cache
    DELETE FROM story_generation_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up low-priority voice recordings
    DELETE FROM voice_recordings 
    WHERE expires_at < NOW() 
       OR (access_count = 0 AND created_at < NOW() - INTERVAL '7 days');
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating user interests after story interactions
CREATE OR REPLACE FUNCTION trigger_update_user_interests()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user interest vector asynchronously (in production, this would be a background job)
    PERFORM update_user_interests(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_interests_after_interaction
    AFTER INSERT ON user_story_interactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_user_interests();