import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "../utils/logger";

interface DatabaseConfig {
  url: string;
  restApiUrl: string;
  apiTimeout: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  createdAt: string;
  lastActiveAt: string;
}

interface Trail {
  id: string;
  name: string;
  description: string;
  difficulty: "easy" | "moderate" | "hard";
  distance: number;
  duration: number;
  elevation: number;
  coordinates: Array<{ latitude: number; longitude: number }>;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}

interface Story {
  id: string;
  title: string;
  content: string;
  coordinate: { latitude: number; longitude: number };
  category: "history" | "nature" | "culture" | "legend" | "local";
  trailId?: string;
  audioUrl?: string;
  imageUrl?: string;
  duration?: number;
  createdBy: string;
  createdAt: string;
  isAiGenerated: boolean;
}

interface Memory {
  id: string;
  userId: string;
  title: string;
  description?: string;
  coordinate: { latitude: number; longitude: number };
  imageUrls?: string[];
  audioUrl?: string;
  trailId?: string;
  storyId?: string;
  tags?: string[];
  createdAt: string;
}

class DatabaseService {
  private config: DatabaseConfig;
  private cachedUsers: Map<string, User> = new Map();
  private cachedTrails: Map<string, Trail> = new Map();
  private cacheTtl = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.config = {
      url: Constants.expoConfig?.extra?.echotrail?.databaseUrl || "",
      restApiUrl:
        Constants.expoConfig?.extra?.echotrail?.apiUrl ||
        "http://localhost:3001/api",
      apiTimeout: 30000,
    };

    if (!this.config.restApiUrl) {
      logger.warn("API URL configuration not found in expo config");
    }
  }

  /**
   * Make a REST API call to backend server
   */
  private async makeApiCall(
    endpoint: string,
    method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
    body?: any,
    params?: Record<string, string>
  ): Promise<any> {
    try {
      const url = new URL(`${this.config.restApiUrl}${endpoint}`);

      // Add query parameters
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      // Add authorization header if needed (implement based on your auth strategy)
      const authToken = await this.getAuthToken();
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      // Create abort signal with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.apiTimeout
      );

      const requestOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body && method !== "GET") {
        requestOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url.toString(), requestOptions);

      // Clear timeout when request completes
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `API call failed: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      logger.error(`Database API error (${method} ${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Get authentication token (implement based on your auth strategy)
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem("auth_token");
    } catch (error) {
      logger.error("Error getting auth token:", error);
      return null;
    }
  }

  /**
   * Set authentication token
   */
  public async setAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem("auth_token", token);
    } catch (error) {
      logger.error("Error setting auth token:", error);
    }
  }

  /**
   * Clear authentication token
   */
  public async clearAuthToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem("auth_token");
    } catch (error) {
      logger.error("Error clearing auth token:", error);
    }
  }

  // User Management
  /**
   * Create a new user
   */
  public async createUser(userData: {
    email: string;
    name: string;
    role?: "user" | "admin";
  }): Promise<User> {
    const user = await this.makeApiCall("/users", "POST", {
      ...userData,
      role: userData.role || "user",
      created_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    });

    // Cache the user
    this.cachedUsers.set(user.id, user);
    return user;
  }

  /**
   * Get user by ID
   */
  public async getUserById(userId: string): Promise<User | null> {
    try {
      // Check cache first
      const cachedUser = this.cachedUsers.get(userId);
      if (cachedUser) {
        return cachedUser;
      }

      const users = await this.makeApiCall("/users", "GET", undefined, {
        id: `eq.${userId}`,
        limit: "1",
      });

      if (users && users.length > 0) {
        const user = users[0];
        this.cachedUsers.set(userId, user);
        return user;
      }

      return null;
    } catch (error) {
      logger.error("Error getting user:", error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  public async getUserByEmail(email: string): Promise<User | null> {
    try {
      const users = await this.makeApiCall("/users", "GET", undefined, {
        email: `eq.${email}`,
        limit: "1",
      });

      if (users && users.length > 0) {
        const user = users[0];
        this.cachedUsers.set(user.id, user);
        return user;
      }

      return null;
    } catch (error) {
      logger.error("Error getting user by email:", error);
      return null;
    }
  }

  /**
   * Update user's last active timestamp
   */
  public async updateUserActivity(userId: string): Promise<void> {
    try {
      await this.makeApiCall(
        `/users`,
        "PATCH",
        {
          last_active_at: new Date().toISOString(),
        },
        { id: `eq.${userId}` }
      );

      // Update cache
      const cachedUser = this.cachedUsers.get(userId);
      if (cachedUser) {
        cachedUser.lastActiveAt = new Date().toISOString();
      }
    } catch (error) {
      logger.error("Error updating user activity:", error);
    }
  }

  // Trail Management
  /**
   * Create a new trail
   */
  public async createTrail(trailData: {
    name: string;
    description: string;
    difficulty: "easy" | "moderate" | "hard";
    distance: number;
    duration?: number;
    elevation?: number;
    coordinates: Array<{ latitude: number; longitude: number }>;
    tags?: string[];
    createdBy: string;
    isPublic?: boolean;
  }): Promise<Trail> {
    const trail = await this.makeApiCall("/trails", "POST", {
      ...trailData,
      duration: trailData.duration || 0,
      elevation: trailData.elevation || 0,
      tags: trailData.tags || [],
      is_public: trailData.isPublic ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Cache the trail
    this.cachedTrails.set(trail.id, trail);
    return trail;
  }

  /**
   * Get trails near a location
   */
  public async getTrailsNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    limit: number = 20
  ): Promise<Trail[]> {
    try {
      // Note: This would require PostGIS extensions and spatial queries
      // For now, we'll get all public trails and filter client-side
      const trails = await this.makeApiCall("/trails", "GET", undefined, {
        is_public: "eq.true",
        limit: limit.toString(),
        order: "created_at.desc",
      });

      // Filter by distance client-side (in a real app, do this server-side with PostGIS)
      const nearbyTrails = trails.filter((trail: any) => {
        if (!trail.coordinates || trail.coordinates.length === 0) return false;

        const trailStart = trail.coordinates[0];
        const distance = this.calculateDistance(
          latitude,
          longitude,
          trailStart.latitude,
          trailStart.longitude
        );

        return distance <= radiusKm;
      });

      // Cache trails
      nearbyTrails.forEach((trail: Trail) => {
        this.cachedTrails.set(trail.id, trail);
      });

      return nearbyTrails;
    } catch (error) {
      logger.error("Error getting nearby trails:", error);
      return [];
    }
  }

  /**
   * Get trail by ID
   */
  public async getTrailById(trailId: string): Promise<Trail | null> {
    try {
      // Check cache first
      const cachedTrail = this.cachedTrails.get(trailId);
      if (cachedTrail) {
        return cachedTrail;
      }

      const trails = await this.makeApiCall("/trails", "GET", undefined, {
        id: `eq.${trailId}`,
        limit: "1",
      });

      if (trails && trails.length > 0) {
        const trail = trails[0];
        this.cachedTrails.set(trailId, trail);
        return trail;
      }

      return null;
    } catch (error) {
      logger.error("Error getting trail:", error);
      return null;
    }
  }

  /**
   * Search trails by name and tags
   */
  public async searchTrails(
    query: string,
    limit: number = 20
  ): Promise<Trail[]> {
    try {
      // Use PostgREST's text search capabilities
      const trails = await this.makeApiCall("/trails", "GET", undefined, {
        or: `name.ilike.*${query}*,description.ilike.*${query}*`,
        is_public: "eq.true",
        limit: limit.toString(),
      });

      // Cache trails
      trails.forEach((trail: Trail) => {
        this.cachedTrails.set(trail.id, trail);
      });

      return trails;
    } catch (error) {
      logger.error("Error searching trails:", error);
      return [];
    }
  }

  // Story Management
  /**
   * Create a new story
   */
  public async createStory(storyData: {
    title: string;
    content: string;
    coordinate: { latitude: number; longitude: number };
    category: "history" | "nature" | "culture" | "legend" | "local";
    trailId?: string;
    audioUrl?: string;
    imageUrl?: string;
    duration?: number;
    createdBy: string;
    isAiGenerated?: boolean;
  }): Promise<Story> {
    const story = await this.makeApiCall("/stories", "POST", {
      ...storyData,
      trail_id: storyData.trailId,
      audio_url: storyData.audioUrl,
      image_url: storyData.imageUrl,
      created_by: storyData.createdBy,
      is_ai_generated: storyData.isAiGenerated || false,
      created_at: new Date().toISOString(),
    });

    return story;
  }

  /**
   * Get stories for a trail
   */
  public async getStoriesForTrail(trailId: string): Promise<Story[]> {
    try {
      const stories = await this.makeApiCall("/stories", "GET", undefined, {
        trail_id: `eq.${trailId}`,
        order: "created_at.asc",
      });

      return stories;
    } catch (error) {
      logger.error("Error getting trail stories:", error);
      return [];
    }
  }

  /**
   * Get stories near a location
   */
  public async getStoriesNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 5
  ): Promise<Story[]> {
    try {
      // For now, get all stories and filter client-side
      const stories = await this.makeApiCall("/stories", "GET", undefined, {
        limit: "100",
        order: "created_at.desc",
      });

      // Filter by distance client-side
      const nearbyStories = stories.filter((story: any) => {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          story.coordinate.latitude,
          story.coordinate.longitude
        );

        return distance <= radiusKm;
      });

      return nearbyStories;
    } catch (error) {
      logger.error("Error getting nearby stories:", error);
      return [];
    }
  }

  // Memory Management
  /**
   * Create a new memory
   */
  public async createMemory(memoryData: {
    userId: string;
    title: string;
    description?: string;
    coordinate: { latitude: number; longitude: number };
    imageUrls?: string[];
    audioUrl?: string;
    trailId?: string;
    storyId?: string;
    tags?: string[];
  }): Promise<Memory> {
    const memory = await this.makeApiCall("/memories", "POST", {
      user_id: memoryData.userId,
      title: memoryData.title,
      description: memoryData.description,
      coordinate: memoryData.coordinate,
      image_urls: memoryData.imageUrls || [],
      audio_url: memoryData.audioUrl,
      trail_id: memoryData.trailId,
      story_id: memoryData.storyId,
      tags: memoryData.tags || [],
      created_at: new Date().toISOString(),
    });

    return memory;
  }

  /**
   * Get memories for a user
   */
  public async getUserMemories(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Memory[]> {
    try {
      const memories = await this.makeApiCall("/memories", "GET", undefined, {
        user_id: `eq.${userId}`,
        limit: limit.toString(),
        offset: offset.toString(),
        order: "created_at.desc",
      });

      return memories;
    } catch (error) {
      logger.error("Error getting user memories:", error);
      return [];
    }
  }

  // Utility functions
  /**
   * Calculate distance between two coordinates in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.cachedUsers.clear();
    this.cachedTrails.clear();
  }

  /**
   * Check database connection
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.makeApiCall("/", "GET");
      return true;
    } catch (error) {
      logger.error("Database health check failed:", error);
      return false;
    }
  }

  /**
   * Get database statistics (admin only)
   */
  public async getDatabaseStats(): Promise<{
    users: number;
    trails: number;
    stories: number;
    memories: number;
  } | null> {
    try {
      const [users, trails, stories, memories] = await Promise.all([
        this.makeApiCall("/users", "GET", undefined, { select: "count" }),
        this.makeApiCall("/trails", "GET", undefined, { select: "count" }),
        this.makeApiCall("/stories", "GET", undefined, { select: "count" }),
        this.makeApiCall("/memories", "GET", undefined, { select: "count" }),
      ]);

      return {
        users: users[0]?.count || 0,
        trails: trails[0]?.count || 0,
        stories: stories[0]?.count || 0,
        memories: memories[0]?.count || 0,
      };
    } catch (error) {
      logger.error("Error getting database stats:", error);
      return null;
    }
  }
}

// Create and export a singleton instance
export const databaseService = new DatabaseService();
export type { User, Trail, Story, Memory };
export default databaseService;
