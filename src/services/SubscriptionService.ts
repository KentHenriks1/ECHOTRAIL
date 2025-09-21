// Mock Purchases for demo - replace with actual react-native-purchases in production
interface MockPurchasesOffering {
  identifier: string;
  serverDescription: string;
  availablePackages: any[];
}

const Purchases = {
  configure: (config: any) => Promise.resolve(),
  getCustomerInfo: () =>
    Promise.resolve({
      entitlements: { active: {} },
    }),
  getOfferings: () => Promise.resolve({ all: {} }),
  purchaseProduct: (productId: string) =>
    Promise.resolve({
      customerInfo: { entitlements: { active: { [productId]: true } } },
    }),
  restorePurchases: () => Promise.resolve(),
};

type PurchasesOffering = MockPurchasesOffering;

import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "../utils/logger";

export type SubscriptionTier = "free" | "premium" | "pro" | "enterprise";

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt?: Date;
  monthlyToursUsed: number;
  monthlyToursLimit: number;
  features: SubscriptionFeatures;
}

export interface SubscriptionFeatures {
  unlimitedTours: boolean;
  premiumVoices: boolean;
  offlineAreas: number;
  hdQuality: boolean;
  noAds: boolean;
  exportFeatures: boolean;
  teamSharing: boolean;
  prioritySupport: boolean;
}

class SubscriptionService {
  private static instance: SubscriptionService;
  private currentStatus: SubscriptionStatus | null = null;

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  /**
   * Initialize RevenueCat
   */
  async initialize(): Promise<void> {
    try {
      // Configure RevenueCat
      Purchases.configure({
        apiKey: "your_revenuecat_api_key", // Replace with actual key
        appUserID: null, // Will use anonymous user
      });

      // Load current subscription status
      await this.refreshSubscriptionStatus();

      logger.debug("SubscriptionService initialized");
    } catch (error) {
      logger.error("Failed to initialize SubscriptionService:", error);
    }
  }

  /**
   * Get current subscription status
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    if (!this.currentStatus) {
      await this.refreshSubscriptionStatus();
    }
    return this.currentStatus || this.getDefaultFreeStatus();
  }

  /**
   * Refresh subscription from RevenueCat
   */
  async refreshSubscriptionStatus(): Promise<void> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();

      // Determine tier based on active entitlements
      let tier: SubscriptionTier = "free";
      let isActive = false;
      let expiresAt: Date | undefined;

      const activeEntitlements = customerInfo.entitlements.active as Record<
        string,
        any
      >;

      if (activeEntitlements["pro"]) {
        tier = "pro";
        isActive = true;
        expiresAt = new Date(activeEntitlements["pro"].expirationDate);
      } else if (activeEntitlements["premium"]) {
        tier = "premium";
        isActive = true;
        expiresAt = new Date(activeEntitlements["premium"].expirationDate);
      }

      // Get usage from local storage
      const monthlyToursUsed = await this.getMonthlyUsage();

      this.currentStatus = {
        tier,
        isActive,
        expiresAt,
        monthlyToursUsed,
        monthlyToursLimit: this.getToursLimit(tier),
        features: this.getFeatures(tier),
      };

      // Save to local storage for offline access
      await AsyncStorage.setItem(
        "subscription_status",
        JSON.stringify(this.currentStatus)
      );
    } catch (error) {
      logger.error("Failed to refresh subscription status:", error);
      // Fallback to cached data
      await this.loadCachedStatus();
    }
  }

  /**
   * Get available subscription offerings
   */
  async getOfferings(): Promise<PurchasesOffering[]> {
    try {
      const offerings = await Purchases.getOfferings();
      return Object.values(offerings.all);
    } catch (error) {
      logger.error("Failed to get offerings:", error);
      return [];
    }
  }

  /**
   * Purchase subscription
   */
  async purchaseSubscription(productId: string): Promise<boolean> {
    try {
      const purchaseResult = await Purchases.purchaseProduct(productId);

      if (purchaseResult.customerInfo.entitlements.active[productId]) {
        await this.refreshSubscriptionStatus();
        return true;
      }

      return false;
    } catch (error) {
      logger.error("Purchase failed:", error);
      return false;
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases(): Promise<boolean> {
    try {
      await Purchases.restorePurchases();
      await this.refreshSubscriptionStatus();
      return true;
    } catch (error) {
      logger.error("Restore failed:", error);
      return false;
    }
  }

  /**
   * Check if user can use AI feature
   */
  async canUseAIFeature(): Promise<boolean> {
    const status = await this.getSubscriptionStatus();

    if (status.features.unlimitedTours) {
      return true;
    }

    return status.monthlyToursUsed < status.monthlyToursLimit;
  }

  /**
   * Increment tour usage
   */
  async incrementTourUsage(): Promise<void> {
    const currentUsage = await this.getMonthlyUsage();
    const newUsage = currentUsage + 1;

    await AsyncStorage.setItem("monthly_tours_used", newUsage.toString());
    await AsyncStorage.setItem("usage_month", new Date().getMonth().toString());

    if (this.currentStatus) {
      this.currentStatus.monthlyToursUsed = newUsage;
    }
  }

  /**
   * Private helper methods
   */
  private async getMonthlyUsage(): Promise<number> {
    try {
      const currentMonth = new Date().getMonth();
      const savedMonth = await AsyncStorage.getItem("usage_month");

      // Reset if new month
      if (savedMonth !== currentMonth.toString()) {
        await AsyncStorage.setItem("monthly_tours_used", "0");
        await AsyncStorage.setItem("usage_month", currentMonth.toString());
        return 0;
      }

      const usage = await AsyncStorage.getItem("monthly_tours_used");
      return usage ? parseInt(usage, 10) : 0;
    } catch {
      return 0;
    }
  }

  private getToursLimit(tier: SubscriptionTier): number {
    switch (tier) {
      case "free":
        return 5;
      case "premium":
        return -1; // unlimited
      case "pro":
        return -1; // unlimited
      case "enterprise":
        return -1; // unlimited
      default:
        return 5;
    }
  }

  private getFeatures(tier: SubscriptionTier): SubscriptionFeatures {
    const features: Record<SubscriptionTier, SubscriptionFeatures> = {
      free: {
        unlimitedTours: false,
        premiumVoices: false,
        offlineAreas: 3,
        hdQuality: false,
        noAds: false,
        exportFeatures: false,
        teamSharing: false,
        prioritySupport: false,
      },
      premium: {
        unlimitedTours: true,
        premiumVoices: true,
        offlineAreas: 20,
        hdQuality: true,
        noAds: true,
        exportFeatures: true,
        teamSharing: false,
        prioritySupport: false,
      },
      pro: {
        unlimitedTours: true,
        premiumVoices: true,
        offlineAreas: -1, // unlimited
        hdQuality: true,
        noAds: true,
        exportFeatures: true,
        teamSharing: true,
        prioritySupport: true,
      },
      enterprise: {
        unlimitedTours: true,
        premiumVoices: true,
        offlineAreas: -1, // unlimited
        hdQuality: true,
        noAds: true,
        exportFeatures: true,
        teamSharing: true,
        prioritySupport: true,
      },
    };

    return features[tier];
  }

  private getDefaultFreeStatus(): SubscriptionStatus {
    return {
      tier: "free",
      isActive: false,
      monthlyToursUsed: 0,
      monthlyToursLimit: 5,
      features: this.getFeatures("free"),
    };
  }

  private async loadCachedStatus(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem("subscription_status");
      if (cached) {
        this.currentStatus = JSON.parse(cached);
      }
    } catch (error) {
      logger.error("Failed to load cached status:", error);
    }
  }
}

export default SubscriptionService.getInstance();
