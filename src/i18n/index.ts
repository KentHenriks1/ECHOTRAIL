import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      welcome: "Welcome",
      "home.title": "EchoTrail - AI Storytelling",
      "home.startRecording": "Start AI Guide",
      "home.recentTrails": "Recent Stories",
      "trails.noTrails": "No stories yet",
      "settings.title": "Settings",
      "settings.language": "Language",
      "settings.privacy": "Privacy",
      "settings.backgroundRecording": "Background Recording",
      "settings.offlineMaps": "Offline Maps",
      "settings.analytics": "Analytics",
    },
  },
  nb: {
    translation: {
      welcome: "Velkommen",
      "home.title": "EchoTrail - AI Historiefortelling",
      "home.startRecording": "Start AI Guide",
      "home.recentTrails": "Siste historier",
      "trails.noTrails": "Ingen historier ennå",
      "settings.title": "Innstillinger",
      "settings.language": "Språk",
      "settings.privacy": "Personvern",
      "settings.backgroundRecording": "Bakgrunnsopptak",
      "settings.offlineMaps": "Offline-kart",
      "settings.analytics": "Analytics",
    },
  },
};

i18n.use(initReactI18next).init({
  compatibilityJSON: "v4",
  resources,
  lng: "nb",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
