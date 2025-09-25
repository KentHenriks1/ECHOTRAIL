/**
 * Enhanced Location Context Service
 * Advanced location context with seasonal, weather, time, and trail difficulty awareness
 * Created by: Kent Rune Henriksen
 */

// import * as Location from 'expo-location'; // Currently unused
import { Logger } from '../../core/utils';
import type { LocationContext, UserPreferences } from '../ai';
import type { Trail, TrackPoint } from '../api/TrailService';
import { locationContextService, LocationEnrichment } from './LocationContextService';

export interface SeasonalContext {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  seasonName: string; // Norwegian season name
  monthName: string; // Norwegian month name
  daylight: {
    sunrise: string;
    sunset: string;
    daylightHours: number;
    isDarkSeason: boolean; // Polar night consideration
    isLightSeason: boolean; // Midnight sun consideration
  };
  seasonalCharacteristics: string[];
  seasonalActivities: string[];
}

export interface TimeContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  norwegianTimePhrase: string;
  lighting: 'bright' | 'golden' | 'dim' | 'dark';
  atmosphere: string;
}

export interface WeatherContext {
  condition: string;
  temperature: number; // Celsius
  precipitation: number; // mm
  windSpeed: number; // m/s
  visibility: number; // km
  norwegianDescription: string;
  suitableForHiking: boolean;
  clothing: string[];
  precautions: string[];
}

export interface TrailDifficultyContext {
  level: 'easy' | 'moderate' | 'challenging' | 'expert';
  norwegianLevel: string;
  estimatedDuration: number; // minutes
  elevation: {
    gain: number; // meters
    max: number; // meters above sea level
  };
  terrain: string[];
  requirements: string[];
  warnings: string[];
}

export interface EnhancedLocationContext extends LocationContext {
  seasonal: SeasonalContext;
  timeContext: TimeContext;
  weather?: WeatherContext;
  trailDifficulty?: TrailDifficultyContext;
  culturalTraditions: string[];
  localEvents: string[];
  naturePhenomena: string[];
}

export class EnhancedLocationContextService {
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger('EnhancedLocationContextService');
  }

  /**
   * Build enhanced location context with seasonal and environmental awareness
   */
  async buildEnhancedLocationContext(
    latitude: number,
    longitude: number,
    trail?: Trail,
    trackPoints?: TrackPoint[],
    includeWeather: boolean = false
  ): Promise<EnhancedLocationContext> {
    try {
      // Get base location context
      const baseContext = await locationContextService.buildLocationContext(
        latitude, 
        longitude, 
        trail, 
        trackPoints
      );

      const enrichment = await locationContextService.getLocationEnrichment(latitude, longitude);

      // Build enhanced contexts
      const seasonal = this.buildSeasonalContext(latitude, longitude, new Date());
      const timeContext = this.buildTimeContext(new Date(), latitude);
      const weather = includeWeather ? await this.buildWeatherContext(latitude, longitude) : undefined;
      const trailDifficulty = trail ? this.buildTrailDifficultyContext(trail, trackPoints) : undefined;

      // Get cultural and natural context
      const culturalTraditions = this.getCulturalTraditions(enrichment, seasonal);
      const localEvents = this.getLocalEvents(enrichment, seasonal);
      const naturePhenomena = this.getNaturePhenomena(latitude, seasonal, timeContext);

      const enhancedContext: EnhancedLocationContext = {
        ...baseContext,
        seasonal,
        timeContext,
        weather,
        trailDifficulty,
        culturalTraditions,
        localEvents,
        naturePhenomena
      };

      this.logger.info('Enhanced location context built', {
        latitude,
        longitude,
        season: seasonal.season,
        timeOfDay: timeContext.timeOfDay,
        hasWeather: !!weather,
        hasTrail: !!trail
      });

      return enhancedContext;

    } catch (error) {
      this.logger.error('Failed to build enhanced location context', { error, latitude, longitude });
      
      // Fallback to basic context
      const baseContext = await locationContextService.buildLocationContext(latitude, longitude, trail, trackPoints);
      return {
        ...baseContext,
        seasonal: this.buildSeasonalContext(latitude, longitude, new Date()),
        timeContext: this.buildTimeContext(new Date(), latitude),
        culturalTraditions: ['Norsk friluftsliv', 'Naturglede'],
        localEvents: [],
        naturePhenomena: []
      };
    }
  }

  /**
   * Get enhanced user preferences based on context
   */
  getEnhancedUserPreferences(
    context: EnhancedLocationContext,
    basePreferences: UserPreferences
  ): UserPreferences {
    const enhanced: UserPreferences = { ...basePreferences };

    // Adjust based on season
    if (context.seasonal.season === 'winter') {
      enhanced.interests = [...(enhanced.interests || []), 'winter_activities', 'northern_lights', 'polar_night'];
      enhanced.voiceStyle = 'mystisk';
      enhanced.storyLength = 'lang'; // Longer stories for long winter nights
    } else if (context.seasonal.season === 'summer') {
      enhanced.interests = [...(enhanced.interests || []), 'midnight_sun', 'hiking', 'summer_festivals'];
      enhanced.voiceStyle = 'entusiastisk';
    } else if (context.seasonal.season === 'autumn') {
      enhanced.interests = [...(enhanced.interests || []), 'autumn_colors', 'harvest', 'preparation'];
      enhanced.voiceStyle = 'rolig';
    } else if (context.seasonal.season === 'spring') {
      enhanced.interests = [...(enhanced.interests || []), 'renewal', 'awakening', 'skiing', 'easter'];
      enhanced.voiceStyle = 'vennlig';
    }

    // Adjust based on time of day
    if (context.timeContext.timeOfDay === 'morning') {
      enhanced.interests = [...(enhanced.interests || []), 'fresh_start', 'sunrise', 'morning_activity'];
    } else if (context.timeContext.timeOfDay === 'evening') {
      enhanced.interests = [...(enhanced.interests || []), 'reflection', 'sunset', 'campfire_stories'];
      enhanced.voiceStyle = 'rolig';
    }

    // Adjust based on weather
    if (context.weather) {
      if (!context.weather.suitableForHiking) {
        enhanced.interests = [...(enhanced.interests || []), 'shelter', 'indoor_activities', 'safety'];
      } else if (context.weather.norwegianDescription.includes('sol')) {
        enhanced.interests = [...(enhanced.interests || []), 'sunshine', 'outdoor_activities', 'celebration'];
      }
    }

    // Adjust based on trail difficulty
    if (context.trailDifficulty) {
      if (context.trailDifficulty.level === 'challenging' || context.trailDifficulty.level === 'expert') {
        enhanced.interests = [...(enhanced.interests || []), 'achievement', 'endurance', 'mountain_climbing'];
        enhanced.storyLength = 'lang';
      }
    }

    return enhanced;
  }

  /**
   * Build seasonal context
   */
  private buildSeasonalContext(latitude: number, _longitude: number, date: Date): SeasonalContext {
    const month = date.getMonth(); // 0-11
    const dayOfYear = this.getDayOfYear(date);

    // Determine season (adjusted for northern hemisphere)
    let season: SeasonalContext['season'];
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'autumn';
    else season = 'winter';

    const seasonNames = {
      spring: 'vår',
      summer: 'sommer',
      autumn: 'høst',
      winter: 'vinter'
    };

    const monthNames = [
      'januar', 'februar', 'mars', 'april', 'mai', 'juni',
      'juli', 'august', 'september', 'oktober', 'november', 'desember'
    ];

    // Calculate daylight (simplified)
    const { sunrise, sunset, daylightHours } = this.calculateDaylight(latitude, dayOfYear);
    
    const seasonalCharacteristics = this.getSeasonalCharacteristics(season, latitude);
    const seasonalActivities = this.getSeasonalActivities(season);

    return {
      season,
      seasonName: seasonNames[season],
      monthName: monthNames[month],
      daylight: {
        sunrise,
        sunset,
        daylightHours,
        isDarkSeason: latitude > 66.5 && (month === 11 || month === 0 || month === 1),
        isLightSeason: latitude > 66.5 && (month >= 4 && month <= 7)
      },
      seasonalCharacteristics,
      seasonalActivities
    };
  }

  /**
   * Build time context
   */
  private buildTimeContext(date: Date, latitude: number): TimeContext {
    const hour = date.getHours();

    let timeOfDay: TimeContext['timeOfDay'];
    let norwegianTimePhrase: string;
    let lighting: TimeContext['lighting'];
    let atmosphere: string;

    if (hour >= 5 && hour < 10) {
      timeOfDay = 'morning';
      norwegianTimePhrase = 'tidlig på morgenen';
      lighting = 'bright';
      atmosphere = 'Frisk morgenluft og stillhet';
    } else if (hour >= 10 && hour < 17) {
      timeOfDay = 'afternoon';
      norwegianTimePhrase = 'midt på dagen';
      lighting = 'bright';
      atmosphere = 'Aktivitet og energi i lufta';
    } else if (hour >= 17 && hour < 22) {
      timeOfDay = 'evening';
      norwegianTimePhrase = 'på kvelden';
      lighting = 'golden';
      atmosphere = 'Rolig og reflekterende stemning';
    } else {
      timeOfDay = 'night';
      norwegianTimePhrase = 'på natten';
      lighting = 'dark';
      atmosphere = 'Mørket legger seg over landskapet';
    }

    // Adjust for polar conditions
    if (latitude > 66.5) {
      const month = date.getMonth();
      if (month === 11 || month === 0 || month === 1) {
        lighting = 'dark';
        atmosphere = 'Mørketiden preger landskapet';
      } else if (month >= 4 && month <= 7) {
        lighting = 'bright';
        atmosphere = 'Midnattsola lyser over alt';
      }
    }

    return {
      timeOfDay,
      norwegianTimePhrase,
      lighting,
      atmosphere
    };
  }

  /**
   * Build weather context (simplified - would use weather API in production)
   */
  private async buildWeatherContext(_latitude: number, _longitude: number): Promise<WeatherContext> {
    // This is a simplified version. In production, you'd call a weather API
    const mockWeather = this.generateMockWeather();

    return {
      condition: mockWeather.condition,
      temperature: mockWeather.temperature,
      precipitation: mockWeather.precipitation,
      windSpeed: mockWeather.windSpeed,
      visibility: mockWeather.visibility,
      norwegianDescription: mockWeather.norwegianDescription,
      suitableForHiking: mockWeather.suitableForHiking,
      clothing: mockWeather.clothing,
      precautions: mockWeather.precautions
    };
  }

  /**
   * Build trail difficulty context
   */
  private buildTrailDifficultyContext(trail: Trail, trackPoints?: TrackPoint[]): TrailDifficultyContext {
    // Calculate difficulty based on distance, elevation, etc.
    const distance = this.calculateDistance(trackPoints || trail.trackPoints || []);
    const elevation = this.calculateElevation(trackPoints || trail.trackPoints || []);
    
    let level: TrailDifficultyContext['level'] = 'easy';
    let norwegianLevel = 'Lett';

    if (distance > 10000 || elevation.gain > 500) {
      level = 'challenging';
      norwegianLevel = 'Krevende';
    } else if (distance > 5000 || elevation.gain > 200) {
      level = 'moderate';
      norwegianLevel = 'Moderat';
    }

    const estimatedDuration = Math.max(60, (distance / 1000) * 30 + (elevation.gain / 100) * 15);

    return {
      level,
      norwegianLevel,
      estimatedDuration,
      elevation,
      terrain: this.getTerrainTypes(elevation),
      requirements: this.getRequirements(level),
      warnings: this.getWarnings(level, elevation)
    };
  }

  // Helper methods

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private calculateDaylight(latitude: number, dayOfYear: number) {
    // Simplified daylight calculation
    const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180);
    const hourAngle = Math.acos(-Math.tan(latitude * Math.PI / 180) * Math.tan(declination * Math.PI / 180));
    const daylightHours = 2 * hourAngle * 12 / Math.PI;

    // Simplified sunrise/sunset (would be more complex in reality)
    const sunrise = `0${Math.floor(12 - daylightHours / 2)}:${String(Math.floor((12 - daylightHours / 2) % 1 * 60)).padStart(2, '0')}`;
    const sunset = `${Math.floor(12 + daylightHours / 2)}:${String(Math.floor((12 + daylightHours / 2) % 1 * 60)).padStart(2, '0')}`;

    return {
      sunrise: sunrise.length > 5 ? sunrise.substring(1) : sunrise,
      sunset,
      daylightHours: Math.round(daylightHours * 10) / 10
    };
  }

  private getSeasonalCharacteristics(season: SeasonalContext['season'], latitude: number): string[] {
    const characteristics = {
      spring: ['Snøsmelting', 'Vårtegn', 'Fuglenes hjemkomst', 'Lengre dager'],
      summer: ['Midnattsol', 'Høy aktivitet', 'Grønt landskap', 'Varme dager'],
      autumn: ['Høstfarger', 'Innhøsting', 'Migrasjon', 'Kortere dager'],
      winter: ['Snødekt landskap', 'Mørketid', 'Vintersport', 'Koselig innendørs']
    };

    let seasonal = characteristics[season];

    // Adjust for northern latitudes
    if (latitude > 66.5) {
      if (season === 'winter') {
        seasonal.push('Polarnatt', 'Nordlys', 'Ekstrem kulde');
      } else if (season === 'summer') {
        seasonal.push('Midnattsol', 'Aldri mørkt', 'Intens vekst');
      }
    }

    return seasonal;
  }

  private getSeasonalActivities(season: SeasonalContext['season']): string[] {
    const activities = {
      spring: ['Skitur', 'Påskeferie', 'Fuglekikking', 'Rydding'],
      summer: ['Fottur', 'Camping', 'Bading', 'Sykkel', 'Festival'],
      autumn: ['Bærplukking', 'Jakt', 'Sopp', 'Forberedelser'],
      winter: ['Skitur', 'Skøyter', 'Aketur', 'Inneaktiviteter']
    };

    return activities[season];
  }

  private getCulturalTraditions(enrichment: LocationEnrichment, seasonal: SeasonalContext): string[] {
    const traditions = ['Friluftsliv', 'Allemansretten'];

    // Add seasonal traditions
    if (seasonal.season === 'winter') {
      traditions.push('Juletradisjon', 'Vinteraktiviteter');
    } else if (seasonal.season === 'summer') {
      traditions.push('Sankt Hans', 'Sommerferie');
    }

    // Add regional traditions
    if (enrichment.region.county === 'Vestland') {
      traditions.push('Fisketradisjoner', 'Hanseatiisk historie');
    } else if (enrichment.region.county === 'Troms og Finnmark') {
      traditions.push('Samisk kultur', 'Reinsdyrdrift');
    }

    return traditions;
  }

  private getLocalEvents(enrichment: LocationEnrichment, seasonal: SeasonalContext): string[] {
    const events = [];

    if (seasonal.season === 'summer') {
      events.push('Sommerfestival', 'Utendørs konserter');
    } else if (seasonal.season === 'winter') {
      events.push('Vintermarked', 'Nordlysjakt');
    }

    // Add regional events
    if (enrichment.region.county === 'Oslo') {
      events.push('Kulturelle arrangementer', 'Byaktiviteter');
    }

    return events;
  }

  private getNaturePhenomena(latitude: number, seasonal: SeasonalContext, timeContext: TimeContext): string[] {
    const phenomena = [];

    if (latitude > 66.5) {
      if (seasonal.season === 'winter') {
        phenomena.push('Nordlys', 'Polarnatt', 'Ekstreme temperaturer');
      } else if (seasonal.season === 'summer') {
        phenomena.push('Midnattsol', 'Hvite netter');
      }
    }

    if (timeContext.timeOfDay === 'evening' && seasonal.season === 'autumn') {
      phenomena.push('Nordlys muligheter');
    }

    return phenomena;
  }

  private generateMockWeather(): any {
    // Mock weather data - would be replaced with real API call
    const conditions = ['sol', 'delvis skyet', 'overskyet', 'regn', 'snø'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
      condition,
      temperature: Math.floor(Math.random() * 25) - 5, // -5 to 20°C
      precipitation: Math.random() * 10,
      windSpeed: Math.random() * 15,
      visibility: 10 + Math.random() * 40,
      norwegianDescription: `${condition} med temperaturer rundt ${Math.floor(Math.random() * 25) - 5}°C`,
      suitableForHiking: condition !== 'regn' && condition !== 'snø',
      clothing: condition === 'sol' ? ['Lettere klær', 'Solbriller'] : ['Varme klær', 'Regntøy'],
      precautions: condition === 'regn' ? ['Glatte stier', 'Redusert sikt'] : []
    };
  }

  private calculateDistance(trackPoints: TrackPoint[]): number {
    if (trackPoints.length < 2) return 0;
    // Use the same calculation as in LocationContextService
    return 5000; // Mock value
  }

  private calculateElevation(trackPoints: TrackPoint[]): { gain: number; max: number } {
    if (trackPoints.length === 0) return { gain: 0, max: 0 };
    
    // Calculate elevation gain and max elevation
    let gain = 0;
    let max = 0;
    let lastElevation = trackPoints[0].altitude || 0;

    for (const point of trackPoints) {
      const elevation = point.altitude || 0;
      if (elevation > lastElevation) {
        gain += elevation - lastElevation;
      }
      if (elevation > max) {
        max = elevation;
      }
      lastElevation = elevation;
    }

    return { gain, max };
  }

  private getTerrainTypes(elevation: { gain: number; max: number }): string[] {
    const terrain = ['skog', 'sti'];
    
    if (elevation.max > 500) terrain.push('fjell');
    if (elevation.gain > 300) terrain.push('bratt');
    if (elevation.max > 1000) terrain.push('høyfjell');

    return terrain;
  }

  private getRequirements(level: TrailDifficultyContext['level']): string[] {
    const requirements = {
      easy: ['Grunnleggende utstyr', 'Normal kondisjon'],
      moderate: ['Godt utstyr', 'God kondisjon', 'Erfaring'],
      challenging: ['Profesjonelt utstyr', 'Utmerket kondisjon', 'Mye erfaring'],
      expert: ['Spesialisert utstyr', 'Ekspert kondisjon', 'Profesjonell erfaring']
    };

    return requirements[level];
  }

  private getWarnings(level: TrailDifficultyContext['level'], elevation: { gain: number; max: number }): string[] {
    const warnings = [];

    if (level === 'challenging' || level === 'expert') {
      warnings.push('Kun for erfarne', 'Væravhengig');
    }

    if (elevation.max > 1000) {
      warnings.push('Høyde kan påvirke', 'Værskifte mulig');
    }

    return warnings;
  }
}

// Export singleton instance
export const enhancedLocationContextService = new EnhancedLocationContextService();
export default enhancedLocationContextService;