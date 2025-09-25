/**
 * EchoTrail Neon Database Client
 * Production-ready TypeScript client with AI Agent integration
 */

// Mock imports for TypeScript compilation without @neondatabase/serverless
// TODO: Install @neondatabase/serverless package for production

// Mock types for compilation
interface PoolClient {
  query(text: string, params?: any[]): Promise<{ rows: any[] }>;
  release(): void;
}

interface Pool {
  query(text: string, params?: any[]): Promise<{ rows: any[] }>;
  connect(): Promise<PoolClient>;
}

// Mock implementations
const neonConfig = {
  fetchConnectionCache: true,
  useSecureWebSocket: true,
  pipelineConnect: false,
};

const MockPool = class implements Pool {
  constructor(config: any) {}
  async query(text: string, params?: any[]): Promise<{ rows: any[] }> {
    throw new Error(
      "Database not configured - install @neondatabase/serverless"
    );
  }
  async connect(): Promise<PoolClient> {
    throw new Error(
      "Database not configured - install @neondatabase/serverless"
    );
  }
};

import Constants from "expo-constants";

// Configure Neon for optimal performance
neonConfig.fetchConnectionCache = true;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false; // Disable for React Native

const DATABASE_URL =
  Constants.expoConfig?.extra?.neonDatabaseUrl || process.env.NEON_DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("NEON_DATABASE_URL environment variable is not set");
}

// Create connection pool (Mock for now)
export const db = new MockPool({
  connectionString: DATABASE_URL,
  max: 10, // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Types for database entities
export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  role: "user" | "admin" | "guide" | "ai_agent";
  ai_preferences: {
    story_types: string[];
    language: string;
    voice_model: string;
    story_length: string;
    interests: string[];
    experience_level: string;
  };
  interest_vector?: number[];
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface Trail {
  id: string;
  name: string;
  slug: string;
  description: string;
  difficulty: "easy" | "moderate" | "hard" | "expert";
  distance_km: number;
  elevation_gain_m?: number;
  estimated_duration_hours?: number;
  start_location: [number, number]; // [longitude, latitude]
  end_location?: [number, number];
  region: string;
  country: string;
  story_themes: string[];
  cultural_context: Record<string, any>;
  natural_features: Record<string, any>;
  ai_story_prompts: string[];
  images: string[];
  safety_info: Record<string, any>;
  facilities: Record<string, any>;
  featured: boolean;
  ai_generated_content_enabled: boolean;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface TrailPoint {
  id: string;
  trail_id: string;
  name: string;
  description?: string;
  location: [number, number]; // [longitude, latitude]
  point_type:
    | "viewpoint"
    | "rest_area"
    | "water"
    | "shelter"
    | "danger"
    | "landmark"
    | "photo_spot"
    | "story_trigger";
  distance_from_start_km?: number;
  story_context: Record<string, any>;
  ai_story_prompt?: string;
  story_themes: string[];
  ai_story?: string;
  audio_url?: string;
  trigger_radius_meters: number;
  created_at: Date;
}

export interface AIStory {
  id: string;
  trail_id?: string;
  trail_point_id?: string;
  user_id?: string;
  title: string;
  content: string;
  content_type:
    | "story"
    | "historical_fact"
    | "legend"
    | "safety_tip"
    | "natural_info"
    | "adventure"
    | "folklore";
  language: "no" | "en" | "se" | "da";
  ai_model: string;
  generation_prompt: string;
  generation_context: Record<string, any>;
  content_embeddings: number[];
  audio_url?: string;
  audio_duration_seconds?: number;
  voice_model: string;
  user_rating?: number;
  play_count: number;
  generated_at: Date;
  is_active: boolean;
}

export interface Memory {
  id: string;
  user_id: string;
  trail_id?: string;
  title: string;
  description?: string;
  location?: [number, number];
  location_name?: string;
  media_urls: string[];
  weather_conditions?: Record<string, any>;
  hiking_companions: string[];
  tags: string[];
  visibility: "private" | "friends" | "public";
  created_at: Date;
  updated_at: Date;
}

// Database service class
export class DatabaseService {
  private pool: Pool;

  constructor() {
    this.pool = db;
  }

  // User operations
  async getUserById(id: string): Promise<User | null> {
    try {
      const result = await this.pool.query(
        "SELECT * FROM users WHERE id = $1 AND is_active = true",
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error fetching user:", error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.pool.query(
        "SELECT * FROM users WHERE email = $1 AND is_active = true",
        [email]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error fetching user by email:", error);
      throw error;
    }
  }

  async updateUserInterests(userId: string): Promise<void> {
    try {
      await this.pool.query("SELECT update_user_interests($1)", [userId]);
    } catch (error) {
      console.error("Error updating user interests:", error);
      throw error;
    }
  }

  // Trail operations
  async getFeaturedTrails(limit: number = 10): Promise<Trail[]> {
    try {
      const result = await this.pool.query(
        `
        SELECT *, 
               ST_X(start_location::geometry) as start_lon,
               ST_Y(start_location::geometry) as start_lat,
               ST_X(end_location::geometry) as end_lon,
               ST_Y(end_location::geometry) as end_lat
        FROM trails 
        WHERE featured = true AND is_active = true 
        ORDER BY created_at DESC 
        LIMIT $1
      `,
        [limit]
      );

      return result.rows.map((row) => ({
        ...row,
        start_location: [row.start_lon, row.start_lat],
        end_location: row.end_lon ? [row.end_lon, row.end_lat] : undefined,
      }));
    } catch (error) {
      console.error("Error fetching featured trails:", error);
      throw error;
    }
  }

  async getTrailById(id: string): Promise<Trail | null> {
    try {
      const result = await this.pool.query(
        `
        SELECT *, 
               ST_X(start_location::geometry) as start_lon,
               ST_Y(start_location::geometry) as start_lat,
               ST_X(end_location::geometry) as end_lon,
               ST_Y(end_location::geometry) as end_lat
        FROM trails 
        WHERE id = $1 AND is_active = true
      `,
        [id]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        ...row,
        start_location: [row.start_lon, row.start_lat],
        end_location: row.end_lon ? [row.end_lon, row.end_lat] : undefined,
      };
    } catch (error) {
      console.error("Error fetching trail:", error);
      throw error;
    }
  }

  // AI-powered story operations
  async findNearbyStories(
    latitude: number,
    longitude: number,
    userId: string,
    radius: number = 1000,
    maxResults: number = 10
  ): Promise<
    Array<AIStory & { distance_meters: number; relevance_score: number }>
  > {
    try {
      // Get user preferences for personalized matching
      const userResult = await this.pool.query(
        "SELECT ai_preferences, interest_vector FROM users WHERE id = $1",
        [userId]
      );

      const userPrefs = userResult.rows[0];

      const result = await this.pool.query(
        `
        SELECT s.*, tp.name as point_name,
               ST_Distance(tp.location, ST_GeogFromText($1))::FLOAT as distance_meters,
               (
                 CASE 
                   WHEN $4::vector IS NOT NULL THEN 
                     (1.0 - (s.content_embeddings <=> $4::vector)) * 0.7 +
                     EXP(-ST_Distance(tp.location, ST_GeogFromText($1)) / 500.0) * 0.3
                   ELSE 
                     EXP(-ST_Distance(tp.location, ST_GeogFromText($1)) / 500.0)
                 END
               ) as relevance_score
        FROM ai_stories s
        JOIN trail_points tp ON s.trail_point_id = tp.id
        WHERE ST_DWithin(tp.location, ST_GeogFromText($1), $2)
          AND s.is_active = true
          AND s.language = $3
        ORDER BY relevance_score DESC, distance_meters ASC
        LIMIT $5
      `,
        [
          `POINT(${longitude} ${latitude})`,
          radius,
          userPrefs?.ai_preferences?.language || "no",
          userPrefs?.interest_vector || null,
          maxResults,
        ]
      );

      return result.rows;
    } catch (error) {
      console.error("Error finding nearby stories:", error);
      throw error;
    }
  }

  async generateStoryCache(
    userId: string,
    latitude: number,
    longitude: number,
    context: Record<string, any>
  ): Promise<string | null> {
    try {
      // Create context hash for caching
      const contextHash = require("crypto")
        .createHash("sha256")
        .update(JSON.stringify({ userId, latitude, longitude, ...context }))
        .digest("hex");

      // Check for existing cache
      const cacheResult = await this.pool.query(
        `
        SELECT generated_story, audio_url 
        FROM story_generation_cache 
        WHERE context_hash = $1 
          AND expires_at > NOW()
          AND ST_DWithin(location, ST_GeogFromText($2), 100)
      `,
        [contextHash, `POINT(${longitude} ${latitude})`]
      );

      if (cacheResult.rows.length > 0) {
        // Update cache hit counter
        await this.pool.query(
          `
          UPDATE story_generation_cache 
          SET cache_hits = cache_hits + 1, last_accessed_at = NOW()
          WHERE context_hash = $1
        `,
          [contextHash]
        );

        return cacheResult.rows[0].generated_story;
      }

      return null; // No cache found, will need to generate
    } catch (error) {
      console.error("Error checking story cache:", error);
      throw error;
    }
  }

  async storeGeneratedStory(
    story: Omit<AIStory, "id" | "created_at" | "updated_at">,
    latitude: number,
    longitude: number,
    userId: string,
    context: Record<string, any>
  ): Promise<string> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Insert the story
      const storyResult = await client.query(
        `
        INSERT INTO ai_stories (
          trail_id, trail_point_id, user_id, title, content, content_type, 
          language, ai_model, generation_prompt, generation_context,
          content_embeddings, audio_url, voice_model, play_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `,
        [
          story.trail_id,
          story.trail_point_id,
          story.user_id,
          story.title,
          story.content,
          story.content_type,
          story.language,
          story.ai_model,
          story.generation_prompt,
          story.generation_context,
          JSON.stringify(story.content_embeddings),
          story.audio_url,
          story.voice_model,
          story.play_count,
        ]
      );

      const storyId = storyResult.rows[0].id;

      // Cache the generation
      const contextHash = require("crypto")
        .createHash("sha256")
        .update(JSON.stringify({ userId, latitude, longitude, ...context }))
        .digest("hex");

      await client.query(
        `
        INSERT INTO story_generation_cache (
          user_id, location, context_hash, generation_context, 
          story_id, generated_story, audio_url
        ) VALUES ($1, ST_GeogFromText($2), $3, $4, $5, $6, $7)
        ON CONFLICT (context_hash, location) DO UPDATE SET
          story_id = EXCLUDED.story_id,
          generated_story = EXCLUDED.generated_story,
          audio_url = EXCLUDED.audio_url,
          last_accessed_at = NOW()
      `,
        [
          userId,
          `POINT(${longitude} ${latitude})`,
          contextHash,
          context,
          storyId,
          story.content,
          story.audio_url,
        ]
      );

      await client.query("COMMIT");
      return storyId;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error storing generated story:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Memory operations
  async getUserMemories(userId: string, limit: number = 20): Promise<Memory[]> {
    try {
      const result = await this.pool.query(
        `
        SELECT *, 
               ST_X(location::geometry) as location_lon,
               ST_Y(location::geometry) as location_lat
        FROM memories 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `,
        [userId, limit]
      );

      return result.rows.map((row) => ({
        ...row,
        location: row.location_lon
          ? [row.location_lon, row.location_lat]
          : undefined,
      }));
    } catch (error) {
      console.error("Error fetching user memories:", error);
      throw error;
    }
  }

  async createMemory(
    memory: Omit<Memory, "id" | "created_at" | "updated_at">
  ): Promise<string> {
    try {
      const result = await this.pool.query(
        `
        INSERT INTO memories (
          user_id, trail_id, title, description, location, location_name,
          media_urls, weather_conditions, hiking_companions, tags, visibility
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `,
        [
          memory.user_id,
          memory.trail_id,
          memory.title,
          memory.description,
          memory.location
            ? `POINT(${memory.location[0]} ${memory.location[1]})`
            : null,
          memory.location_name,
          JSON.stringify(memory.media_urls),
          memory.weather_conditions,
          JSON.stringify(memory.hiking_companions),
          JSON.stringify(memory.tags),
          memory.visibility,
        ]
      );

      return result.rows[0].id;
    } catch (error) {
      console.error("Error creating memory:", error);
      throw error;
    }
  }

  // User interaction tracking for AI learning
  async trackStoryInteraction(
    userId: string,
    storyId: string,
    interactionType:
      | "played"
      | "skipped"
      | "liked"
      | "disliked"
      | "shared"
      | "saved",
    rating?: number,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      await this.pool.query(
        `
        INSERT INTO user_story_interactions (
          user_id, story_id, interaction_type, rating, interaction_context
        ) VALUES ($1, $2, $3, $4, $5)
      `,
        [userId, storyId, interactionType, rating, context]
      );

      // Update story play count if played
      if (interactionType === "played") {
        await this.pool.query(
          "UPDATE ai_stories SET play_count = play_count + 1 WHERE id = $1",
          [storyId]
        );
      }
    } catch (error) {
      console.error("Error tracking story interaction:", error);
      throw error;
    }
  }

  // Performance metrics
  async recordAIMetric(
    metricType: string,
    metricValue: number,
    metricUnit: string,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      await this.pool.query(
        `
        INSERT INTO ai_agent_metrics (metric_type, metric_value, metric_unit, context)
        VALUES ($1, $2, $3, $4)
      `,
        [metricType, metricValue, metricUnit, context]
      );
    } catch (error) {
      console.error("Error recording AI metric:", error);
      // Don't throw - metrics should not break the app
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.pool.query("SELECT 1 as health");
      return result.rows[0].health === 1;
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  }

  // Cleanup expired cache
  async cleanupExpiredCache(): Promise<number> {
    try {
      const result = await this.pool.query("SELECT cleanup_expired_cache()");
      return result.rows[0].cleanup_expired_cache;
    } catch (error) {
      console.error("Error cleaning up expired cache:", error);
      return 0;
    }
  }
}

// Singleton instance
export const databaseService = new DatabaseService();

// Export types and service
export default databaseService;
