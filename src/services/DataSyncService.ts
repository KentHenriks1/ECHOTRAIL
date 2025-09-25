import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { db } from "../config/database";
import { logger } from "../utils/logger";
import { authService } from "./AuthService";
import { apiService } from "./ApiService";

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt?: Date;
  pendingItems: number;
  failedItems: number;
  totalItems: number;
}

export interface SyncItem {
  id: string;
  entityType: "TRAIL" | "TRACK_POINT" | "MEDIA_FILE" | "USER_PROFILE";
  entityId: string;
  operation: "CREATE" | "UPDATE" | "DELETE";
  data: any;
  timestamp: Date;
  attempts: number;
  lastError?: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
}

export interface ConflictResolution {
  conflictId: string;
  entityType: string;
  entityId: string;
  localData: any;
  remoteData: any;
  resolution: "USE_LOCAL" | "USE_REMOTE" | "MERGE" | "MANUAL";
  resolvedData?: any;
}

export interface SyncCallbacks {
  onSyncStart?: () => void;
  onSyncComplete?: (status: SyncStatus) => void;
  onSyncProgress?: (progress: {
    current: number;
    total: number;
    item?: SyncItem;
  }) => void;
  onSyncError?: (error: string) => void;
  onConflict?: (conflict: ConflictResolution) => void;
}

export class DataSyncService {
  private static instance: DataSyncService;
  private syncStatus: SyncStatus = {
    isOnline: false,
    isSyncing: false,
    pendingItems: 0,
    failedItems: 0,
    totalItems: 0,
  };
  private callbacks: SyncCallbacks = {};
  private syncQueue: SyncItem[] = [];
  private isProcessing = false;
  private networkListener?: () => void;

  private constructor() {
    this.initializeSync();
  }

  static getInstance(): DataSyncService {
    if (!DataSyncService.instance) {
      DataSyncService.instance = new DataSyncService();
    }
    return DataSyncService.instance;
  }

  /**
   * Initialize synchronization service
   */
  private async initializeSync(): Promise<void> {
    try {
      // Load pending sync items from storage
      await this.loadSyncQueue();

      // Setup network connectivity monitoring
      this.setupNetworkListener();

      // Load last sync status
      await this.loadLastSyncStatus();

      // Start automatic sync if online and authenticated
      if (this.syncStatus.isOnline && authService.isAuthenticated()) {
        setTimeout(() => this.startPeriodicSync(), 5000);
      }

      logger.info("DataSyncService initialized");
    } catch (error) {
      logger.error("Error initializing DataSyncService:", error);
    }
  }

  /**
   * Set sync callbacks
   */
  setCallbacks(callbacks: SyncCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(
    item: Omit<SyncItem, "id" | "attempts" | "timestamp">
  ): Promise<void> {
    const syncItem: SyncItem = {
      ...item,
      id: this.generateId(),
      attempts: 0,
      timestamp: new Date(),
    };

    // Add to queue
    this.syncQueue.push(syncItem);

    // Update database
    await this.saveSyncItem(syncItem);

    // Update status
    this.updateSyncStatus();

    // Try immediate sync if online
    if (this.syncStatus.isOnline && !this.isProcessing) {
      setTimeout(() => this.processQueue(), 1000);
    }

    logger.info(
      `Added item to sync queue: ${item.entityType} ${item.operation}`
    );
  }

  /**
   * Force full synchronization
   */
  async forceFulSync(): Promise<boolean> {
    if (!authService.isAuthenticated()) {
      logger.warn("Cannot sync - user not authenticated");
      return false;
    }

    if (this.isProcessing) {
      logger.warn("Sync already in progress");
      return false;
    }

    try {
      this.syncStatus.isSyncing = true;
      this.callbacks.onSyncStart?.();

      logger.info("Starting full synchronization...");

      // Sync user profile
      await this.syncUserProfile();

      // Sync trails and related data
      await this.syncTrails();

      // Process sync queue
      await this.processQueue();

      // Pull latest data from server
      await this.pullLatestData();

      this.syncStatus.lastSyncAt = new Date();
      await this.saveLastSyncStatus();

      logger.info("Full synchronization completed");
      return true;
    } catch (error) {
      logger.error("Full sync error:", error);
      this.callbacks.onSyncError?.(`Synkronisering feilet: ${error}`);
      return false;
    } finally {
      this.syncStatus.isSyncing = false;
      this.updateSyncStatus();
      this.callbacks.onSyncComplete?.(this.syncStatus);
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(resolution: ConflictResolution): Promise<boolean> {
    try {
      const {
        conflictId,
        entityType,
        entityId,
        resolution: resolutionType,
        resolvedData,
      } = resolution;

      switch (resolutionType) {
        case "USE_LOCAL":
          // Upload local data to server
          await this.uploadEntity(entityType, entityId, resolution.localData);
          break;

        case "USE_REMOTE":
          // Update local data with remote data
          await this.updateLocalEntity(
            entityType,
            entityId,
            resolution.remoteData
          );
          break;

        case "MERGE":
          // Use merged data
          if (resolvedData) {
            await this.updateLocalEntity(entityType, entityId, resolvedData);
            await this.uploadEntity(entityType, entityId, resolvedData);
          }
          break;

        case "MANUAL":
          // User will handle manually
          break;
      }

      // Remove conflict from database
      await db("sync_conflicts").where("id", conflictId).delete();

      logger.info(
        `Conflict resolved: ${entityType} ${entityId} - ${resolutionType}`
      );
      return true;
    } catch (error) {
      logger.error("Error resolving conflict:", error);
      return false;
    }
  }

  /**
   * Clear all sync data (for testing/reset)
   */
  async clearSyncData(): Promise<void> {
    try {
      this.syncQueue = [];
      await AsyncStorage.removeItem("@echotrail:sync_queue");
      await AsyncStorage.removeItem("@echotrail:sync_status");
      await db("sync_status").delete();

      this.updateSyncStatus();
      logger.info("Sync data cleared");
    } catch (error) {
      logger.error("Error clearing sync data:", error);
    }
  }

  // Private methods

  private setupNetworkListener(): void {
    this.networkListener = NetInfo.addEventListener((state) => {
      const wasOnline = this.syncStatus.isOnline;
      this.syncStatus.isOnline = state.isConnected ?? false;

      if (!wasOnline && this.syncStatus.isOnline) {
        logger.info("Network connected - starting sync");
        setTimeout(() => this.processQueue(), 2000);
      }

      this.updateSyncStatus();
    });
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      // Load from AsyncStorage
      const queueData = await AsyncStorage.getItem("@echotrail:sync_queue");
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }

      // Also load from database
      const dbItems = await db("sync_queue")
        .where("user_id", authService.getCurrentUser()?.id || "")
        .orderBy("timestamp", "asc");

      // Merge and deduplicate
      const allItems = [...this.syncQueue, ...dbItems.map(this.mapDbSyncItem)];
      this.syncQueue = this.deduplicateSyncItems(allItems);

      this.updateSyncStatus();
    } catch (error) {
      logger.error("Error loading sync queue:", error);
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        "@echotrail:sync_queue",
        JSON.stringify(this.syncQueue)
      );
    } catch (error) {
      logger.error("Error saving sync queue:", error);
    }
  }

  private async saveSyncItem(item: SyncItem): Promise<void> {
    try {
      const userId = authService.getCurrentUser()?.id;
      if (!userId) return;

      await db("sync_queue").insert({
        id: item.id,
        user_id: userId,
        entity_type: item.entityType,
        entity_id: item.entityId,
        operation: item.operation,
        data: JSON.stringify(item.data),
        priority: item.priority,
        attempts: item.attempts,
        last_error: item.lastError,
        created_at: item.timestamp,
      });
    } catch (error) {
      logger.error("Error saving sync item:", error);
    }
  }

  private async processQueue(): Promise<void> {
    if (
      this.isProcessing ||
      !this.syncStatus.isOnline ||
      !authService.isAuthenticated()
    ) {
      return;
    }

    this.isProcessing = true;
    logger.info(`Processing sync queue with ${this.syncQueue.length} items`);

    try {
      // Sort by priority and timestamp
      this.syncQueue.sort((a, b) => {
        const priorityOrder = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        return a.timestamp.getTime() - b.timestamp.getTime();
      });

      const processedItems: string[] = [];

      for (let i = 0; i < this.syncQueue.length; i++) {
        const item = this.syncQueue[i];

        this.callbacks.onSyncProgress?.({
          current: i + 1,
          total: this.syncQueue.length,
          item,
        });

        try {
          await this.processSyncItem(item);
          processedItems.push(item.id);

          // Remove from database
          await db("sync_queue").where("id", item.id).delete();
        } catch (error) {
          logger.error(`Error processing sync item ${item.id}:`, error);

          item.attempts++;
          item.lastError = String(error);

          // Retry logic
          if (item.attempts >= 3) {
            logger.warn(
              `Max attempts reached for sync item ${item.id}, marking as failed`
            );
            this.syncStatus.failedItems++;
          } else {
            // Update attempts in database
            await db("sync_queue").where("id", item.id).update({
              attempts: item.attempts,
              last_error: item.lastError,
            });
          }
        }
      }

      // Remove processed items from queue
      this.syncQueue = this.syncQueue.filter(
        (item) => !processedItems.includes(item.id)
      );
      await this.saveSyncQueue();

      this.updateSyncStatus();
    } catch (error) {
      logger.error("Error processing sync queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processSyncItem(item: SyncItem): Promise<void> {
    switch (item.entityType) {
      case "TRAIL":
        await this.syncTrailItem(item);
        break;
      case "TRACK_POINT":
        await this.syncTrackPointItem(item);
        break;
      case "MEDIA_FILE":
        await this.syncMediaFileItem(item);
        break;
      case "USER_PROFILE":
        await this.syncUserProfileItem(item);
        break;
      default:
        throw new Error(`Unknown entity type: ${item.entityType}`);
    }
  }

  private async syncTrailItem(item: SyncItem): Promise<void> {
    switch (item.operation) {
      case "CREATE":
        await apiService.post("/api/trails", item.data);
        break;
      case "UPDATE":
        await apiService.put(`/api/trails/${item.entityId}`, item.data);
        break;
      case "DELETE":
        await apiService.delete(`/api/trails/${item.entityId}`);
        break;
    }
  }

  private async syncTrackPointItem(item: SyncItem): Promise<void> {
    switch (item.operation) {
      case "CREATE":
        await apiService.post("/api/track-points", item.data);
        break;
      case "UPDATE":
        await apiService.put(`/api/track-points/${item.entityId}`, item.data);
        break;
      case "DELETE":
        await apiService.delete(`/api/track-points/${item.entityId}`);
        break;
    }
  }

  private async syncMediaFileItem(item: SyncItem): Promise<void> {
    switch (item.operation) {
      case "CREATE":
        await apiService.uploadFile("/api/media", item.data);
        break;
      case "UPDATE":
        await apiService.put(`/api/media/${item.entityId}`, item.data);
        break;
      case "DELETE":
        await apiService.delete(`/api/media/${item.entityId}`);
        break;
    }
  }

  private async syncUserProfileItem(item: SyncItem): Promise<void> {
    switch (item.operation) {
      case "UPDATE":
        await apiService.put("/api/user/profile", item.data);
        break;
    }
  }

  private async syncUserProfile(): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    try {
      // Check if local profile needs sync
      const localProfile = await db("users").where("id", user.id).first();
      const lastSync = await this.getLastSyncTime("USER_PROFILE", user.id);

      if (!lastSync || localProfile.updated_at > lastSync) {
        await this.addToSyncQueue({
          entityType: "USER_PROFILE",
          entityId: user.id,
          operation: "UPDATE",
          data: localProfile,
          priority: "NORMAL",
        });
      }
    } catch (error) {
      logger.error("Error syncing user profile:", error);
    }
  }

  private async syncTrails(): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    try {
      // Get all trails that need syncing
      const trails = await db("trails")
        .where("user_id", user.id)
        .where("sync_status", "!=", "SYNCED");

      for (const trail of trails) {
        let operation: "CREATE" | "UPDATE" = "UPDATE";

        // Check if trail exists on server
        try {
          await apiService.get(`/api/trails/${trail.id}`);
        } catch (error: any) {
          if (error.status === 404) {
            operation = "CREATE";
          }
        }

        await this.addToSyncQueue({
          entityType: "TRAIL",
          entityId: trail.id,
          operation,
          data: trail,
          priority: "NORMAL",
        });

        // Also sync track points
        const trackPoints = await db("track_points").where(
          "trail_id",
          trail.id
        );

        for (const point of trackPoints) {
          await this.addToSyncQueue({
            entityType: "TRACK_POINT",
            entityId: point.id,
            operation: "CREATE",
            data: point,
            priority: "LOW",
          });
        }
      }
    } catch (error) {
      logger.error("Error syncing trails:", error);
    }
  }

  private async pullLatestData(): Promise<void> {
    try {
      // Pull latest trails
      const trails = await apiService.get("/api/trails");
      await this.updateLocalTrails(trails);

      // Pull latest user data
      const userData = await apiService.get("/api/user/profile");
      await this.updateLocalUserProfile(userData);
    } catch (error) {
      logger.error("Error pulling latest data:", error);
    }
  }

  private async updateLocalTrails(remoteTrails: any[]): Promise<void> {
    for (const remoteTrail of remoteTrails) {
      const localTrail = await db("trails").where("id", remoteTrail.id).first();

      if (!localTrail) {
        // Insert new trail
        await db("trails").insert(remoteTrail);
      } else if (
        new Date(remoteTrail.updated_at) > new Date(localTrail.updated_at)
      ) {
        // Check for conflict
        if (localTrail.sync_status === "PENDING") {
          await this.handleConflict(
            "TRAIL",
            remoteTrail.id,
            localTrail,
            remoteTrail
          );
        } else {
          // Update local trail
          await db("trails").where("id", remoteTrail.id).update(remoteTrail);
        }
      }
    }
  }

  private async updateLocalUserProfile(remoteProfile: any): Promise<void> {
    const userId = authService.getCurrentUser()?.id;
    if (!userId) return;

    const localProfile = await db("users").where("id", userId).first();

    if (
      localProfile &&
      new Date(remoteProfile.updated_at) > new Date(localProfile.updated_at)
    ) {
      await db("users").where("id", userId).update(remoteProfile);

      // Update auth service user object
      authService.updateProfile(remoteProfile);
    }
  }

  private async handleConflict(
    entityType: string,
    entityId: string,
    localData: any,
    remoteData: any
  ): Promise<void> {
    const conflictId = this.generateId();

    const conflict: ConflictResolution = {
      conflictId,
      entityType,
      entityId,
      localData,
      remoteData,
      resolution: "MANUAL", // Default to manual resolution
    };

    // Store conflict in database
    await db("sync_conflicts").insert({
      id: conflictId,
      user_id: authService.getCurrentUser()?.id,
      entity_type: entityType,
      entity_id: entityId,
      local_data: JSON.stringify(localData),
      remote_data: JSON.stringify(remoteData),
      status: "PENDING",
    });

    // Notify callback
    this.callbacks.onConflict?.(conflict);

    logger.info(`Sync conflict detected: ${entityType} ${entityId}`);
  }

  private async uploadEntity(
    entityType: string,
    entityId: string,
    data: any
  ): Promise<void> {
    const endpoint = this.getApiEndpoint(entityType, entityId);
    await apiService.put(endpoint, data);
  }

  private async updateLocalEntity(
    entityType: string,
    entityId: string,
    data: any
  ): Promise<void> {
    const table = this.getTableName(entityType);
    await db(table).where("id", entityId).update(data);
  }

  private getApiEndpoint(entityType: string, entityId?: string): string {
    switch (entityType) {
      case "TRAIL":
        return `/api/trails${entityId ? `/${entityId}` : ""}`;
      case "TRACK_POINT":
        return `/api/track-points${entityId ? `/${entityId}` : ""}`;
      case "MEDIA_FILE":
        return `/api/media${entityId ? `/${entityId}` : ""}`;
      case "USER_PROFILE":
        return "/api/user/profile";
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private getTableName(entityType: string): string {
    switch (entityType) {
      case "TRAIL":
        return "trails";
      case "TRACK_POINT":
        return "track_points";
      case "MEDIA_FILE":
        return "media_files";
      case "USER_PROFILE":
        return "users";
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private async getLastSyncTime(
    entityType: string,
    entityId: string
  ): Promise<Date | null> {
    try {
      const syncRecord = await db("sync_status")
        .where("user_id", authService.getCurrentUser()?.id)
        .where("entity_type", entityType)
        .where("entity_id", entityId)
        .first();

      return syncRecord ? new Date(syncRecord.last_sync_at) : null;
    } catch (error) {
      logger.error("Error getting last sync time:", error);
      return null;
    }
  }

  private async loadLastSyncStatus(): Promise<void> {
    try {
      const statusData = await AsyncStorage.getItem("@echotrail:sync_status");
      if (statusData) {
        const status = JSON.parse(statusData);
        this.syncStatus.lastSyncAt = status.lastSyncAt
          ? new Date(status.lastSyncAt)
          : undefined;
      }
    } catch (error) {
      logger.error("Error loading sync status:", error);
    }
  }

  private async saveLastSyncStatus(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        "@echotrail:sync_status",
        JSON.stringify({
          lastSyncAt: this.syncStatus.lastSyncAt?.toISOString(),
        })
      );
    } catch (error) {
      logger.error("Error saving sync status:", error);
    }
  }

  private updateSyncStatus(): void {
    this.syncStatus.pendingItems = this.syncQueue.filter(
      (item) => item.attempts < 3
    ).length;
    this.syncStatus.failedItems = this.syncQueue.filter(
      (item) => item.attempts >= 3
    ).length;
    this.syncStatus.totalItems = this.syncQueue.length;
  }

  private startPeriodicSync(): void {
    // Sync every 5 minutes if online and authenticated
    setInterval(
      () => {
        if (
          this.syncStatus.isOnline &&
          authService.isAuthenticated() &&
          !this.isProcessing
        ) {
          this.processQueue();
        }
      },
      5 * 60 * 1000
    );
  }

  private mapDbSyncItem(dbItem: any): SyncItem {
    return {
      id: dbItem.id,
      entityType: dbItem.entity_type,
      entityId: dbItem.entity_id,
      operation: dbItem.operation,
      data: JSON.parse(dbItem.data),
      timestamp: new Date(dbItem.created_at),
      attempts: dbItem.attempts,
      lastError: dbItem.last_error,
      priority: dbItem.priority,
    };
  }

  private deduplicateSyncItems(items: SyncItem[]): SyncItem[] {
    const seen = new Set();
    return items.filter((item) => {
      const key = `${item.entityType}:${item.entityId}:${item.operation}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}

export const dataSyncService = DataSyncService.getInstance();
