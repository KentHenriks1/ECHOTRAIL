/**
 * Location Context Service for EchoTrail
 * Converts GPS coordinates and location data into rich AI context
 * Created by: Kent Rune Henriksen
 */

import * as Location from 'expo-location';
import { Logger } from '../../core/utils';
import type { LocationContext, UserPreferences } from '../ai/OpenAIService';
import type { Trail, TrackPoint } from '../api/TrailService';

export interface LocationEnrichment {
  address: string;
  nearbyPlaces: string[];
  historicalContext: string;
  culturalContext: string;
  localTerminology: string[];
  region: {
    municipality: string;
    county: string;
    country: string;
  };
}

export class LocationContextService {
  private readonly logger: Logger;
  private readonly geocodingCache = new Map<string, LocationEnrichment>();

  constructor() {
    this.logger = new Logger('LocationContextService');
  }

  /**
   * Build LocationContext from GPS coordinates and trail data
   */
  async buildLocationContext(
    latitude: number,
    longitude: number,
    trail?: Trail,
    trackPoints?: TrackPoint[]
  ): Promise<LocationContext> {
    try {
      const enrichment = await this.enrichLocation(latitude, longitude);
      
      const locationContext: LocationContext = {
        latitude,
        longitude,
        address: enrichment.address,
        nearbyPlaces: enrichment.nearbyPlaces,
        historicalContext: enrichment.historicalContext,
        trail: trail ? {
          id: trail.id,
          name: trail.name,
          trackPoints: trackPoints || trail.trackPoints || [],
          distance: this.calculateTrailDistance(trackPoints || trail.trackPoints || []),
          duration: this.calculateTrailDuration(trackPoints || trail.trackPoints || [])
        } : undefined
      };

      this.logger.info('Location context built', {
        latitude,
        longitude,
        address: enrichment.address,
        nearbyPlacesCount: enrichment.nearbyPlaces.length,
        hasTrail: !!trail
      });

      return locationContext;
    } catch (error) {
      this.logger.error('Failed to build location context', { error, latitude, longitude });
      
      // Fallback context
      return {
        latitude,
        longitude,
        address: this.getGenericLocationName(latitude, longitude),
        nearbyPlaces: [],
        historicalContext: 'Et vakkert sted i det norske landskapet',
        trail: trail ? {
          id: trail.id,
          name: trail.name,
          trackPoints: trackPoints || trail.trackPoints || [],
          distance: this.calculateTrailDistance(trackPoints || trail.trackPoints || []),
          duration: this.calculateTrailDuration(trackPoints || trail.trackPoints || [])
        } : undefined
      };
    }
  }

  /**
   * Enrich location with detailed information
   */
  private async enrichLocation(latitude: number, longitude: number): Promise<LocationEnrichment> {
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    
    // Check cache first
    if (this.geocodingCache.has(cacheKey)) {
      return this.geocodingCache.get(cacheKey)!;
    }

    try {
      // Reverse geocoding with Expo Location
      const geocodeResult = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (geocodeResult.length === 0) {
        throw new Error('No geocoding results');
      }

      const address = geocodeResult[0];
      const enrichment = await this.processGeocodingResult(address, latitude, longitude);
      
      // Cache the result
      this.geocodingCache.set(cacheKey, enrichment);
      
      return enrichment;
    } catch (error) {
      this.logger.warn('Geocoding failed, using fallback enrichment', { error });
      return this.getFallbackEnrichment(latitude, longitude);
    }
  }

  /**
   * Process geocoding result into enriched location data
   */
  private async processGeocodingResult(
    address: Location.LocationGeocodedAddress,
    latitude: number,
    longitude: number
  ): Promise<LocationEnrichment> {
    const formattedAddress = this.formatNorwegianAddress(address);
    const region = this.extractRegion(address);
    
    // Generate Norwegian-specific context
    const nearbyPlaces = await this.findNearbyPlaces(latitude, longitude, region);
    const historicalContext = this.generateHistoricalContext(region, address);
    const culturalContext = this.generateCulturalContext(region);
    const localTerminology = this.getLocalTerminology(region);

    return {
      address: formattedAddress,
      nearbyPlaces,
      historicalContext,
      culturalContext,
      localTerminology,
      region
    };
  }

  /**
   * Format address for Norwegian context
   */
  private formatNorwegianAddress(address: Location.LocationGeocodedAddress): string {
    const parts: string[] = [];
    
    if (address.name) parts.push(address.name);
    if (address.street) parts.push(address.street);
    if (address.district && address.district !== address.city) parts.push(address.district);
    if (address.city) parts.push(address.city);
    if (address.region && address.region !== address.city) parts.push(address.region);
    if (address.country === 'Norway' || address.country === 'Norge') {
      if (!parts.join(', ').includes('Norge')) parts.push('Norge');
    }

    return parts.length > 0 ? parts.join(', ') : 'Ukjent lokasjon i Norge';
  }

  /**
   * Extract Norwegian administrative regions
   */
  private extractRegion(address: Location.LocationGeocodedAddress): LocationEnrichment['region'] {
    return {
      municipality: address.city || address.district || 'Ukjent kommune',
      county: address.region || this.inferCountyFromCity(address.city ?? undefined),
      country: address.country === 'Norway' ? 'Norge' : (address.country || 'Norge')
    };
  }

  /**
   * Infer Norwegian county from city name
   */
  private inferCountyFromCity(city?: string): string {
    if (!city) return 'Ukjent fylke';
    
    const countyMap: Record<string, string> = {
      'Oslo': 'Oslo',
      'Bergen': 'Vestland',
      'Trondheim': 'Trøndelag',
      'Stavanger': 'Rogaland',
      'Kristiansand': 'Agder',
      'Drammen': 'Buskerud',
      'Fredrikstad': 'Østfold',
      'Sandnes': 'Rogaland',
      'Tromsø': 'Troms og Finnmark',
      'Sarpsborg': 'Østfold',
      'Skien': 'Telemark',
      'Ålesund': 'Møre og Romsdal',
      'Sandefjord': 'Vestfold',
      'Haugesund': 'Rogaland',
      'Tønsberg': 'Vestfold',
      'Moss': 'Østfold',
      'Arendal': 'Agder',
      'Bodø': 'Nordland',
      'Molde': 'Møre og Romsdal'
    };

    return countyMap[city] || 'Ukjent fylke';
  }

  /**
   * Find nearby places of interest
   */
  private async findNearbyPlaces(
    latitude: number,
    longitude: number,
    region: LocationEnrichment['region']
  ): Promise<string[]> {
    // This could be enhanced with actual POI data or APIs
    const places: string[] = [];
    
    // Add region-specific landmarks
    const landmarks = this.getRegionalLandmarks(region);
    places.push(...landmarks);
    
    // Add generic Norwegian outdoor features
    const outdoorFeatures = this.generateOutdoorFeatures(latitude, longitude);
    places.push(...outdoorFeatures);
    
    return places.slice(0, 5); // Limit to 5 most relevant
  }

  /**
   * Get regional landmarks
   */
  private getRegionalLandmarks(region: LocationEnrichment['region']): string[] {
    const landmarks: Record<string, string[]> = {
      'Oslo': ['Slottet', 'Stortinget', 'Operahuset', 'Vigelandsparken', 'Akershus festning'],
      'Vestland': ['Bryggen', 'Fløyen', 'Ulriken', 'Hardangerfjorden', 'Preikestolen'],
      'Trøndelag': ['Nidarosdomen', 'Gamle Bybro', 'Kristiansten festning', 'Munkholmen'],
      'Rogaland': ['Preikestolen', 'Kjerag', 'Lysefjorden', 'Flor og Fjære'],
      'Nordland': ['Lofoten', 'Saltstraumen', 'Svartisen', 'Helgelandskysten'],
      'Agder': ['Lindesnes fyr', 'Kristiansand dyrepark', 'Skjærgården'],
      'Møre og Romsdal': ['Geirangerfjorden', 'Trollstigen', 'Ålesund sentrum'],
      'Troms og Finnmark': ['Nordkapp', 'Tromsø ishavskatedrale', 'Nordlyset'],
    };

    return landmarks[region.county] || [];
  }

  /**
   * Generate outdoor features based on location
   */
  private generateOutdoorFeatures(latitude: number, longitude: number): string[] {
    const features: string[] = [];
    
    // Mountain areas (simplified logic)
    if (latitude > 60.5 && latitude < 62.0) {
      features.push('Dovrefjell', 'Jotunheimen');
    } else if (latitude > 59.0 && latitude < 60.5) {
      features.push('Hardangervidda', 'Hallingskarvet');
    } else if (latitude > 68.0) {
      features.push('Finnmarksvidda', 'Svalbard');
    }
    
    // Coastal areas
    if (longitude < 8.0 && latitude < 63.0) {
      features.push('Nordsjøen', 'Skjærgården');
    } else if (latitude > 63.0) {
      features.push('Norskehavet', 'Lofoten');
    }
    
    return features;
  }

  /**
   * Generate historical context
   */
  private generateHistoricalContext(
    region: LocationEnrichment['region'],
    _address: Location.LocationGeocodedAddress
  ): string {
    const contexts = [
      `Et område rikt på norsk historie og kultur i ${region.county}`,
      `Del av det tradisjonelle landskapet som har formet norsk identitet gjennom århundrer`,
      `Område hvor nordmenn har vandret og bygget samfunn i generasjoner`,
      `Landskap som har inspirert norske eventyr og folkefortellinger`,
      `Del av Norge hvor naturen og kulturen har vokst sammen over tid`
    ];

    // Add region-specific context
    if (region.county === 'Oslo') {
      return 'Norges hovedstad og historiske sentrum, hvor moderne Norge ble født';
    } else if (region.county === 'Vestland') {
      return 'Område rikt på fjorder og fjell, hjemsted for vikingtradisjoner og hanseatiisk handel';
    } else if (region.county === 'Trøndelag') {
      return 'Historisk hjerte av Norge, hvor konger ble kronet og kristendommen fikk fotfeste';
    }

    return contexts[Math.floor(Math.random() * contexts.length)];
  }

  /**
   * Generate cultural context
   */
  private generateCulturalContext(region: LocationEnrichment['region']): string {
    const contexts = [
      `Tradisjonell ${region.county.toLowerCase()} kultur med særegne skikker og tradisjoner`,
      `Område kjent for sitt unike bidrag til norsk kulturarv`,
      `Del av Norge med sterke røtter i folkekultur og naturglede`,
      `Region hvor friluftsliv og samfunnsliv møtes i harmoni`
    ];

    return contexts[Math.floor(Math.random() * contexts.length)];
  }

  /**
   * Get local terminology
   */
  private getLocalTerminology(region: LocationEnrichment['region']): string[] {
    const commonTerms = ['fjell', 'dal', 'elv', 'sjø', 'skog', 'mark', 'sti', 'løype'];
    const regionalTerms: Record<string, string[]> = {
      'Vestland': ['fjord', 'foss', 'seter', 'vidde', 'juv'],
      'Nordland': ['øy', 'sund', 'nes', 'vær', 'rorbuer'],
      'Trøndelag': ['høgda', 'myr', 'skar', 'kolle'],
      'Oslo': ['ås', 'koll', 'tjern', 'marka'],
      'Troms og Finnmark': ['vidde', 'varanger', 'tundra', 'polarsirkelen']
    };

    return [...commonTerms, ...(regionalTerms[region.county] || [])];
  }

  /**
   * Fallback enrichment for when geocoding fails
   */
  private getFallbackEnrichment(latitude: number, longitude: number): LocationEnrichment {
    return {
      address: this.getGenericLocationName(latitude, longitude),
      nearbyPlaces: ['Norsk natur', 'Fjellandskap', 'Naturområde'],
      historicalContext: 'Et vakkert område i det norske landskapet med rik historie',
      culturalContext: 'Del av den norske naturen som har formet vår kulturarv',
      localTerminology: ['fjell', 'skog', 'natur', 'sti', 'løype'],
      region: {
        municipality: 'Ukjent kommune',
        county: this.getCountyFromCoordinates(latitude, longitude),
        country: 'Norge'
      }
    };
  }

  /**
   * Generate generic location name from coordinates
   */
  private getGenericLocationName(latitude: number, longitude: number): string {
    return `Lokasjon ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
  }

  /**
   * Rough county estimation from coordinates (simplified)
   */
  private getCountyFromCoordinates(latitude: number, longitude: number): string {
    if (latitude >= 59.8 && latitude <= 60.0 && longitude >= 10.5 && longitude <= 11.0) {
      return 'Oslo';
    } else if (latitude >= 60.3 && latitude <= 60.4 && longitude >= 5.2 && longitude <= 5.4) {
      return 'Vestland';
    } else if (latitude >= 63.4 && latitude <= 63.5 && longitude >= 10.3 && longitude <= 10.5) {
      return 'Trøndelag';
    } else if (latitude >= 69.0) {
      return 'Troms og Finnmark';
    }
    
    return 'Ukjent fylke';
  }

  /**
   * Calculate trail distance from track points
   */
  private calculateTrailDistance(trackPoints: TrackPoint[]): number {
    if (trackPoints.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      const prev = trackPoints[i - 1];
      const curr = trackPoints[i];
      
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (prev.coordinate.latitude * Math.PI) / 180;
      const φ2 = (curr.coordinate.latitude * Math.PI) / 180;
      const Δφ = ((curr.coordinate.latitude - prev.coordinate.latitude) * Math.PI) / 180;
      const Δλ = ((curr.coordinate.longitude - prev.coordinate.longitude) * Math.PI) / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      totalDistance += R * c;
    }

    return totalDistance;
  }

  /**
   * Calculate trail duration from track points
   */
  private calculateTrailDuration(trackPoints: TrackPoint[]): number {
    if (trackPoints.length < 2) return 0;

    const startTime = new Date(trackPoints[0].timestamp).getTime();
    const endTime = new Date(trackPoints[trackPoints.length - 1].timestamp).getTime();
    
    return (endTime - startTime) / 1000; // Duration in seconds
  }

  /**
   * Get location enrichment data (public method)
   */
  async getLocationEnrichment(latitude: number, longitude: number): Promise<LocationEnrichment> {
    return await this.enrichLocation(latitude, longitude);
  }

  /**
   * Get suggested user preferences based on location
   */
  getSuggestedPreferences(region: LocationEnrichment['region']): UserPreferences {
    const basePreferences: UserPreferences = {
      interests: ['nature', 'hiking', 'history'],
      language: 'nb',
      storyLength: 'medium',
      voiceStyle: 'vennlig'
    };

    // Customize based on region
    if (region.county === 'Vestland') {
      basePreferences.interests = ['fjords', 'mountains', 'viking_history', 'hanseatic_league'];
      basePreferences.voiceStyle = 'mystisk';
    } else if (region.county === 'Trøndelag') {
      basePreferences.interests = ['medieval_history', 'pilgrimage', 'royal_history', 'culture'];
    } else if (region.county === 'Nordland') {
      basePreferences.interests = ['arctic', 'midnight_sun', 'fishing', 'sami_culture'];
      basePreferences.voiceStyle = 'mystisk';
    } else if (region.county === 'Oslo') {
      basePreferences.interests = ['urban_history', 'royal_history', 'modern_norway', 'architecture'];
      basePreferences.storyLength = 'kort';
    }

    return basePreferences;
  }

  /**
   * Clear geocoding cache (for testing or memory management)
   */
  clearCache(): void {
    this.geocodingCache.clear();
    this.logger.info('Geocoding cache cleared');
  }
}

// Export singleton instance
export const locationContextService = new LocationContextService();
export default locationContextService;