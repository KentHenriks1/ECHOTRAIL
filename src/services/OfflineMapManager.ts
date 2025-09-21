import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "../utils/logger";

// Fallback for documentDirectory
const getDocumentDirectory = () => {
  try {
    return (
      (FileSystem as any).documentDirectory ||
      "file:///data/data/com.yourapp.name/files/"
    );
  } catch {
    return "file:///data/data/com.yourapp.name/files/";
  }
};
import { MapRegion } from "../components/maps/MapLibreView";

export interface OfflineMapRegion {
  _id: string;
  _name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  _minZoom: number;
  _maxZoom: number;
  downloadedAt: Date;
  size: number; // bytes
  tileCount: number;
  styleUrl: string;
}

export interface TileInfo {
  _x: number;
  _y: number;
  _z: number;
  url: string;
  filePath: string;
}

export interface DownloadProgress {
  _regionId: string;
  _downloaded: number;
  total: number;
  _percentage: number;
  speed: number; // tiles per second
  _estimatedTimeRemaining: number; // seconds
}

export interface OfflineMapStyle {
  id: string;
  name: string;
  url: string;
  description: string;
  thumbnail?: string;
}

class OfflineMapManager {
  private baseDirectory = `${getDocumentDirectory()}offline_maps/`;
  private tilesDirectory = `${this.baseDirectory}tiles/`;
  private stylesDirectory = `${this.baseDirectory}styles/`;
  private downloadQueue: TileInfo[] = [];
  private isDownloading = false;
  private currentDownload: DownloadProgress | null = null;
  private downloadCallbacks: ((_progress: DownloadProgress) => void)[] = [];
  private abortController: AbortController | null = null;

  private availableStyles: OfflineMapStyle[] = [
    {
      id: "streets",
      name: "Streets",
      url: "https://api.maptiler.com/maps/streets/style.json?key=demo",
      description: "Standard street map with roads and labels",
    },
    {
      id: "streets-dark",
      name: "Streets Dark",
      url: "https://api.maptiler.com/maps/streets-dark/style.json?key=demo",
      description: "Dark theme street map",
    },
    {
      id: "outdoor",
      name: "Outdoor",
      url: "https://api.maptiler.com/maps/outdoor/style.json?key=demo",
      description: "Outdoor style with terrain and hiking trails",
    },
    {
      id: "satellite",
      name: "Satellite",
      url: "https://api.maptiler.com/maps/satellite/style.json?key=demo",
      description: "High-resolution satellite imagery",
    },
    {
      id: "terrain",
      name: "Terrain",
      url: "https://api.maptiler.com/maps/terrain/style.json?key=demo",
      description: "Detailed topographic map with elevation data",
    },
  ];

  async initialize(): Promise<void> {
    try {
      // Ensure directories exist
      await FileSystem.makeDirectoryAsync(this.baseDirectory, {
        intermediates: true,
      });
      await FileSystem.makeDirectoryAsync(this.tilesDirectory, {
        intermediates: true,
      });
      await FileSystem.makeDirectoryAsync(this.stylesDirectory, {
        intermediates: true,
      });

      // Clean up incomplete downloads
      await this.cleanupIncompleteDownloads();
    } catch (error) {
      logger.warn("Failed to initialize OfflineMapManager:", error);
    }
  }

  /**
   * Download map region for offline use
   */
  async downloadRegion(
    regionId: string,
    name: string,
    bounds: OfflineMapRegion["bounds"],
    minZoom: number = 10,
    maxZoom: number = 16,
    styleId: string = "outdoor"
  ): Promise<void> {
    if (this.isDownloading) {
      throw new Error("Another download is already in progress");
    }

    const style = this.availableStyles.find((s) => s.id === styleId);
    if (!style) {
      throw new Error(`Unknown style: ${styleId}`);
    }

    this.isDownloading = true;
    this.abortController = new AbortController();

    try {
      // Calculate tiles needed
      const tiles = this.calculateTileList(bounds, minZoom, maxZoom);

      this.currentDownload = {
        _regionId: regionId,
        _downloaded: 0,
        total: tiles.length,
        _percentage: 0,
        speed: 0,
        _estimatedTimeRemaining: 0,
      };

      // Download style first
      await this.downloadStyle(style);

      // Download tiles
      const startTime = Date.now();
      let downloadedCount = 0;

      for (let i = 0; i < tiles.length; i++) {
        if (this.abortController?.signal.aborted) {
          throw new Error("Download cancelled");
        }

        const tile = tiles[i];
        await this.downloadTile(tile);
        downloadedCount++;

        // Update progress
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = downloadedCount / elapsed;
        const remaining = tiles.length - downloadedCount;
        const estimatedTimeRemaining = remaining / speed;

        this.currentDownload = {
          _regionId: regionId,
          _downloaded: downloadedCount,
          total: tiles.length,
          _percentage: (downloadedCount / tiles.length) * 100,
          speed,
          _estimatedTimeRemaining: estimatedTimeRemaining,
        };

        // Notify progress callbacks
        this.downloadCallbacks.forEach((callback) => {
          callback(this.currentDownload!);
        });

        // Small delay to prevent overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Save region metadata
      const region: OfflineMapRegion = {
        _id: regionId,
        _name: name,
        bounds,
        _minZoom: minZoom,
        _maxZoom: maxZoom,
        downloadedAt: new Date(),
        size: await this.calculateRegionSize(regionId),
        tileCount: tiles.length,
        styleUrl: style.url,
      };

      await this.saveRegionMetadata(region);
    } finally {
      this.isDownloading = false;
      this.currentDownload = null;
      this.abortController = null;
    }
  }

  /**
   * Cancel current download
   */
  cancelDownload(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Get list of downloaded regions
   */
  async getDownloadedRegions(): Promise<OfflineMapRegion[]> {
    try {
      const regionsData = await AsyncStorage.getItem("offline_map_regions");
      if (!regionsData) return [];

      const regions = JSON.parse(regionsData);
      return regions.map((region: any) => ({
        ...region,
        downloadedAt: new Date(region.downloadedAt),
      }));
    } catch (error) {
      logger.warn("Failed to get downloaded regions:", error);
      return [];
    }
  }

  /**
   * Delete downloaded region
   */
  async deleteRegion(regionId: string): Promise<void> {
    try {
      // Delete tiles
      const regionDir = `${this.tilesDirectory}${regionId}/`;
      const dirInfo = await FileSystem.getInfoAsync(regionDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(regionDir);
      }

      // Update metadata
      const regions = await this.getDownloadedRegions();
      const filteredRegions = regions.filter((r) => r._id !== regionId);
      await AsyncStorage.setItem(
        "offline_map_regions",
        JSON.stringify(filteredRegions)
      );
    } catch (error) {
      logger.warn("Failed to delete region:", error);
    }
  }

  /**
   * Get offline storage usage
   */
  async getStorageUsage(): Promise<{ totalSize: number; regionCount: number }> {
    try {
      const regions = await this.getDownloadedRegions();
      const totalSize = regions.reduce((sum, region) => sum + region.size, 0);

      return {
        totalSize,
        regionCount: regions.length,
      };
    } catch (error) {
      logger.warn("Failed to get storage usage:", error);
      return { totalSize: 0, regionCount: 0 };
    }
  }

  /**
   * Clear all offline maps
   */
  async clearAllOfflineMaps(): Promise<void> {
    try {
      // Delete tiles directory
      const tilesInfo = await FileSystem.getInfoAsync(this.tilesDirectory);
      if (tilesInfo.exists) {
        await FileSystem.deleteAsync(this.tilesDirectory);
        await FileSystem.makeDirectoryAsync(this.tilesDirectory, {
          intermediates: true,
        });
      }

      // Clear metadata
      await AsyncStorage.removeItem("offline_map_regions");
    } catch (error) {
      logger.warn("Failed to clear offline maps:", error);
    }
  }

  /**
   * Check if region is available offline
   */
  async isRegionAvailableOffline(
    region: MapRegion,
    styleId: string = "outdoor"
  ): Promise<boolean> {
    try {
      const downloadedRegions = await this.getDownloadedRegions();

      return downloadedRegions.some((offlineRegion) => {
        return (
          region.latitude >= offlineRegion.bounds.south &&
          region.latitude <= offlineRegion.bounds.north &&
          region.longitude >= offlineRegion.bounds.west &&
          region.longitude <= offlineRegion.bounds.east &&
          offlineRegion.styleUrl.includes(styleId)
        );
      });
    } catch (error) {
      logger.warn("Failed to check region availability:", error);
      return false;
    }
  }

  /**
   * Get offline tile URL for a specific tile
   */
  async getOfflineTileUrl(
    x: number,
    y: number,
    z: number,
    regionId: string
  ): Promise<string | null> {
    try {
      const tilePath = `${this.tilesDirectory}${regionId}/${z}/${x}/${y}.png`;
      const tileInfo = await FileSystem.getInfoAsync(tilePath);

      if (tileInfo.exists) {
        return tilePath;
      }

      return null;
    } catch (error) {
      logger.warn("Failed to get offline tile URL:", error);
      return null;
    }
  }

  /**
   * Generate offline map style JSON with local tile sources
   */
  async generateOfflineStyle(
    regionId: string,
    baseStyle: OfflineMapStyle
  ): Promise<string> {
    try {
      // Download and modify the base style
      const response = await fetch(baseStyle.url);
      const styleJson = await response.json();

      // Replace tile URLs with local file paths
      if (styleJson.sources) {
        Object.keys(styleJson.sources).forEach((sourceKey) => {
          const source = styleJson.sources[sourceKey];
          if (source.type === "raster" || source.type === "vector") {
            // Replace with local tile template
            source.tiles = [
              `file://${this.tilesDirectory}${regionId}/{z}/{x}/{y}.png`,
            ];
          }
        });
      }

      // Save modified style
      const stylePath = `${this.stylesDirectory}${regionId}_${baseStyle.id}.json`;
      await FileSystem.writeAsStringAsync(stylePath, JSON.stringify(styleJson));

      return stylePath;
    } catch (error) {
      logger.warn("Failed to generate offline style:", error);
      throw error;
    }
  }

  /**
   * Subscribe to download progress
   */
  onDownloadProgress(
    callback: (_progress: DownloadProgress) => void
  ): () => void {
    this.downloadCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.downloadCallbacks.indexOf(callback);
      if (index > -1) {
        this.downloadCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get available map styles
   */
  getAvailableStyles(): OfflineMapStyle[] {
    return [...this.availableStyles];
  }

  /**
   * Private helper methods
   */
  private calculateTileList(
    bounds: OfflineMapRegion["bounds"],
    minZoom: number,
    maxZoom: number
  ): TileInfo[] {
    const tiles: TileInfo[] = [];

    for (let z = minZoom; z <= maxZoom; z++) {
      const minX = Math.floor(((bounds.west + 180) / 360) * Math.pow(2, z));
      const maxX = Math.floor(((bounds.east + 180) / 360) * Math.pow(2, z));

      const minY = Math.floor(
        ((1 -
          Math.log(
            Math.tan((bounds.north * Math.PI) / 180) +
              1 / Math.cos((bounds.north * Math.PI) / 180)
          ) /
            Math.PI) /
          2) *
          Math.pow(2, z)
      );
      const maxY = Math.floor(
        ((1 -
          Math.log(
            Math.tan((bounds.south * Math.PI) / 180) +
              1 / Math.cos((bounds.south * Math.PI) / 180)
          ) /
            Math.PI) /
          2) *
          Math.pow(2, z)
      );

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          tiles.push({
            _x: x,
            _y: y,
            _z: z,
            url: `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
            filePath: `${this.tilesDirectory}regionId/${z}/${x}/${y}.png`,
          });
        }
      }
    }

    return tiles;
  }

  private async downloadTile(tile: TileInfo): Promise<void> {
    try {
      const tileDir = `${this.tilesDirectory}${this.currentDownload?._regionId}/${tile._z}/${tile._x}/`;
      await FileSystem.makeDirectoryAsync(tileDir, { intermediates: true });

      const tilePath = `${tileDir}${tile._y}.png`;

      // Check if tile already exists
      const tileInfo = await FileSystem.getInfoAsync(tilePath);
      if (tileInfo.exists) {
        return;
      }

      // Download tile
      const downloadResult = await FileSystem.downloadAsync(tile.url, tilePath);

      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download tile: ${downloadResult.status}`);
      }
    } catch (error) {
      logger.warn(
        `Failed to download tile ${tile._z}/${tile._x}/${tile._y}:`,
        error
      );
      // Continue with other tiles even if one fails
    }
  }

  private async downloadStyle(style: OfflineMapStyle): Promise<void> {
    try {
      const stylePath = `${this.stylesDirectory}${style.id}.json`;

      // Check if style already exists
      const styleInfo = await FileSystem.getInfoAsync(stylePath);
      if (styleInfo.exists) {
        return;
      }

      // Download and save style
      await FileSystem.downloadAsync(style.url, stylePath);
    } catch (error) {
      logger.warn(`Failed to download style ${style.id}:`, error);
    }
  }

  private async saveRegionMetadata(region: OfflineMapRegion): Promise<void> {
    try {
      const existingRegions = await this.getDownloadedRegions();
      const filteredRegions = existingRegions.filter(
        (r) => r._id !== region._id
      );
      const updatedRegions = [...filteredRegions, region];

      await AsyncStorage.setItem(
        "offline_map_regions",
        JSON.stringify(updatedRegions)
      );
    } catch (error) {
      logger.warn("Failed to save region metadata:", error);
    }
  }

  private async calculateRegionSize(regionId: string): Promise<number> {
    try {
      const regionDir = `${this.tilesDirectory}${regionId}/`;
      const files = await this.getFilesRecursively(regionDir);

      let totalSize = 0;
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(file);
        if (fileInfo.exists && !fileInfo.isDirectory) {
          totalSize += fileInfo.size || 0;
        }
      }

      return totalSize;
    } catch (error) {
      logger.warn("Failed to calculate region size:", error);
      return 0;
    }
  }

  private async getFilesRecursively(directory: string): Promise<string[]> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(directory);
      if (!dirInfo.exists || !dirInfo.isDirectory) {
        return [];
      }

      const files: string[] = [];
      const dirContents = await FileSystem.readDirectoryAsync(directory);

      for (const item of dirContents) {
        const itemPath = `${directory}${item}`;
        const itemInfo = await FileSystem.getInfoAsync(itemPath);

        if (itemInfo.isDirectory) {
          const subFiles = await this.getFilesRecursively(`${itemPath}/`);
          files.push(...subFiles);
        } else {
          files.push(itemPath);
        }
      }

      return files;
    } catch (error) {
      logger.warn("Failed to read directory recursively:", error);
      return [];
    }
  }

  private async cleanupIncompleteDownloads(): Promise<void> {
    try {
      // This is a simple cleanup - in a real app, you might want more sophisticated logic
      // to detect and handle incomplete downloads
      const regions = await this.getDownloadedRegions();

      for (const region of regions) {
        const regionDir = `${this.tilesDirectory}${region._id}/`;
        const dirInfo = await FileSystem.getInfoAsync(regionDir);

        if (!dirInfo.exists) {
          // Region metadata exists but no tiles - remove metadata
          await this.deleteRegion(region._id);
        }
      }
    } catch (error) {
      logger.warn("Failed to cleanup incomplete downloads:", error);
    }
  }

  /**
   * Estimate download size for a region
   */
  estimateDownloadSize(
    bounds: OfflineMapRegion["bounds"],
    minZoom: number,
    maxZoom: number
  ): { tileCount: number; estimatedSize: number } {
    const tiles = this.calculateTileList(bounds, minZoom, maxZoom);
    const averageTileSize = 15000; // bytes (rough estimate)

    return {
      tileCount: tiles.length,
      estimatedSize: tiles.length * averageTileSize,
    };
  }

  /**
   * Get current download status
   */
  getCurrentDownload(): DownloadProgress | null {
    return this.currentDownload ? { ...this.currentDownload } : null;
  }

  /**
   * Check if a download is in progress
   */
  isDownloadInProgress(): boolean {
    return this.isDownloading;
  }
}

export default new OfflineMapManager();
