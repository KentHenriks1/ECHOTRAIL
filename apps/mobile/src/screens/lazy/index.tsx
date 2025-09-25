/**
 * Lazy-loaded Screen Components
 * Implements code-splitting for screens to improve app startup performance
 */

import React from 'react';

// Direct lazy components using React.lazy with proper type handling
export const LazyHomeScreen = React.lazy(() => 
  import('../HomeScreen').then(module => ({ 
    default: module.HomeScreen as React.ComponentType<any> 
  }))
);

export const LazyMapsScreen = React.lazy(() => 
  import('../MapsScreen').then(module => ({ 
    default: module.MapsScreen as React.ComponentType<any> 
  }))
);

export const LazyTrailsScreen = React.lazy(() => 
  import('../TrailsScreen').then(module => ({ 
    default: module.TrailsScreen as React.ComponentType<any> 
  }))
);

export const LazyTrailRecordingScreen = React.lazy(() => 
  import('../TrailRecordingScreen').then(module => ({ 
    default: module.TrailRecordingScreen as React.ComponentType<any> 
  }))
);

export const LazyProfileScreen = React.lazy(() => 
  import('../ProfileScreen').then(module => ({ 
    default: module.ProfileScreen as React.ComponentType<any> 
  }))
);

export const LazyAITestScreen = React.lazy(() => 
  import('../AITestScreen').then(module => ({ 
    default: module.AITestScreen as React.ComponentType<any> 
  }))
);

// Login screen is kept non-lazy since it's the entry point for unauthenticated users
// and should load immediately for better UX
export { LoginScreen } from '../LoginScreen';