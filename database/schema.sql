-- EchoTrail Database Schema
-- Optimized for Neon Postgres with extensions
-- Version: 1.0.0

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'guide')),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Trails table (main hiking trails)
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
    tags JSONB DEFAULT '[]',
    images JSONB DEFAULT '[]',
    safety_info JSONB DEFAULT '{}',
    facilities JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false
);

-- Points of Interest along trails
CREATE TABLE trail_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    point_type VARCHAR(50) NOT NULL CHECK (point_type IN ('viewpoint', 'rest_area', 'water', 'shelter', 'danger', 'landmark', 'photo_spot')),
    distance_from_start_km DECIMAL(6,2),
    ai_story TEXT, -- AI-generated story for this point
    audio_url TEXT, -- URL to TTS audio file
    images JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User memories/experiences
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trail_id UUID REFERENCES trails(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT, 4326),
    location_name VARCHAR(200),
    media_urls JSONB DEFAULT '[]', -- photos, videos, audio recordings
    weather_conditions JSONB,
    hiking_companions JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'friends', 'public')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI-generated content and stories
CREATE TABLE ai_stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
    trail_point_id UUID REFERENCES trail_points(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'story' CHECK (content_type IN ('story', 'historical_fact', 'legend', 'safety_tip', 'natural_info')),
    language VARCHAR(10) DEFAULT 'no' CHECK (language IN ('no', 'en')),
    audio_url TEXT, -- TTS-generated audio
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    model_version VARCHAR(50),
    prompt_used TEXT,
    metadata JSONB DEFAULT '{}',
    CHECK ((trail_id IS NOT NULL) OR (trail_point_id IS NOT NULL))
);

-- User trail activities/sessions
CREATE TABLE trail_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
    actual_distance_km DECIMAL(6,2),
    actual_duration_hours DECIMAL(6,2),
    path_taken GEOGRAPHY(LINESTRING, 4326),
    visited_points UUID[] DEFAULT '{}',
    weather_data JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voice recordings and TTS cache
CREATE TABLE voice_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID, -- Could reference ai_stories or other content
    content_type VARCHAR(50) NOT NULL,
    text_content TEXT NOT NULL,
    voice_model VARCHAR(50) DEFAULT 'nova',
    language VARCHAR(10) DEFAULT 'no',
    audio_url TEXT NOT NULL,
    duration_seconds INTEGER,
    file_size_bytes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- App settings and configuration
CREATE TABLE app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
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

-- Indexes for performance
CREATE INDEX idx_trails_location ON trails USING GIST (start_location);
CREATE INDEX idx_trails_difficulty ON trails (difficulty);
CREATE INDEX idx_trails_region ON trails (region);
CREATE INDEX idx_trails_featured ON trails (featured) WHERE featured = true;
CREATE INDEX idx_trails_active ON trails (is_active) WHERE is_active = true;

CREATE INDEX idx_trail_points_location ON trail_points USING GIST (location);
CREATE INDEX idx_trail_points_trail ON trail_points (trail_id);
CREATE INDEX idx_trail_points_type ON trail_points (point_type);

CREATE INDEX idx_memories_user ON memories (user_id);
CREATE INDEX idx_memories_trail ON memories (trail_id);
CREATE INDEX idx_memories_location ON memories USING GIST (location);
CREATE INDEX idx_memories_visibility ON memories (visibility);
CREATE INDEX idx_memories_created ON memories (created_at DESC);

CREATE INDEX idx_ai_stories_trail ON ai_stories (trail_id);
CREATE INDEX idx_ai_stories_point ON ai_stories (trail_point_id);
CREATE INDEX idx_ai_stories_language ON ai_stories (language);

CREATE INDEX idx_trail_sessions_user ON trail_sessions (user_id);
CREATE INDEX idx_trail_sessions_trail ON trail_sessions (trail_id);
CREATE INDEX idx_trail_sessions_status ON trail_sessions (status);
CREATE INDEX idx_trail_sessions_started ON trail_sessions (started_at DESC);

CREATE INDEX idx_voice_recordings_content ON voice_recordings (content_id, content_type);
CREATE INDEX idx_voice_recordings_expires ON voice_recordings (expires_at) WHERE expires_at IS NOT NULL;

-- Full-text search indexes
CREATE INDEX idx_trails_search ON trails USING GIN (to_tsvector('norwegian', name || ' ' || description));
CREATE INDEX idx_memories_search ON memories USING GIN (to_tsvector('norwegian', title || ' ' || COALESCE(description, '')));

-- Updated timestamps triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trails_updated_at BEFORE UPDATE ON trails
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();