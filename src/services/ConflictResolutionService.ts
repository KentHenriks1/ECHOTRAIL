import AsyncStorage from "@react-native-async-storage/async-storage";
import { enhancedTrailService } from "./EnhancedTrailService";
import { apiService } from "./ApiService";
import { logger } from "../utils/logger";

export interface DataConflict {
  id: string;
  type: "trail" | "trackpoint" | "metadata";
  resourceId: string;
  _localVersion: any;
  _remoteVersion: any;
  timestamp: Date;
  conflictFields: string[];
  _isResolved: boolean;
  resolution?: "local" | "remote" | "merge" | "custom";
  customResolution?: any;
}

export interface ConflictResolutionStrategy {
  autoResolve: boolean;
  preferLocal: boolean;
  preferRemote: boolean;
  alwaysPromptUser: boolean;
  mergeStrategy: "newest" | "longest" | "custom";
}

export interface ConflictResolutionState {
  pendingConflicts: DataConflict[];
  resolvedConflicts: DataConflict[];
  strategy: ConflictResolutionStrategy;
  isResolvingConflicts: boolean;
}

class ConflictResolutionService {
  private static instance: ConflictResolutionService;
  private _state: ConflictResolutionState = {
    pendingConflicts: [],
    resolvedConflicts: [],
    strategy: {
      autoResolve: false,
      preferLocal: false,
      preferRemote: false,
      alwaysPromptUser: true,
      mergeStrategy: "newest",
    },
    isResolvingConflicts: false,
  };

  private readonly STORAGE_KEY = "echotrail_conflicts";
  private stateChangeListeners: ((_state: ConflictResolutionState) => void)[] =
    [];

  static getInstance(): ConflictResolutionService {
    if (!ConflictResolutionService.instance) {
      ConflictResolutionService.instance = new ConflictResolutionService();
    }
    return ConflictResolutionService.instance;
  }

  private constructor() {
    this.initializeService();
  }

  private async initializeService() {
    try {
      await this.loadConflicts();
      await this.loadStrategy();
    } catch (error) {
      logger.error("Failed to initialize ConflictResolutionService:", error);
    }
  }

  private async loadConflicts() {
    try {
      const savedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (savedData) {
        const data = JSON.parse(savedData);
        this._state.pendingConflicts = data.pendingConflicts || [];
        this._state.resolvedConflicts = data.resolvedConflicts || [];
      }
    } catch (error) {
      logger.error("Failed to load conflicts:", error);
    }
  }

  private async saveConflicts() {
    try {
      const dataToSave = {
        pendingConflicts: this._state.pendingConflicts,
        resolvedConflicts: this._state.resolvedConflicts,
      };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      logger.error("Failed to save conflicts:", error);
    }
  }

  private async loadStrategy() {
    try {
      const savedStrategy = await AsyncStorage.getItem(
        "echotrail_conflict_strategy"
      );
      if (savedStrategy) {
        this._state.strategy = {
          ...this._state.strategy,
          ...JSON.parse(savedStrategy),
        };
      }
    } catch (error) {
      logger.error("Failed to load conflict strategy:", error);
    }
  }

  public async updateStrategy(strategy: Partial<ConflictResolutionStrategy>) {
    this._state.strategy = { ...this._state.strategy, ...strategy };

    try {
      await AsyncStorage.setItem(
        "echotrail_conflict_strategy",
        JSON.stringify(this._state.strategy)
      );
    } catch (error) {
      logger.error("Failed to save conflict strategy:", error);
    }

    this.notifyStateChange();
  }

  public async detectConflicts(
    localData: any,
    remoteData: any
  ): Promise<DataConflict[]> {
    const conflicts: DataConflict[] = [];

    // Detect trail metadata conflicts
    if (localData.trails && remoteData.trails) {
      for (const localTrail of localData.trails) {
        const remoteTrail = remoteData.trails.find(
          (t: any) => t.id === localTrail.id
        );
        if (remoteTrail) {
          const conflict = this.detectTrailConflict(localTrail, remoteTrail);
          if (conflict) {
            conflicts.push(conflict);
          }
        }
      }
    }

    // Add conflicts to pending list
    for (const conflict of conflicts) {
      if (!this._state.pendingConflicts.find((c) => c.id === conflict.id)) {
        this._state.pendingConflicts.push(conflict);
      }
    }

    await this.saveConflicts();
    this.notifyStateChange();

    return conflicts;
  }

  private detectTrailConflict(
    localTrail: any,
    remoteTrail: any
  ): DataConflict | null {
    const conflictFields: string[] = [];

    // Compare key fields that can cause conflicts
    const fieldsToCheck = [
      "name",
      "description",
      "distance",
      "duration",
      "updatedAt",
    ];

    for (const field of fieldsToCheck) {
      if (localTrail[field] !== remoteTrail[field]) {
        // Special handling for dates
        if (field === "updatedAt") {
          const localDate = new Date(localTrail[field]);
          const remoteDate = new Date(remoteTrail[field]);
          if (Math.abs(localDate.getTime() - remoteDate.getTime()) > 1000) {
            // 1 second tolerance
            conflictFields.push(field);
          }
        } else {
          conflictFields.push(field);
        }
      }
    }

    // Check track points conflicts
    if (localTrail.trackPoints && remoteTrail.trackPoints) {
      if (localTrail.trackPoints.length !== remoteTrail.trackPoints.length) {
        conflictFields.push("trackPoints");
      } else {
        // Compare track points by timestamp
        const localPoints = localTrail.trackPoints.sort(
          (a: any, b: any) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const remotePoints = remoteTrail.trackPoints.sort(
          (a: any, b: any) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        for (let i = 0; i < localPoints.length; i++) {
          if (
            localPoints[i].latitude !== remotePoints[i].latitude ||
            localPoints[i].longitude !== remotePoints[i].longitude
          ) {
            conflictFields.push("trackPoints");
            break;
          }
        }
      }
    }

    if (conflictFields.length === 0) {
      return null;
    }

    return {
      id: `conflict_${localTrail.id}_${Date.now()}`,
      type: "trail",
      resourceId: localTrail.id,
      _localVersion: localTrail,
      _remoteVersion: remoteTrail,
      timestamp: new Date(),
      conflictFields,
      _isResolved: false,
    };
  }

  public async resolveConflict(
    conflictId: string,
    resolution: "local" | "remote" | "merge" | "custom",
    customData?: any
  ): Promise<void> {
    const conflict = this._state.pendingConflicts.find(
      (c) => c.id === conflictId
    );
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    let resolvedData: any;

    switch (resolution) {
      case "local":
        resolvedData = conflict._localVersion;
        break;
      case "remote":
        resolvedData = conflict._remoteVersion;
        break;
      case "merge":
        resolvedData = this.mergeData(
          conflict._localVersion,
          conflict._remoteVersion
        );
        break;
      case "custom":
        resolvedData = customData;
        break;
    }

    // Update the trail with resolved data
    try {
      if (conflict.type === "trail") {
        await enhancedTrailService.updateTrail(
          conflict.resourceId,
          resolvedData
        );

        // Sync to backend
        try {
          await apiService.updateTrail(conflict.resourceId, resolvedData);
        } catch (error) {
          logger.warn("Failed to sync resolved conflict to backend:", error);
        }
      }

      // Mark conflict as resolved
      conflict._isResolved = true;
      conflict.resolution = resolution;
      conflict.customResolution = customData;

      // Move from pending to resolved
      this._state.pendingConflicts = this._state.pendingConflicts.filter(
        (c) => c.id !== conflictId
      );
      this._state.resolvedConflicts.push(conflict);

      await this.saveConflicts();
      this.notifyStateChange();
    } catch (error) {
      throw new Error(`Failed to resolve conflict: ${error}`);
    }
  }

  private mergeData(localData: any, remoteData: any): any {
    const merged = { ...localData };

    // Use merge strategy to determine how to merge
    switch (this._state.strategy.mergeStrategy) {
      case "newest":
        // Use the version with the newest updatedAt timestamp
        const localDate = new Date(localData.updatedAt || 0);
        const remoteDate = new Date(remoteData.updatedAt || 0);

        if (remoteDate > localDate) {
          // Use remote data for newer fields, but keep local track points if they're longer
          Object.assign(merged, remoteData);
          if (localData.trackPoints && remoteData.trackPoints) {
            if (localData.trackPoints.length > remoteData.trackPoints.length) {
              merged.trackPoints = localData.trackPoints;
            }
          }
        }
        break;

      case "longest":
        // For trails, prefer the version with more track points
        if (localData.trackPoints && remoteData.trackPoints) {
          if (remoteData.trackPoints.length > localData.trackPoints.length) {
            merged.trackPoints = remoteData.trackPoints;
            merged.distance = remoteData.distance;
            merged.duration = remoteData.duration;
          }
        }

        // For metadata, use the newest
        const localMeta = new Date(localData.updatedAt || 0);
        const remoteMeta = new Date(remoteData.updatedAt || 0);
        if (remoteMeta > localMeta) {
          merged.name = remoteData.name;
          merged.description = remoteData.description;
        }
        break;

      case "custom":
        // Custom merge logic could be implemented here
        break;
    }

    // Always update the timestamp
    merged.updatedAt = new Date().toISOString();

    return merged;
  }

  public async autoResolveConflicts(): Promise<void> {
    if (
      !this._state.strategy.autoResolve ||
      this._state.pendingConflicts.length === 0
    ) {
      return;
    }

    this._state.isResolvingConflicts = true;
    this.notifyStateChange();

    try {
      const conflictsToResolve = [...this._state.pendingConflicts];

      for (const conflict of conflictsToResolve) {
        let resolution: "local" | "remote" | "merge" = "merge";

        if (this._state.strategy.preferLocal) {
          resolution = "local";
        } else if (this._state.strategy.preferRemote) {
          resolution = "remote";
        }

        await this.resolveConflict(conflict.id, resolution);
      }
    } catch (error) {
      logger.error("Failed to auto-resolve conflicts:", error);
    } finally {
      this._state.isResolvingConflicts = false;
      this.notifyStateChange();
    }
  }

  public async clearResolvedConflicts(): Promise<void> {
    this._state.resolvedConflicts = [];
    await this.saveConflicts();
    this.notifyStateChange();
  }

  public getPendingConflicts(): DataConflict[] {
    return [...this._state.pendingConflicts];
  }

  public getResolvedConflicts(): DataConflict[] {
    return [...this._state.resolvedConflicts];
  }

  public getConflictResolutionState(): ConflictResolutionState {
    return { ...this._state };
  }

  public hasPendingConflicts(): boolean {
    return this._state.pendingConflicts.length > 0;
  }

  // Event listeners
  public addStateChangeListener(
    listener: (state: ConflictResolutionState) => void
  ): void {
    this.stateChangeListeners.push(listener);
  }

  public removeStateChangeListener(
    listener: (state: ConflictResolutionState) => void
  ): void {
    const index = this.stateChangeListeners.indexOf(listener);
    if (index > -1) {
      this.stateChangeListeners.splice(index, 1);
    }
  }

  private notifyStateChange(): void {
    this.stateChangeListeners.forEach((listener) => {
      try {
        listener(this.getConflictResolutionState());
      } catch (error) {
        logger.error(
          "Error in conflict resolution state change listener:",
          error
        );
      }
    });
  }

  // Integration method for EnhancedTrailService
  public async checkForConflictsBeforeSync(
    localTrails: any[]
  ): Promise<DataConflict[]> {
    try {
      // Fetch latest remote trails
      const remoteTrails = await apiService.getTrails();

      // Detect conflicts
      const conflicts = await this.detectConflicts(
        { trails: localTrails },
        { trails: remoteTrails }
      );

      return conflicts;
    } catch (error) {
      logger.error("Failed to check for conflicts before sync:", error);
      return [];
    }
  }

  // Utility method to get conflict summary
  public getConflictSummary(): {
    total: number;
    byType: Record<string, number>;
  } {
    const total = this._state.pendingConflicts.length;
    const byType: Record<string, number> = {};

    this._state.pendingConflicts.forEach((conflict) => {
      byType[conflict.type] = (byType[conflict.type] || 0) + 1;
    });

    return { total, byType };
  }
}

export const conflictResolutionService =
  ConflictResolutionService.getInstance();
