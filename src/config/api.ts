export const API_CONFIG = {
  // Production API endpoint
  baseURL: "https://app-empty-hat-65510830.dpl.myneon.app",

  // Fallback URLs for different services
  neonRestApi: "https://app-empty-hat-65510830.dpl.myneon.app",
  githubRepo: "https://github.com/KentHenriks1/ECHOTRAIL.git",

  timeout: 10000, // 10 seconds
  retryAttempts: 3,

  // Headers for production
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};
