-- EchoTrail Database Schema v1.0.0
-- Production-ready PostgreSQL database schema with comprehensive tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Users table with authentication and preferences
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    preferences JSONB DEFAULT '{}',
    role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'PREMIUM', 'ADMIN')),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_expires_at TIMESTAMP,
    profile_image_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    privacy_settings JSONB DEFAULT '{"shareLocation": false, "publicProfile": false}',
    subscription_status VARCHAR(20) DEFAULT 'FREE' CHECK (subscription_status IN ('FREE', 'PREMIUM', 'ENTERPRISE')),
    subscription_expires_at TIMESTAMP,
    total_distance DECIMAL(10, 2) DEFAULT 0,
    total_trails INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    last_activity_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_status);

-- Trails table with comprehensive metadata
CREATE TABLE IF NOT EXISTS trails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    distance DECIMAL(10, 2) DEFAULT 0,
    duration INTEGER DEFAULT 0, -- seconds
    elevation JSONB DEFAULT '{"gain": 0, "loss": 0, "max": 0, "min": 0}',
    tags TEXT[] DEFAULT '{}',
    sync_status VARCHAR(20) DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
    local_only BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    start_location POINT,
    end_location POINT,
    bounding_box JSONB, -- {"north": lat, "south": lat, "east": lng, "west": lng}
    weather_data JSONB,
    difficulty_level VARCHAR(20) DEFAULT 'UNKNOWN' CHECK (difficulty_level IN ('EASY', 'MODERATE', 'HARD', 'EXPERT', 'UNKNOWN')),
    trail_type VARCHAR(50) DEFAULT 'HIKING' CHECK (trail_type IN ('HIKING', 'RUNNING', 'CYCLING', 'WALKING', 'MOUNTAIN_BIKING', 'OTHER')),
    surface_type VARCHAR(50) DEFAULT 'MIXED',
    equipment_needed TEXT[],
    safety_warnings TEXT[],
    photo_count INTEGER DEFAULT 0,
    audio_guide_available BOOLEAN DEFAULT FALSE,
    offline_map_available BOOLEAN DEFAULT FALSE,
    gpx_file_path TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Indexes for trails table
CREATE INDEX IF NOT EXISTS idx_trails_user_id ON trails(user_id);
CREATE INDEX IF NOT EXISTS idx_trails_public ON trails(is_public);
CREATE INDEX IF NOT EXISTS idx_trails_created_at ON trails(created_at);
CREATE INDEX IF NOT EXISTS idx_trails_sync_status ON trails(sync_status);
CREATE INDEX IF NOT EXISTS idx_trails_trail_type ON trails(trail_type);
CREATE INDEX IF NOT EXISTS idx_trails_difficulty ON trails(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_trails_tags ON trails USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_trails_start_location ON trails USING GIST(start_location);
CREATE INDEX IF NOT EXISTS idx_trails_deleted_at ON trails(deleted_at) WHERE deleted_at IS NULL;

-- Track points table for GPS coordinates
CREATE TABLE IF NOT EXISTS track_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    elevation DECIMAL(8, 2),
    timestamp TIMESTAMP NOT NULL,
    accuracy DECIMAL(6, 2),
    speed DECIMAL(6, 2),
    heading DECIMAL(6, 2),
    heart_rate INTEGER,
    cadence INTEGER,
    power INTEGER,
    temperature DECIMAL(4, 1),
    additional_data JSONB DEFAULT '{}',
    point_type VARCHAR(20) DEFAULT 'TRACK' CHECK (point_type IN ('TRACK', 'WAYPOINT', 'POI', 'PHOTO', 'PAUSE', 'RESUME')),
    sequence_number INTEGER,
    distance_from_start DECIMAL(10, 2) DEFAULT 0
);

-- Indexes for track_points table
CREATE INDEX IF NOT EXISTS idx_track_points_trail_id ON track_points(trail_id);
CREATE INDEX IF NOT EXISTS idx_track_points_timestamp ON track_points(timestamp);
CREATE INDEX IF NOT EXISTS idx_track_points_location ON track_points(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_track_points_sequence ON track_points(trail_id, sequence_number);

-- Media files for trails
CREATE TABLE IF NOT EXISTS media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('PHOTO', 'VIDEO', 'AUDIO')),
    file_path TEXT NOT NULL,
    file_url TEXT,
    thumbnail_url TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- for video/audio
    location POINT,
    timestamp TIMESTAMP,
    caption TEXT,
    metadata JSONB DEFAULT '{}',
    is_cover BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for media_files table
CREATE INDEX IF NOT EXISTS idx_media_files_trail_id ON media_files(trail_id);
CREATE INDEX IF NOT EXISTS idx_media_files_user_id ON media_files(user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_type ON media_files(file_type);
CREATE INDEX IF NOT EXISTS idx_media_files_location ON media_files USING GIST(location);

-- Share links for public trail sharing
CREATE TABLE IF NOT EXISTS share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    share_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    access_count INTEGER DEFAULT 0,
    max_access_count INTEGER,
    password_hash VARCHAR(255),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    last_accessed_at TIMESTAMP
);

-- Indexes for share_links table
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_trail_id ON share_links(trail_id);
CREATE INDEX IF NOT EXISTS idx_share_links_active ON share_links(is_active);
CREATE INDEX IF NOT EXISTS idx_share_links_expires ON share_links(expires_at);

-- User sessions for authentication
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for user_sessions table
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

-- Points of interest
CREATE TABLE IF NOT EXISTS points_of_interest (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    location POINT NOT NULL,
    elevation DECIMAL(8, 2),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    photo_urls TEXT[],
    rating DECIMAL(3, 2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for points_of_interest table
CREATE INDEX IF NOT EXISTS idx_poi_location ON points_of_interest USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_poi_category ON points_of_interest(category);
CREATE INDEX IF NOT EXISTS idx_poi_user_id ON points_of_interest(user_id);
CREATE INDEX IF NOT EXISTS idx_poi_verified ON points_of_interest(is_verified);

-- Trail ratings and reviews
CREATE TABLE IF NOT EXISTS trail_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
    scenery_rating INTEGER CHECK (scenery_rating BETWEEN 1 AND 5),
    trail_condition VARCHAR(20) CHECK (trail_condition IN ('EXCELLENT', 'GOOD', 'FAIR', 'POOR')),
    weather_conditions VARCHAR(100),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(trail_id, user_id)
);

-- Indexes for trail_reviews table
CREATE INDEX IF NOT EXISTS idx_trail_reviews_trail_id ON trail_reviews(trail_id);
CREATE INDEX IF NOT EXISTS idx_trail_reviews_user_id ON trail_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_trail_reviews_rating ON trail_reviews(rating);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- App settings and configuration
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    category VARCHAR(50) DEFAULT 'GENERAL',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, setting_key)
);

-- Indexes for app_settings table
CREATE INDEX IF NOT EXISTS idx_app_settings_user_id ON app_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category);

-- Offline maps metadata
CREATE TABLE IF NOT EXISTS offline_maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    bounds JSONB NOT NULL, -- {"north": lat, "south": lat, "east": lng, "west": lng}
    zoom_levels INTEGER[] NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    checksum VARCHAR(255),
    version INTEGER DEFAULT 1,
    download_url TEXT,
    is_downloaded BOOLEAN DEFAULT FALSE,
    download_progress INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for offline_maps table
CREATE INDEX IF NOT EXISTS idx_offline_maps_downloaded ON offline_maps(is_downloaded);
CREATE INDEX IF NOT EXISTS idx_offline_maps_bounds ON offline_maps USING GIN(bounds);

-- Sync status tracking
CREATE TABLE IF NOT EXISTS sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    last_sync_at TIMESTAMP NOT NULL,
    sync_version INTEGER DEFAULT 1,
    conflict_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, entity_type, entity_id)
);

-- Indexes for sync_status table
CREATE INDEX IF NOT EXISTS idx_sync_status_user ON sync_status(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_status_entity ON sync_status(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_status_last_sync ON sync_status(last_sync_at);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trails_updated_at BEFORE UPDATE ON trails FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_files_updated_at BEFORE UPDATE ON media_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_points_of_interest_updated_at BEFORE UPDATE ON points_of_interest FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trail_reviews_updated_at BEFORE UPDATE ON trail_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offline_maps_updated_at BEFORE UPDATE ON offline_maps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sync_status_updated_at BEFORE UPDATE ON sync_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
CREATE OR REPLACE VIEW public_trails AS
SELECT 
    t.*,
    u.name as user_name,
    COUNT(tp.id) as point_count,
    COUNT(mf.id) as photo_count,
    AVG(tr.rating) as average_rating,
    COUNT(tr.id) as review_count
FROM trails t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN track_points tp ON t.id = tp.trail_id
LEFT JOIN media_files mf ON t.id = mf.trail_id AND mf.file_type = 'PHOTO'
LEFT JOIN trail_reviews tr ON t.id = tr.trail_id
WHERE t.is_public = TRUE AND t.deleted_at IS NULL
GROUP BY t.id, u.name;

-- Create user stats view
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(DISTINCT t.id) as total_trails,
    COALESCE(SUM(t.distance), 0) as total_distance,
    COALESCE(SUM(t.duration), 0) as total_duration,
    COUNT(DISTINCT CASE WHEN t.is_public THEN t.id END) as public_trails,
    COUNT(DISTINCT mf.id) as total_photos,
    AVG(tr.rating) as average_trail_rating,
    u.created_at,
    u.last_activity_at
FROM users u
LEFT JOIN trails t ON u.id = t.user_id AND t.deleted_at IS NULL
LEFT JOIN media_files mf ON t.id = mf.trail_id AND mf.file_type = 'PHOTO'
LEFT JOIN trail_reviews tr ON t.id = tr.trail_id
WHERE u.is_active = TRUE
GROUP BY u.id, u.name, u.email, u.created_at, u.last_activity_at;

-- Insert default system settings
INSERT INTO app_settings (setting_key, setting_value, category, is_system, user_id) VALUES
    ('max_track_points_per_trail', '10000', 'SYSTEM', TRUE, NULL),
    ('max_file_size_mb', '50', 'SYSTEM', TRUE, NULL),
    ('supported_file_types', '["jpg", "jpeg", "png", "mp4", "mov", "mp3", "wav"]', 'SYSTEM', TRUE, NULL),
    ('default_map_style', '"satellite"', 'SYSTEM', TRUE, NULL),
    ('enable_offline_maps', 'true', 'SYSTEM', TRUE, NULL),
    ('max_offline_map_size_mb', '500', 'SYSTEM', TRUE, NULL)
ON CONFLICT (user_id, setting_key) DO NOTHING;

-- Performance optimization: Analyze tables
ANALYZE users;
ANALYZE trails;
ANALYZE track_points;
ANALYZE media_files;
ANALYZE share_links;
ANALYZE user_sessions;
ANALYZE points_of_interest;
ANALYZE trail_reviews;
ANALYZE notifications;
ANALYZE app_settings;
ANALYZE offline_maps;
ANALYZE sync_status;

COMMENT ON DATABASE echotrail IS 'EchoTrail GPS tracking and trail sharing application database';