import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { logger } from "../utils/logger";

export interface OfflineRegion {
  _id: string;
  _name: string;
  bounds: [[number, number], [number, number]]; // [[minLng, minLat], [maxLng, maxLat]]
  _minZoom: number;
  _maxZoom: number;
  styleURL: string;
  downloadProgress?: number;
  isDownloaded?: boolean;
  sizeInBytes?: number;
  createdAt?: Date;
}

export interface OfflineMapState {
  _isOfflineMode: boolean;
  availableRegions: OfflineRegion[];
  downloadingRegions: Set<string>;
  offlineStyleURL?: string;
}

class OfflineMapService {
  private static instance: OfflineMapService;
  private _state: OfflineMapState = {
    _isOfflineMode: false,
    availableRegions: [],
    downloadingRegions: new Set(),
  };

  private readonly STORAGE_KEY = "echotrail_offline_maps";
  private readonly TILE_CACHE_DIR = "offline_tiles/"; // FileSystem.documentDirectory ? `${FileSystem.documentDirectory}offline_tiles/` : 'offline_tiles/';
  private stateChangeListeners: ((state: OfflineMapState) => void)[] = [];

  static getInstance(): OfflineMapService {
    if (!OfflineMapService.instance) {
      OfflineMapService.instance = new OfflineMapService();
    }
    return OfflineMapService.instance;
  }

  private constructor() {
    this.initializeService();
  }

  private async initializeService() {
    try {
      // Try to create tile cache directory with fallback
      let cacheDir = this.TILE_CACHE_DIR;
      try {
        // First try document directory
        if (FileSystem.documentDirectory) {
          cacheDir = `${FileSystem.documentDirectory}offline_tiles/`;
          const dirInfo = await FileSystem.getInfoAsync(cacheDir);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(cacheDir, {
              intermediates: true,
            });
          }
        }
      } catch (docError) {
        logger.warn(
          "Document directory not accessible, falling back to cache directory:",
          docError
        );
        // Fallback to cache directory
        if (FileSystem.cacheDirectory) {
          cacheDir = `${FileSystem.cacheDirectory}offline_tiles/`;
          const dirInfo = await FileSystem.getInfoAsync(cacheDir);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(cacheDir, {
              intermediates: true,
            });
          }
        } else {
          throw new Error("No writable directory available for offline maps");
        }
      }

      // Update the cache directory path
      (this as any).TILE_CACHE_DIR = cacheDir;
      logger.info("OfflineMapService using cache directory:", cacheDir);

      // Load saved offline regions
      await this.loadOfflineRegions();

      // Check network connectivity to determine offline mode
      await this.checkConnectivity();
    } catch (error) {
      logger.error("Failed to initialize OfflineMapService:", error);
      // Don't crash the app, just disable offline functionality
      logger.warn("OfflineMapService disabled due to initialization failure");
    }
  }

  private async loadOfflineRegions() {
    try {
      const savedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (savedData) {
        const regions: OfflineRegion[] = JSON.parse(savedData);
        this._state.availableRegions = regions;
      }
    } catch (error) {
      logger.error("Failed to load offline regions:", error);
    }
  }

  private async saveOfflineRegions() {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(this._state.availableRegions)
      );
    } catch (error) {
      logger.error("Failed to save offline regions:", error);
    }
  }

  private async checkConnectivity(): Promise<boolean> {
    try {
      // Simple network check by trying to fetch a small resource
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("https://httpbin.org/status/200", {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const isOnline = response.ok;

      this._state._isOfflineMode = !isOnline;
      this.notifyStateChange();

      return isOnline;
    } catch (error) {
      this._state._isOfflineMode = true;
      this.notifyStateChange();
      return false;
    }
  }

  public async createOfflineRegion(
    name: string,
    bounds: [[number, number], [number, number]],
    minZoom: number = 10,
    maxZoom: number = 16,
    styleURL: string = "https://demotiles.maplibre.org/style.json"
  ): Promise<string> {
    const regionId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newRegion: OfflineRegion = {
      _id: regionId,
      _name: name,
      bounds,
      _minZoom: minZoom,
      _maxZoom: maxZoom,
      styleURL,
      downloadProgress: 0,
      isDownloaded: false,
      createdAt: new Date(),
    };

    this._state.availableRegions.push(newRegion);
    await this.saveOfflineRegions();
    this.notifyStateChange();

    return regionId;
  }

  public async downloadOfflineRegion(regionId: string): Promise<void> {
    const region = this._state.availableRegions.find((r) => r._id === regionId);
    if (!region) {
      throw new Error(`Offline region ${regionId} not found`);
    }

    if (this._state.downloadingRegions.has(regionId)) {
      throw new Error(`Region ${regionId} is already downloading`);
    }

    this._state.downloadingRegions.add(regionId);
    region.downloadProgress = 0;
    this.notifyStateChange();

    try {
      await this.downloadTilesForRegion(region);

      // Mark as downloaded
      region.isDownloaded = true;
      region.downloadProgress = 100;
      this._state.downloadingRegions.delete(regionId);

      await this.saveOfflineRegions();
      this.notifyStateChange();
    } catch (error) {
      this._state.downloadingRegions.delete(regionId);
      region.downloadProgress = 0;
      this.notifyStateChange();
      throw error;
    }
  }

  private async downloadTilesForRegion(region: OfflineRegion): Promise<void> {
    // Calculate total tiles to download
    const totalTiles = this.calculateTileCount(
      region.bounds,
      region._minZoom,
      region._maxZoom
    );
    let downloadedTiles = 0;

    const regionDir = `${this.TILE_CACHE_DIR}${region._id}/`;
    const dirInfo = await FileSystem.getInfoAsync(regionDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(regionDir, { intermediates: true });
    }

    // Download tiles for each zoom level
    for (let zoom = region._minZoom; zoom <= region._maxZoom; zoom++) {
      const tiles = this.getTilesInBounds(region.bounds, zoom);

      for (const tile of tiles) {
        try {
          await this.downloadTile(tile.x, tile.y, zoom, regionDir);
          downloadedTiles++;

          // Update progress
          region.downloadProgress = Math.round(
            (downloadedTiles / totalTiles) * 100
          );
          this.notifyStateChange();

          // Add small delay to prevent overwhelming the server
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (error) {
          logger.warn(
            `Failed to download tile ${tile.x}/${tile.y}/${zoom}:`,
            error
          );
        }
      }
    }
  }

  private async downloadTile(
    x: number,
    y: number,
    z: number,
    regionDir: string
  ): Promise<void> {
    const tileURL = `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
    const tilePath = `${regionDir}${z}_${x}_${y}.png`;

    const response = await fetch(tileURL);
    if (!response.ok) {
      throw new Error(`Failed to download tile: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    await FileSystem.writeAsStringAsync(tilePath, base64, {
      encoding: "base64" as any,
    });
  }

  private calculateTileCount(
    bounds: [[number, number], [number, number]],
    minZoom: number,
    maxZoom: number
  ): number {
    let totalTiles = 0;

    for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
      const tiles = this.getTilesInBounds(bounds, zoom);
      totalTiles += tiles.length;
    }

    return totalTiles;
  }

  private getTilesInBounds(
    bounds: [[number, number], [number, number]],
    zoom: number
  ): { x: number; y: number }[] {
    const [[minLng, minLat], [maxLng, maxLat]] = bounds;

    // Convert lat/lng to tile coordinates
    const minTileX = this.lngToTileX(minLng, zoom);
    const maxTileX = this.lngToTileX(maxLng, zoom);
    const minTileY = this.latToTileY(maxLat, zoom); // Note: lat is inverted for tiles
    const maxTileY = this.latToTileY(minLat, zoom);

    const tiles: { x: number; y: number }[] = [];

    for (let x = minTileX; x <= maxTileX; x++) {
      for (let y = minTileY; y <= maxTileY; y++) {
        tiles.push({ x, y });
      }
    }

    return tiles;
  }

  private lngToTileX(lng: number, zoom: number): number {
    return Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
  }

  private latToTileY(lat: number, zoom: number): number {
    return Math.floor(
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
        Math.pow(2, zoom)
    );
  }

  public async deleteOfflineRegion(regionId: string): Promise<void> {
    const regionIndex = this._state.availableRegions.findIndex(
      (r) => r._id === regionId
    );
    if (regionIndex === -1) {
      throw new Error(`Offline region ${regionId} not found`);
    }

    // Delete cached tiles
    const regionDir = `${this.TILE_CACHE_DIR}${regionId}/`;
    try {
      const dirInfo = await FileSystem.getInfoAsync(regionDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(regionDir);
      }
    } catch (error) {
      logger.warn(
        `Failed to delete cached tiles for region ${regionId}:`,
        error
      );
    }

    // Remove from state
    this._state.availableRegions.splice(regionIndex, 1);
    await this.saveOfflineRegions();
    this.notifyStateChange();
  }

  public async clearAllOfflineData(): Promise<void> {
    // Delete all cached tiles
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.TILE_CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.TILE_CACHE_DIR);
        await FileSystem.makeDirectoryAsync(this.TILE_CACHE_DIR, {
          intermediates: true,
        });
      }
    } catch (error) {
      logger.warn("Failed to clear tile cache directory:", error);
    }

    // Clear state
    this._state.availableRegions = [];
    this._state.downloadingRegions.clear();

    await this.saveOfflineRegions();
    this.notifyStateChange();
  }

  public getOfflineRegions(): OfflineRegion[] {
    return [...this._state.availableRegions];
  }

  public getOfflineMapState(): OfflineMapState {
    return { ...this._state };
  }

  public isRegionAvailableOffline(
    bounds: [[number, number], [number, number]]
  ): boolean {
    return this._state.availableRegions.some((region) => {
      // Check if the requested bounds are within any downloaded region
      const [[reqMinLng, reqMinLat], [reqMaxLng, reqMaxLat]] = bounds;
      const [[regionMinLng, regionMinLat], [regionMaxLng, regionMaxLat]] =
        region.bounds;

      return (
        region.isDownloaded &&
        reqMinLng >= regionMinLng &&
        reqMaxLng <= regionMaxLng &&
        reqMinLat >= regionMinLat &&
        reqMaxLat <= regionMaxLat
      );
    });
  }

  public async setOfflineMode(isOffline: boolean): Promise<void> {
    this._state._isOfflineMode = isOffline;
    this.notifyStateChange();
  }

  public async refreshConnectivity(): Promise<boolean> {
    return await this.checkConnectivity();
  }

  // Event listeners
  public addStateChangeListener(
    listener: (state: OfflineMapState) => void
  ): void {
    this.stateChangeListeners.push(listener);
  }

  public removeStateChangeListener(
    listener: (state: OfflineMapState) => void
  ): void {
    const index = this.stateChangeListeners.indexOf(listener);
    if (index > -1) {
      this.stateChangeListeners.splice(index, 1);
    }
  }

  private notifyStateChange(): void {
    this.stateChangeListeners.forEach((listener) => {
      try {
        listener(this.getOfflineMapState());
      } catch (error) {
        logger.error("Error in offline map state change listener:", error);
      }
    });
  }

  // Utility method to estimate storage usage
  public async getStorageUsage(): Promise<{
    totalSizeBytes: number;
    regionSizes: { [regionId: string]: number };
  }> {
    const regionSizes: { [regionId: string]: number } = {};
    let totalSizeBytes = 0;

    for (const region of this._state.availableRegions) {
      if (region.isDownloaded) {
        try {
          const regionDir = `${this.TILE_CACHE_DIR}${region._id}/`;
          const dirInfo = await FileSystem.getInfoAsync(regionDir);
          if (dirInfo.exists && dirInfo.isDirectory) {
            const files = await FileSystem.readDirectoryAsync(regionDir);
            let regionSize = 0;

            for (const file of files) {
              const fileInfo = await FileSystem.getInfoAsync(
                `${regionDir}${file}`
              );
              if (fileInfo.exists && !fileInfo.isDirectory) {
                regionSize += fileInfo.size || 0;
              }
            }

            regionSizes[region._id] = regionSize;
            totalSizeBytes += regionSize;

            // Update region size in memory
            region.sizeInBytes = regionSize;
          }
        } catch (error) {
          logger.warn(
            `Failed to calculate size for region ${region._id}:`,
            error
          );
        }
      }
    }

    await this.saveOfflineRegions();
    return { totalSizeBytes, regionSizes };
  }
}

export const offlineMapService = OfflineMapService.getInstance();
