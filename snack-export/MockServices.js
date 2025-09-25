// Mock Services for Snack
export const AuthService = {
  login: async (email, password) => ({ user: { email, role: 'user' } }),
  logout: async () => {},
  getCurrentUser: () => ({ email: 'demo@snack.dev', role: 'user' })
};

export const LocationService = {
  getCurrentLocation: async () => ({ 
    latitude: 59.9139, 
    longitude: 10.7522, 
    altitude: 0 
  }),
  watchLocation: (callback) => {
    callback({ latitude: 59.9139, longitude: 10.7522 });
    return () => {};
  }
};

export const StorageService = {
  getItem: async (key) => null,
  setItem: async (key, value) => {},
  removeItem: async (key) => {}
};

export const mockTrails = [
  {
    id: '1',
    name: 'Preikestolen',
    difficulty: 'Hard',
    distance: '8 km',
    description: 'Spektakulær utsikt over Lysefjorden',
    location: { latitude: 58.9864, longitude: 6.1882 }
  },
  {
    id: '2', 
    name: 'Trolltunga',
    difficulty: 'Expert',
    distance: '28 km',
    description: 'Norges mest kjente fotospot',
    location: { latitude: 60.1242, longitude: 6.7402 }
  }
];

export const mockMemories = [
  {
    id: '1',
    title: 'Solnedgang på Preikestolen',
    description: 'En magisk kveld med utsikt over fjorden',
    date: new Date().toISOString(),
    location: 'Preikestolen, Norge',
    image: 'https://picsum.photos/300/200?random=1'
  }
];
