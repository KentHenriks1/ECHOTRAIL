import { Trail } from "../types/Trail";

export const mockTrails: Trail[] = [
  {
    id: "trail-1",
    name: "Østmarka Natursti",
    description:
      "En vakker tur gjennom Østmarka med historiske steder og naturopplevelser. Perfekt for familier og naturelskere.",
    difficulty: "easy",
    category: "nature",

    startPoint: {
      latitude: 59.9139,
      longitude: 10.7522, // Oslo sentrum som utgangspunkt
    },
    endPoint: {
      latitude: 59.9339,
      longitude: 10.7822,
    },
    waypoints: [
      { latitude: 59.9139, longitude: 10.7522, elevation: 100 },
      { latitude: 59.9189, longitude: 10.7572, elevation: 120 },
      { latitude: 59.9239, longitude: 10.7622, elevation: 150 },
      { latitude: 59.9289, longitude: 10.7722, elevation: 180 },
      { latitude: 59.9339, longitude: 10.7822, elevation: 200 },
    ],
    trackPoints: [
      {
        coordinate: { latitude: 59.9139, longitude: 10.7522 },
        timestamp: new Date("2024-12-16T10:00:00Z"),
        altitude: 100,
      },
      {
        coordinate: { latitude: 59.9189, longitude: 10.7572 },
        timestamp: new Date("2024-12-16T10:15:00Z"),
        altitude: 120,
      },
      {
        coordinate: { latitude: 59.9239, longitude: 10.7622 },
        timestamp: new Date("2024-12-16T10:30:00Z"),
        altitude: 150,
      },
      {
        coordinate: { latitude: 59.9289, longitude: 10.7722 },
        timestamp: new Date("2024-12-16T10:45:00Z"),
        altitude: 180,
      },
      {
        coordinate: { latitude: 59.9339, longitude: 10.7822 },
        timestamp: new Date("2024-12-16T11:00:00Z"),
        altitude: 200,
      },
    ],
    bounds: {
      northeast: { latitude: 59.9339, longitude: 10.7822 },
      southwest: { latitude: 59.9139, longitude: 10.7522 },
    },

    distance: 3500, // 3.5 km
    estimatedDuration: 90, // 1.5 hours
    elevationGain: 100,
    maxElevation: 200,
    minElevation: 100,

    images: [
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop&crop=forest",
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop&crop=nature",
    ],

    audioGuidePoints: [
      {
        id: "audio-1",
        coordinate: { latitude: 59.9189, longitude: 10.7572 },
        location: { latitude: 59.9189, longitude: 10.7572 },
        title: "Gammel Eik",
        description: "En 400 år gammel eik som har sett mange generasjoner",
        content:
          "Foran deg står en majestætisk eik som har vokst her i over 400 år. Dette treet var her før Oslo ble grunnlagt, og har vært vitne til byens hele historie.",
        audioScript:
          "Foran deg står en majestætisk eik som har vokst her i over 400 år. Dette treet var her før Oslo ble grunnlagt, og har vært vitne til byens hele historie.",
        triggerRadius: 50,
        category: "history",
      },
      {
        id: "audio-2",
        coordinate: { latitude: 59.9239, longitude: 10.7622 },
        location: { latitude: 59.9239, longitude: 10.7622 },
        title: "Fuglenes Himmel",
        description: "Et viktig område for trekkfugler",
        content:
          "Dette området er kjent som fuglenes himmel. Om våren og høsten kan du oppleve tusenvis av trekkfugler som stopper her for å hvile.",
        audioScript:
          "Dette området er kjent som fuglenes himmel. Om våren og høsten kan du oppleve tusenvis av trekkfugler som stopper her for å hvile.",
        triggerRadius: 75,
        category: "nature",
      },
    ],

    rating: 4.5,
    reviewCount: 127,
    popularity: 85,

    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-12-01"),
    isActive: true,
    requiresPermits: false,

    seasonality: {
      bestMonths: [4, 5, 6, 7, 8, 9, 10],
      warnings: ["Kan være glatt om vinteren"],
    },

    features: {
      hasWater: true,
      hasRestrooms: true,
      hasParking: true,
      isPetFriendly: true,
      isAccessible: false,
      hasWifi: false,
    },
  },

  {
    id: "trail-2",
    name: "Akershus Festning Historie",
    description:
      "En kulturhistorisk vandring rundt Akershus Festning med dramatiske fortellinger fra middelalderen.",
    difficulty: "easy",
    category: "cultural",

    startPoint: {
      latitude: 59.9073,
      longitude: 10.7365,
    },
    endPoint: {
      latitude: 59.9073,
      longitude: 10.7365, // Rundt tur
    },
    waypoints: [
      { latitude: 59.9073, longitude: 10.7365, elevation: 50 },
      { latitude: 59.9083, longitude: 10.7375, elevation: 60 },
      { latitude: 59.9093, longitude: 10.7385, elevation: 70 },
      { latitude: 59.9083, longitude: 10.7395, elevation: 65 },
      { latitude: 59.9073, longitude: 10.7365, elevation: 50 },
    ],
    trackPoints: [
      {
        coordinate: { latitude: 59.9073, longitude: 10.7365 },
        timestamp: new Date("2024-12-16T14:00:00Z"),
        altitude: 50,
      },
      {
        coordinate: { latitude: 59.9083, longitude: 10.7375 },
        timestamp: new Date("2024-12-16T14:10:00Z"),
        altitude: 60,
      },
      {
        coordinate: { latitude: 59.9093, longitude: 10.7385 },
        timestamp: new Date("2024-12-16T14:20:00Z"),
        altitude: 70,
      },
      {
        coordinate: { latitude: 59.9083, longitude: 10.7395 },
        timestamp: new Date("2024-12-16T14:30:00Z"),
        altitude: 65,
      },
      {
        coordinate: { latitude: 59.9073, longitude: 10.7365 },
        timestamp: new Date("2024-12-16T14:40:00Z"),
        altitude: 50,
      },
    ],
    bounds: {
      northeast: { latitude: 59.9093, longitude: 10.7395 },
      southwest: { latitude: 59.9073, longitude: 10.7365 },
    },

    distance: 1200, // 1.2 km
    estimatedDuration: 45,
    elevationGain: 20,
    maxElevation: 70,
    minElevation: 50,

    images: [
      "https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?w=800&h=600&fit=crop&crop=castle",
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&crop=fortress",
    ],

    audioGuidePoints: [
      {
        id: "audio-3",
        coordinate: { latitude: 59.9083, longitude: 10.7375 },
        location: { latitude: 59.9083, longitude: 10.7375 },
        title: "Festningens Port",
        description: "Hovedinngangen til Akershus Festning",
        content:
          "Gjennom denne porten har konger, soldater og fanger gått i over 700 år. Kan du høre ekkoet av historien i steinveggene?",
        audioScript:
          "Gjennom denne porten har konger, soldater og fanger gått i over 700 år. Kan du høre ekkoet av historien i steinveggene?",
        triggerRadius: 30,
        category: "history",
      },
      {
        id: "audio-4",
        coordinate: { latitude: 59.9093, longitude: 10.7385 },
        location: { latitude: 59.9093, longitude: 10.7385 },
        title: "Kongegravene",
        description: "Hvilested for norske konger og dronninger",
        content:
          "Her hviler Kong Olav V og Dronning Maud. Dette hellige stedet har vært et symbol på norsk kongemakt i århundrer.",
        audioScript:
          "Her hviler Kong Olav V og Dronning Maud. Dette hellige stedet har vært et symbol på norsk kongemakt i århundrer.",
        triggerRadius: 25,
        category: "culture",
      },
    ],

    rating: 4.8,
    reviewCount: 89,
    popularity: 92,

    createdAt: new Date("2024-02-20"),
    updatedAt: new Date("2024-11-15"),
    isActive: true,
    requiresPermits: false,

    features: {
      hasWater: false,
      hasRestrooms: true,
      hasParking: true,
      isPetFriendly: true,
      isAccessible: true,
      hasWifi: true,
    },
  },

  {
    id: "trail-3",
    name: "Vigelandsparken Mysterier",
    description:
      "Utforsk de skjulte symbolene og hemmelighetene i Gustav Vigelands skulpturpark.",
    difficulty: "moderate",
    category: "cultural",

    startPoint: {
      latitude: 59.9267,
      longitude: 10.7003,
    },
    endPoint: {
      latitude: 59.9267,
      longitude: 10.7003,
    },
    waypoints: [
      { latitude: 59.9267, longitude: 10.7003, elevation: 85 },
      { latitude: 59.9277, longitude: 10.7013, elevation: 90 },
      { latitude: 59.9287, longitude: 10.7023, elevation: 95 },
      { latitude: 59.9297, longitude: 10.7033, elevation: 100 },
      { latitude: 59.9277, longitude: 10.7043, elevation: 90 },
      { latitude: 59.9267, longitude: 10.7003, elevation: 85 },
    ],
    trackPoints: [
      {
        coordinate: { latitude: 59.9267, longitude: 10.7003 },
        timestamp: new Date("2024-12-16T15:00:00Z"),
        altitude: 85,
      },
      {
        coordinate: { latitude: 59.9277, longitude: 10.7013 },
        timestamp: new Date("2024-12-16T15:12:00Z"),
        altitude: 90,
      },
      {
        coordinate: { latitude: 59.9287, longitude: 10.7023 },
        timestamp: new Date("2024-12-16T15:24:00Z"),
        altitude: 95,
      },
      {
        coordinate: { latitude: 59.9297, longitude: 10.7033 },
        timestamp: new Date("2024-12-16T15:36:00Z"),
        altitude: 100,
      },
      {
        coordinate: { latitude: 59.9277, longitude: 10.7043 },
        timestamp: new Date("2024-12-16T15:48:00Z"),
        altitude: 90,
      },
      {
        coordinate: { latitude: 59.9267, longitude: 10.7003 },
        timestamp: new Date("2024-12-16T16:00:00Z"),
        altitude: 85,
      },
    ],
    bounds: {
      northeast: { latitude: 59.9297, longitude: 10.7043 },
      southwest: { latitude: 59.9267, longitude: 10.7003 },
    },

    distance: 2800,
    estimatedDuration: 75,
    elevationGain: 15,
    maxElevation: 100,
    minElevation: 85,

    images: [
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&crop=sculpture",
      "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop&crop=park",
    ],

    audioGuidePoints: [
      {
        id: "audio-5",
        coordinate: { latitude: 59.9277, longitude: 10.7013 },
        location: { latitude: 59.9277, longitude: 10.7013 },
        title: "Monolitten",
        description: "Den berømte Monolitten - et mysterium i stein",
        content:
          "Foran deg reiser seg Monolitten - 121 nakne figurer hugget ut av ett eneste stykke granitt. Hva prøvde Vigeland å fortelle oss?",
        audioScript:
          "Foran deg reiser seg Monolitten - 121 nakne figurer hugget ut av ett eneste stykke granitt. Hva prøvde Vigeland å fortelle oss?",
        triggerRadius: 40,
        category: "mystery",
      },
      {
        id: "audio-6",
        coordinate: { latitude: 59.9287, longitude: 10.7023 },
        location: { latitude: 59.9287, longitude: 10.7023 },
        title: "Livssirkelen",
        description: "Skulpturer som viser livets gang",
        content:
          "Se rundt deg - hver skulptur representerer et stadium i livet. Fra fødsel til død, en evig sirkel hugget i stein.",
        audioScript:
          "Se rundt deg - hver skulptur representerer et stadium i livet. Fra fødsel til død, en evig sirkel hugget i stein.",
        triggerRadius: 35,
        category: "culture",
      },
    ],

    rating: 4.3,
    reviewCount: 156,
    popularity: 78,

    createdAt: new Date("2024-03-10"),
    updatedAt: new Date("2024-12-01"),
    isActive: true,
    requiresPermits: false,

    features: {
      hasWater: true,
      hasRestrooms: true,
      hasParking: true,
      isPetFriendly: true,
      isAccessible: true,
      hasWifi: false,
    },
  },
];

export const getTrailById = (id: string): Trail | undefined => {
  return mockTrails.find((trail) => trail.id === id);
};

export const getTrailsByCategory = (category: Trail["category"]): Trail[] => {
  return mockTrails.filter((trail) => trail.category === category);
};

export const getNearbyTrails = (
  userLocation: { latitude: number; longitude: number },
  radius: number = 5000 // 5km default
): Trail[] => {
  // Simple distance calculation (not accurate for production)
  return mockTrails.filter((trail) => {
    const distance = getDistance(userLocation, trail.startPoint);
    return distance <= radius;
  });
};

// Simple Haversine distance calculation
const getDistance = (
  pos1: { latitude: number; longitude: number },
  pos2: { latitude: number; longitude: number }
): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (pos1.latitude * Math.PI) / 180;
  const φ2 = (pos2.latitude * Math.PI) / 180;
  const Δφ = ((pos2.latitude - pos1.latitude) * Math.PI) / 180;
  const Δλ = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};
