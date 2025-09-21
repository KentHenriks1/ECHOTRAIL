import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "../utils/logger";

interface Interest {
  id: string;
  name: string;
}

interface StoryContent {
  _title: string;
  _content: string;
  backgroundMusic: string;
  _duration: number;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  metadata: {
    difficulty: string;
    theme: string;
    historicalAccuracy: string;
  };
}

interface LocationContext {
  country: string;
  region: string;
  city: string;
  nearbyLandmarks: string[];
  historicalPeriod?: string;
  culturalContext?: string;
}

interface UserProfile {
  preferredLanguage: string;
  storytellingStyle: string;
  _interests: string[];
  previousStories: string[];
}

class AIStoryService {
  private storiesDatabase: Map<string, StoryContent[]> = new Map();
  private locationContextCache: Map<string, LocationContext> = new Map();

  constructor() {
    this.initializeStoriesDatabase();
  }

  /**
   * Generate a personalized story based on GPS location and user interests
   */
  async generateStory(
    location: Location.LocationObject,
    interests: Interest[],
    userProfile?: UserProfile
  ): Promise<StoryContent> {
    try {
      const locationContext = await this.getLocationContext(location);
      const relevantInterests = this.filterRelevantInterests(
        interests,
        locationContext
      );

      // In a real implementation, this would call an AI service like OpenAI GPT
      // For now, we'll use a sophisticated template-based approach
      const story = await this.generateLocationBasedStory(
        location,
        locationContext,
        relevantInterests,
        userProfile
      );

      // Cache the story for offline use
      await this.cacheStory(location, story);

      return story;
    } catch (error) {
      logger.error("Error generating AI story:", error);
      // Fallback to cached stories if AI service fails
      return await this.getFallbackStory(location, interests);
    }
  }

  /**
   * Get location context including nearby landmarks and historical information
   */
  private async getLocationContext(
    location: Location.LocationObject
  ): Promise<LocationContext> {
    const locationKey = `${location.coords.latitude.toFixed(3)}_${location.coords.longitude.toFixed(3)}`;

    if (this.locationContextCache.has(locationKey)) {
      return this.locationContextCache.get(locationKey)!;
    }

    try {
      // In a real app, this would call a geocoding service and historical database
      const context = await this.mockLocationContextService(location);
      this.locationContextCache.set(locationKey, context);
      return context;
    } catch (error) {
      logger.error("Error getting location context:", error);
      return this.getDefaultLocationContext(location);
    }
  }

  /**
   * Mock location context service (in real app, this would be external API calls)
   */
  private async mockLocationContextService(
    location: Location.LocationObject
  ): Promise<LocationContext> {
    const { latitude, longitude } = location.coords;

    // Norwegian coordinates detection
    if (latitude > 58 && latitude < 72 && longitude > 4 && longitude < 32) {
      if (
        latitude > 59.8 &&
        latitude < 60.0 &&
        longitude > 10.6 &&
        longitude < 10.8
      ) {
        // Oslo area
        return {
          country: "Norge",
          region: "Østlandet",
          city: "Oslo",
          nearbyLandmarks: [
            "Akershus festning",
            "Slottet",
            "Vigelandsparken",
            "Operaen",
          ],
          historicalPeriod: "Middelalder til moderne tid",
          culturalContext: "Norsk hovedstad med rik historie",
        };
      } else if (
        latitude > 60.3 &&
        latitude < 60.4 &&
        longitude > 5.2 &&
        longitude < 5.4
      ) {
        // Bergen area
        return {
          country: "Norge",
          region: "Vestlandet",
          city: "Bergen",
          nearbyLandmarks: ["Bryggen", "Fløyen", "Hanseatisk museum"],
          historicalPeriod: "Hansatiden",
          culturalContext: "Hanseatisk handelsby",
        };
      } else if (
        latitude > 63.4 &&
        latitude < 63.5 &&
        longitude > 10.3 &&
        longitude < 10.5
      ) {
        // Trondheim area
        return {
          country: "Norge",
          region: "Trøndelag",
          city: "Trondheim",
          nearbyLandmarks: ["Nidarosdomen", "Munkholmen", "Stiftsgården"],
          historicalPeriod: "Vikingtid og middelalder",
          culturalContext: "Norges første hovedstad og pilegrimsby",
        };
      } else {
        return {
          country: "Norge",
          region: "Norge",
          city: "Ukjent by",
          nearbyLandmarks: ["Norsk natur", "Fjorder", "Skoger"],
          historicalPeriod: "Norsk historie",
          culturalContext: "Norsk kulturlandskap",
        };
      }
    }

    // Default international context
    return {
      country: "Unknown",
      region: "Unknown",
      city: "Unknown",
      nearbyLandmarks: ["Natural surroundings"],
      historicalPeriod: "Various periods",
      culturalContext: "Local culture and history",
    };
  }

  /**
   * Generate a sophisticated location-based story
   */
  private async generateLocationBasedStory(
    location: Location.LocationObject,
    context: LocationContext,
    interests: Interest[],
    userProfile?: UserProfile
  ): Promise<StoryContent> {
    const { latitude, longitude } = location.coords;

    // Select primary theme based on interests and location
    const primaryInterest = interests.length > 0 ? interests[0].id : "history";

    const storyTemplates = this.getStoryTemplates(context, primaryInterest);
    const selectedTemplate =
      storyTemplates[Math.floor(Math.random() * storyTemplates.length)];

    // Generate personalized content
    const personalizedContent = this.personalizeStoryContent(
      selectedTemplate,
      context,
      interests,
      userProfile
    );

    return {
      _title: personalizedContent.title,
      _content: personalizedContent.content,
      backgroundMusic: this.selectBackgroundMusic(primaryInterest, context),
      _duration: Math.floor(personalizedContent.content.length / 15), // ~15 chars per second
      location: {
        latitude,
        longitude,
        address: `${context.city}, ${context.country}`,
      },
      metadata: {
        difficulty: this.calculateDifficulty(personalizedContent.content),
        theme: primaryInterest,
        historicalAccuracy: "High",
      },
    };
  }

  /**
   * Get story templates based on location context and interest
   */
  private getStoryTemplates(context: LocationContext, interest: string): any[] {
    const templates: { [key: string]: any[] } = {
      history: [
        {
          title: `Historiens ekko i ${context.city}`,
          content: `Du står nå på et sted som har vært vitne til ${context.historicalPeriod}. Her, på koordinatene hvor du befinner deg, har generasjoner av mennesker gått før deg. ${context.nearbyLandmarks.join(", ")} forteller alle sine unike historier om denne plassen. Lukk øynene og forestill deg hvordan dette stedet så ut for hundrevis av år siden.`,
        },
        {
          title: `Fortidas stemmer fra ${context.region}`,
          content: `I ${context.city} har historien lagt igjen spor som fortsatt kan oppleves i dag. Dette området har vært preget av ${context.culturalContext}, og hver stein, hvert tre og hver sti bærer minner fra svunne tider. La oss reise tilbake og oppleve hvordan livet utfoldet seg her gjennom århundrene.`,
        },
      ],
      nature: [
        {
          title: `Naturens hemmeligheter i ${context.region}`,
          content: `Naturen rundt deg i ${context.city} skjuler fascinerende hemmeligheter som har utviklet seg over tusenvis av år. Landskapet du ser har blitt formet av isbreer, vind og tid. Hver plante, hvert dyr og hver geologisk formasjon forteller en historie om tilpasning og overlevelse i ${context.culturalContext}.`,
        },
        {
          title: `Økosystemets dans i ${context.city}`,
          content: `Her i ${context.region} utspiller det seg en usynlig dans mellom alle levende organismer. Fra den minste insekt til de største trærne, alt er forbundet i et komplekst nettverk av avhengigheter. La oss utforske hvordan naturen har tilpasset seg de unike forholdene i ${context.culturalContext}.`,
        },
      ],
      culture: [
        {
          title: `Kulturelle tradisjoner fra ${context.city}`,
          content: `${context.culturalContext} har gjennom generasjoner skapt unike tradisjoner og skikker som fortsatt preger ${context.city} i dag. Her har kunst, musikk og håndverk blomstret, påvirket av både lokal inspirasjon og impulser fra andre kulturer. La oss oppdage hvordan kulturen har utviklet seg på dette stedet.`,
        },
      ],
      legends: [
        {
          title: `Sagn og myter fra ${context.region}`,
          content: `Rundt omkring i ${context.city} lever gamle sagn og fortellinger som har blitt fortalt fra generasjon til generasjon. Disse historiene blander virkelighet med fantasi og gir oss innsikt i hvordan våre forfedre forstod verden rundt seg. La oss lytte til ekkoet av disse gamle fortellingene.`,
        },
      ],
    };

    return templates[interest] || templates.history;
  }

  /**
   * Personalize story content based on user profile and preferences
   */
  private personalizeStoryContent(
    template: any,
    context: LocationContext,
    interests: Interest[],
    userProfile?: UserProfile
  ): { title: string; content: string } {
    let personalizedContent = template.content;
    const personalizedTitle = template.title;

    // Add interest-specific details
    const interestModifications = {
      architecture:
        "Legg merke til byggestilene og arkitektoniske detaljer rundt deg. ",
      mystery:
        "Det finnes uforklarte fenomener og gåter knyttet til dette stedet. ",
      legends:
        "Gamle fortellinger hvisker om mystiske hendelser som skal ha skjedd her. ",
    };

    interests.forEach((interest) => {
      if (
        interestModifications[interest.id as keyof typeof interestModifications]
      ) {
        personalizedContent =
          interestModifications[
            interest.id as keyof typeof interestModifications
          ] + personalizedContent;
      }
    });

    // Add weather and time context (simplified)
    const timeContext = this.getTimeContext();
    personalizedContent += ` ${timeContext}`;

    return {
      title: personalizedTitle,
      content: personalizedContent,
    };
  }

  /**
   * Select appropriate background music based on story theme and location
   */
  private selectBackgroundMusic(
    interest: string,
    context: LocationContext
  ): string {
    const musicMap: { [key: string]: string } = {
      history: "medieval_ambient",
      nature: "nature_sounds",
      culture: "folk_ambient",
      legends: "mysterious_ambient",
      architecture: "classical_ambient",
    };

    // Add location-specific music preferences
    if (context.country === "Norge") {
      return `nordic_${musicMap[interest] || "ambient"}`;
    }

    return musicMap[interest] || "ambient";
  }

  /**
   * Get time-specific context for the story
   */
  private getTimeContext(): string {
    const hour = new Date().getHours();

    if (hour < 6) {
      return "I den tidlige morgentimen gir stedet en spesielt fredfull og mystisk atmosfære.";
    } else if (hour < 12) {
      return "Morgensolens lys kaster lange skygger og fremhever stedets karakter.";
    } else if (hour < 18) {
      return "På denne tiden av dagen er stedet full av aktivitet og liv.";
    } else {
      return "Kveldslyset gir stedet en magisk og kontemplativ stemning.";
    }
  }

  /**
   * Calculate story difficulty based on content complexity
   */
  private calculateDifficulty(content: string): string {
    const wordCount = content.split(" ").length;

    if (wordCount < 100) return "Lett";
    if (wordCount < 200) return "Middels";
    return "Avansert";
  }

  /**
   * Cache story for offline use
   */
  private async cacheStory(
    location: Location.LocationObject,
    story: StoryContent
  ): Promise<void> {
    try {
      const cacheKey = `story_${location.coords.latitude.toFixed(3)}_${location.coords.longitude.toFixed(3)}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(story));
    } catch (error) {
      logger.error("Error caching story:", error);
    }
  }

  /**
   * Get fallback story when AI service is unavailable
   */
  private async getFallbackStory(
    location: Location.LocationObject,
    interests: Interest[]
  ): Promise<StoryContent> {
    const { latitude, longitude } = location.coords;

    return {
      _title: "En reise gjennom tid og rom",
      _content: `Du befinner deg på et unikt sted på jorden - koordinatene ${latitude.toFixed(4)}, ${longitude.toFixed(4)}. Hver plass på vår planet har sin egen historie, sine egne hemmeligheter og sin egen skjønnhet. Ta deg tid til å observere omgivelsene dine. Hva ser du? Hva hører du? La sansene dine guide deg gjennom denne opplevelsen og skape dine egne minner fra dette øyeblikket.`,
      backgroundMusic: "ambient",
      _duration: 120,
      location: {
        latitude,
        longitude,
      },
      metadata: {
        difficulty: "Lett",
        theme: "general",
        historicalAccuracy: "N/A",
      },
    };
  }

  /**
   * Filter interests relevant to the current location
   */
  private filterRelevantInterests(
    interests: Interest[],
    context: LocationContext
  ): Interest[] {
    // This is a simplified version - in a real app, this would be more sophisticated
    return interests.slice(0, 3); // Take top 3 interests
  }

  /**
   * Get default location context when services fail
   */
  private getDefaultLocationContext(
    location: Location.LocationObject
  ): LocationContext {
    return {
      country: "Unknown",
      region: "Local area",
      city: "Your current location",
      nearbyLandmarks: ["Natural surroundings"],
      culturalContext: "Local environment",
    };
  }

  /**
   * Initialize stories database for offline use
   */
  private initializeStoriesDatabase(): void {
    // Pre-load some stories for common locations
    // In a real app, this would be loaded from a backend service
  }

  /**
   * Get cached stories for a location
   */
  async getCachedStory(
    location: Location.LocationObject
  ): Promise<StoryContent | null> {
    try {
      const cacheKey = `story_${location.coords.latitude.toFixed(3)}_${location.coords.longitude.toFixed(3)}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error("Error retrieving cached story:", error);
      return null;
    }
  }

  /**
   * Get user's story history
   */
  async getStoryHistory(): Promise<StoryContent[]> {
    try {
      const history = await AsyncStorage.getItem("story_history");
      return history ? JSON.parse(history) : [];
    } catch (error) {
      logger.error("Error retrieving story history:", error);
      return [];
    }
  }

  /**
   * Save story to user's history
   */
  async saveToHistory(story: StoryContent): Promise<void> {
    try {
      const history = await this.getStoryHistory();
      const updatedHistory = [story, ...history.slice(0, 49)]; // Keep last 50 stories
      await AsyncStorage.setItem(
        "story_history",
        JSON.stringify(updatedHistory)
      );
    } catch (error) {
      logger.error("Error saving story to history:", error);
    }
  }
}

export default new AIStoryService();
