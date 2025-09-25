// NOTE: This is a stub file to prevent TypeScript errors
// Real navigation dependencies are missing

import { logger } from "../utils/logger";
import { NotificationData } from "./NotificationService";

export type RootStackParamList = {
  Home: undefined;
  TrailDetails: { trailId: string };
  TrailShare: { shareId: string };
  Recording: undefined;
  Settings: undefined;
  NotificationSettings: undefined;
  ConflictResolution: undefined;
  OfflineMaps: undefined;
  Trails: undefined;
};

// Mock navigation ref
const navigationRef = {
  isReady: () => false,
  navigate: (name: any, params?: any) =>
    logger.debug("Mock navigate:", name, params),
  goBack: () => logger.debug("Mock goBack"),
  canGoBack: () => false,
  dispatch: (action: any) => logger.debug("Mock dispatch:", action),
  getCurrentRoute: () => ({ name: "Home" }),
  getState: () => ({ routes: [{ name: "Home" }] }),
};

const CommonActions = {
  reset: (options: any) => ({ type: "RESET", payload: options }),
};

class NavigationService {
  navigate<RouteName extends keyof RootStackParamList>(
    name: RouteName,
    params?: RootStackParamList[RouteName]
  ): void {
    logger.debug("Mock navigation to:", name, params);
  }

  goBack(): void {
    logger.debug("Mock goBack");
  }

  reset(routeName: keyof RootStackParamList, params?: any): void {
    logger.debug("Mock reset to:", routeName, params);
  }

  getCurrentRoute(): string | undefined {
    return "Home";
  }

  handleNotificationNavigation(notificationData: NotificationData): void {
    logger.debug("Mock handleNotificationNavigation:", notificationData);
  }

  private handleTrailSharingNavigation(
    _notificationData: NotificationData
  ): void {
    logger.debug("Mock handleTrailSharingNavigation");
  }

  private handleTrailUpdateNavigation(
    _notificationData: NotificationData
  ): void {
    logger.debug("Mock handleTrailUpdateNavigation");
  }

  private handleSyncCompletionNavigation(
    _notificationData: NotificationData
  ): void {
    logger.debug("Mock handleSyncCompletionNavigation");
  }

  private handleSystemUpdateNavigation(
    _notificationData: NotificationData
  ): void {
    logger.debug("Mock handleSystemUpdateNavigation");
  }

  private handleReminderNavigation(_notificationData: NotificationData): void {
    logger.debug("Mock handleReminderNavigation");
  }

  private handleOfflineMapNavigation(
    _notificationData: NotificationData
  ): void {
    logger.debug("Mock handleOfflineMapNavigation");
  }

  handleDeepLink(url: string): void {
    logger.debug("Mock handleDeepLink:", url);
  }

  isNavigationReady(): boolean {
    return false;
  }

  getNavigationStackLength(): number {
    return 1;
  }
}

export default new NavigationService();
export { navigationRef };
