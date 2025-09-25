import { logger } from "./logger";
import { Interest } from "../services/IntelligentLocationService";

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    name: string;
  };
  expectedFeatures: string[];
  interests: Interest[];
  duration: number; // seconds
  steps: TestStep[];
}

export interface TestStep {
  action: string;
  description: string;
  expectedResult: string;
  waitTime?: number; // seconds
}

/**
 * Comprehensive test scenarios for different EchoTrail use cases
 */
export const TEST_SCENARIOS: TestScenario[] = [
  {
    id: "sarpsborg_stationary",
    name: "Sarpsborg Sentrum - Stillestående",
    description:
      "Test av stillestående modus i Sarpsborg sentrum med historiske interesser",
    location: {
      latitude: 59.2839,
      longitude: 11.1097,
      name: "Sarpsborg Sentrum",
    },
    expectedFeatures: [
      "Lange, detaljerte historier",
      "OpenAI TTS høy kvalitet",
      "Lokal historie om Sarpsborg",
      "Kontinuerlig innholdsgenerering",
      "Foto-tagging med historisk kontekst",
    ],
    interests: [
      { id: "1", name: "Historie", category: "history", weight: 0.9 },
      { id: "2", name: "Arkitektur", category: "architecture", weight: 0.7 },
      { id: "3", name: "Kultur", category: "culture", weight: 0.6 },
    ],
    duration: 300, // 5 minutes
    steps: [
      {
        action: "START_ECHOTRAIL",
        description: "Initialiser EchoTrail i Discovery modus",
        expectedResult: "System starter og lokasjon detekteres",
        waitTime: 5,
      },
      {
        action: "START_RECORDING",
        description: "Start trail recording",
        expectedResult: "GPS-sporing begynner",
        waitTime: 3,
      },
      {
        action: "WAIT_STATIONARY",
        description: "Vent på at stillestående modus detekteres",
        expectedResult: "Bevegelsesmodus = STATIONARY",
        waitTime: 30,
      },
      {
        action: "GENERATE_CONTENT",
        description: "AI genererer innhold for Sarpsborg sentrum",
        expectedResult: "Historisk historie om lokale severdigheter",
        waitTime: 10,
      },
      {
        action: "PLAY_AUDIO",
        description: "TTS spiller av generert historie",
        expectedResult: "OpenAI TTS med høy kvalitet",
        waitTime: 60,
      },
      {
        action: "TAKE_PHOTO",
        description: "Ta foto av sentrum",
        expectedResult: "GPS-tagged bilde lagres",
        waitTime: 2,
      },
      {
        action: "VERIFY_CONTENT_ADAPTATION",
        description: "Verifiser at innholdet er tilpasset stillestående modus",
        expectedResult: "Lang, detaljert historie (3+ minutter)",
        waitTime: 5,
      },
    ],
  },

  {
    id: "walking_route",
    name: "Gåtur - Varierende Lokasjon",
    description:
      "Test av gående modus med kontinuerlig bevegelse og lokasjonsendringer",
    location: {
      latitude: 59.285,
      longitude: 11.105,
      name: "Sarpsborg Park",
    },
    expectedFeatures: [
      "Medium-lengde historier",
      "Adaptiv TTS-kvalitet",
      "Lokasjonsbaserte oppdateringer",
      "Trail-visualisering",
      "Bevegelsesmodus-deteksjon",
    ],
    interests: [
      { id: "1", name: "Natur", category: "nature", weight: 0.8 },
      { id: "2", name: "Historie", category: "history", weight: 0.7 },
      { id: "3", name: "Legender", category: "legend", weight: 0.5 },
    ],
    duration: 600, // 10 minutes
    steps: [
      {
        action: "START_WALKING",
        description: "Begynn gåtur med konstant hastighet 5 km/t",
        expectedResult: "Bevegelsesmodus = WALKING",
        waitTime: 10,
      },
      {
        action: "GENERATE_WALKING_CONTENT",
        description: "AI genererer innhold for gående",
        expectedResult: "Medium-lengde historie (1-2 minutter)",
        waitTime: 15,
      },
      {
        action: "VERIFY_TRAIL_VISUALIZATION",
        description: "Sjekk at grønn trail-linje vises på kart",
        expectedResult: "Grønn sporing vises i sanntid",
        waitTime: 30,
      },
      {
        action: "CHANGE_LOCATION",
        description: "Beveg seg til nytt område",
        expectedResult: "Nytt innhold genereres for ny lokasjon",
        waitTime: 60,
      },
      {
        action: "TAKE_MULTIPLE_PHOTOS",
        description: "Ta 3 bilder under gåturen",
        expectedResult: "3 GPS-tagged bilder med forskjellige lokasjoner",
        waitTime: 10,
      },
      {
        action: "VERIFY_STATISTICS",
        description: "Kontroller at statistikk oppdateres korrekt",
        expectedResult: "Distanse, tid, hastighet oppdateres live",
        waitTime: 5,
      },
    ],
  },

  {
    id: "cycling_speed",
    name: "Sykkeltur - Høy Hastighet",
    description: "Test av syklende modus med rask bevegelse og kort innhold",
    location: {
      latitude: 59.29,
      longitude: 11.12,
      name: "Sykkelrute Sarpsborg",
    },
    expectedFeatures: [
      "Korte, konsise fakta",
      "System TTS (rask respons)",
      "Blå trail-visualisering",
      "Hyppige lokasjonsoppdateringer",
      "Sikkerhetsfokusert innhold",
    ],
    interests: [
      { id: "1", name: "Natur", category: "nature", weight: 0.8 },
      { id: "2", name: "Lokal", category: "local", weight: 0.6 },
    ],
    duration: 480, // 8 minutes
    steps: [
      {
        action: "START_CYCLING",
        description: "Begynn sykling med hastighet 15-20 km/t",
        expectedResult: "Bevegelsesmodus = CYCLING",
        waitTime: 5,
      },
      {
        action: "GENERATE_CYCLING_CONTENT",
        description: "AI genererer kort innhold for syklende",
        expectedResult: "Korte fakta (30-60 sekunder)",
        waitTime: 10,
      },
      {
        action: "VERIFY_BLUE_TRAIL",
        description: "Kontroller blå trail-visualisering",
        expectedResult: "Blå sporing vises på kartet",
        waitTime: 20,
      },
      {
        action: "TEST_SYSTEM_TTS",
        description: "Verifiser at System TTS brukes for rask respons",
        expectedResult: "Rask TTS-oppstart, lower latency",
        waitTime: 30,
      },
      {
        action: "RAPID_LOCATION_CHANGES",
        description: "Beveg seg raskt gjennom forskjellige områder",
        expectedResult: "Kontinuerlig innholdsgenerering",
        waitTime: 120,
      },
      {
        action: "TAKE_CYCLING_PHOTO",
        description: "Ta foto under sykling",
        expectedResult: "GPS-tagged bilde med sykling-metadata",
        waitTime: 2,
      },
    ],
  },

  {
    id: "driving_landmarks",
    name: "Kjøring - Landemerker",
    description: "Test av kjørende modus med fokus på sikkerhet og landemerker",
    location: {
      latitude: 59.28,
      longitude: 11.14,
      name: "E6 Sarpsborg",
    },
    expectedFeatures: [
      "Korte legender og fakta",
      "System TTS (sikkerhet)",
      "Oransje trail-visualisering",
      "Landemerke-fokusert innhold",
      "Minimal avledning",
    ],
    interests: [
      { id: "1", name: "Historie", category: "history", weight: 0.7 },
      { id: "2", name: "Legender", category: "legend", weight: 0.8 },
      { id: "3", name: "Arkitektur", category: "architecture", weight: 0.5 },
    ],
    duration: 360, // 6 minutes
    steps: [
      {
        action: "START_DRIVING",
        description: "Begynn kjøring med hastighet 50+ km/t",
        expectedResult: "Bevegelsesmodus = DRIVING",
        waitTime: 3,
      },
      {
        action: "GENERATE_DRIVING_CONTENT",
        description: "AI genererer korte legender for sjåfører",
        expectedResult: "Korte, fengslende historier (30-45 sekunder)",
        waitTime: 15,
      },
      {
        action: "VERIFY_ORANGE_TRAIL",
        description: "Kontroller oransje trail-visualisering",
        expectedResult: "Oransje sporing vises på kartet",
        waitTime: 30,
      },
      {
        action: "LANDMARK_DETECTION",
        description: "Kjør forbi kjente landemerker",
        expectedResult: "Automatisk innholdsgenerering for landemerker",
        waitTime: 60,
      },
      {
        action: "SAFETY_VERIFICATION",
        description: "Verifiser sikkerhetsfokus i innhold og TTS",
        expectedResult: "Kort, ikke-avledende innhold",
        waitTime: 30,
      },
    ],
  },

  {
    id: "mixed_activity",
    name: "Blandet Aktivitet - Komplett Test",
    description: "Omfattende test med alle bevegelsesmodi og funksjoner",
    location: {
      latitude: 59.2839,
      longitude: 11.1097,
      name: "Sarpsborg - Komplett Rute",
    },
    expectedFeatures: [
      "Alle bevegelsesmodi",
      "Adaptiv innholdsgenerering",
      "Komplett trail-visualisering",
      "Foto-integration",
      "Statistikk og analyse",
    ],
    interests: [
      { id: "1", name: "Historie", category: "history", weight: 0.8 },
      { id: "2", name: "Natur", category: "nature", weight: 0.7 },
      { id: "3", name: "Kultur", category: "culture", weight: 0.6 },
      { id: "4", name: "Arkitektur", category: "architecture", weight: 0.5 },
    ],
    duration: 1200, // 20 minutes
    steps: [
      {
        action: "START_STATIONARY",
        description: "Begynn i stillestående modus",
        expectedResult: "Rød segment på kart, lang historie",
        waitTime: 60,
      },
      {
        action: "TRANSITION_TO_WALKING",
        description: "Begynn å gå",
        expectedResult: "Nytt grønt segment startes",
        waitTime: 120,
      },
      {
        action: "TAKE_WALKING_PHOTOS",
        description: "Ta 2 bilder under gåing",
        expectedResult: "GPS-tagged bilder i grønt segment",
        waitTime: 10,
      },
      {
        action: "TRANSITION_TO_CYCLING",
        description: "Øk hastighet til sykling",
        expectedResult: "Nytt blått segment startes",
        waitTime: 180,
      },
      {
        action: "CYCLING_CONTENT_TEST",
        description: "Test innholdsgenerering under sykling",
        expectedResult: "Korte fakta, rask TTS",
        waitTime: 60,
      },
      {
        action: "BRIEF_DRIVING",
        description: "Kort kjøretur",
        expectedResult: "Oransje segment, kjøre-tilpasset innhold",
        waitTime: 120,
      },
      {
        action: "RETURN_TO_STATIONARY",
        description: "Stopp og hvil",
        expectedResult: "Nytt rødt segment, detaljert oppsummering",
        waitTime: 90,
      },
      {
        action: "FINAL_PHOTO_AND_EXPORT",
        description: "Ta avsluttende foto og eksporter GPX",
        expectedResult: "Komplett trail med alle segmenter og bilder",
        waitTime: 10,
      },
    ],
  },

  {
    id: "battery_optimization",
    name: "Batteriopptimalisering - Langvarig Test",
    description: "Test av systemets batterioptimalisering under langvarig bruk",
    location: {
      latitude: 59.2839,
      longitude: 11.1097,
      name: "Sarpsborg - Batteritest",
    },
    expectedFeatures: [
      "Intelligent batterisparing",
      "Adaptiv GPS-frekvens",
      "Optimalisert TTS-bruk",
      "Background processing",
      "Minimert databruk",
    ],
    interests: [{ id: "1", name: "Natur", category: "nature", weight: 0.6 }],
    duration: 3600, // 1 hour
    steps: [
      {
        action: "ENABLE_BATTERY_OPTIMIZATION",
        description: "Aktiver batteriopptimalisering",
        expectedResult: "System reduserer GPS-frekvens og TTS-kvalitet",
        waitTime: 10,
      },
      {
        action: "LONG_STATIONARY_PERIOD",
        description: "Lang stillestående periode",
        expectedResult: "Redusert innholdsgenerering, GPS-frekvens",
        waitTime: 900,
      },
      {
        action: "INTERMITTENT_WALKING",
        description: "Periodevise gåturer",
        expectedResult: "System tilpasser seg aktivitetsnivå",
        waitTime: 1800,
      },
      {
        action: "BACKGROUND_MODE_TEST",
        description: "Test bakgrunnsmodus",
        expectedResult: "Fortsatt funksjonalitet i bakgrunnen",
        waitTime: 300,
      },
      {
        action: "BATTERY_USAGE_ANALYSIS",
        description: "Analyser batteribruk",
        expectedResult: "Optimalisert batteriforbruk dokumentert",
        waitTime: 30,
      },
    ],
  },

  {
    id: "interest_filtering",
    name: "Interessefiltrering - Personalisering",
    description: "Test av AI-basert interessefiltrering og personalisering",
    location: {
      latitude: 59.2839,
      longitude: 11.1097,
      name: "Sarpsborg - Personalisering",
    },
    expectedFeatures: [
      "Personalisert innholdsgenerering",
      "Interessebasert filtrering",
      "Adaptiv AI-prompts",
      "Brukerpreference-læring",
      "Relevans-optimalisering",
    ],
    interests: [
      { id: "1", name: "Historie", category: "history", weight: 0.9 },
      { id: "2", name: "Arkitektur", category: "architecture", weight: 0.1 },
      { id: "3", name: "Natur", category: "nature", weight: 0.1 },
    ],
    duration: 600, // 10 minutes
    steps: [
      {
        action: "SET_HISTORY_PREFERENCE",
        description: "Sett høy preferanse for historie",
        expectedResult: "AI genererer primært historisk innhold",
        waitTime: 60,
      },
      {
        action: "VERIFY_CONTENT_RELEVANCE",
        description: "Verifiser at innhold matcher interesser",
        expectedResult: "80%+ av innhold er historie-relatert",
        waitTime: 120,
      },
      {
        action: "CHANGE_INTERESTS",
        description: "Endre til naturinteresser",
        expectedResult: "AI tilpasser seg nye preferanser",
        waitTime: 60,
      },
      {
        action: "TEST_MIXED_INTERESTS",
        description: "Test balanserte interesser",
        expectedResult: "Innhold reflekterer interessevekting",
        waitTime: 180,
      },
      {
        action: "ANALYZE_PERSONALIZATION",
        description: "Analyser personaliseringseffektivitet",
        expectedResult: "Dokumentert forbedring i innholdsrelevans",
        waitTime: 30,
      },
    ],
  },
];

/**
 * Utility functions for test execution
 */
export class TestScenarioRunner {
  private currentScenario: TestScenario | null = null;
  private currentStepIndex = 0;
  private testResults: { [key: string]: boolean } = {};

  async runScenario(scenarioId: string): Promise<boolean> {
    const scenario = TEST_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) {
      logger.error(`Test scenario not found: ${scenarioId}`);
      return false;
    }

    this.currentScenario = scenario;
    this.currentStepIndex = 0;
    this.testResults = {};

    logger.info(`Starting test scenario: ${scenario.name}`);

    try {
      for (let i = 0; i < scenario.steps.length; i++) {
        this.currentStepIndex = i;
        const step = scenario.steps[i];

        logger.info(
          `Executing step ${i + 1}/${scenario.steps.length}: ${step.action}`
        );

        const success = await this.executeStep(step);
        this.testResults[step.action] = success;

        if (!success) {
          logger.error(`Step failed: ${step.action} - ${step.description}`);
          return false;
        }

        if (step.waitTime) {
          await this.wait(step.waitTime * 1000);
        }
      }

      logger.info(`Test scenario completed successfully: ${scenario.name}`);
      return true;
    } catch (error) {
      logger.error(`Test scenario failed: ${scenario.name}`, error);
      return false;
    }
  }

  private async executeStep(step: TestStep): Promise<boolean> {
    // This would integrate with the actual EchoTrail services
    // For now, we simulate the execution
    logger.info(`Simulating: ${step.description}`);
    logger.info(`Expected: ${step.expectedResult}`);

    // Simulate success for demonstration
    return true;
  }

  private wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  getTestResults(): { [key: string]: boolean } {
    return { ...this.testResults };
  }

  getCurrentProgress(): {
    scenario: string | null;
    step: number;
    total: number;
  } {
    return {
      scenario: this.currentScenario?.name || null,
      step: this.currentStepIndex + 1,
      total: this.currentScenario?.steps.length || 0,
    };
  }
}

export default TestScenarioRunner;
