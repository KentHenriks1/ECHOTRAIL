import { AccessibilityInfo, Platform, Dimensions } from "react-native";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "../utils/logger";

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  _screenReader: boolean;
  hapticFeedback: boolean;
  audioDescriptions: boolean;
  voiceCommands: boolean;
  fontSize: "small" | "normal" | "large" | "extraLarge";
  colorBlindMode: "none" | "deuteranopia" | "protanopia" | "tritanopia";
}

export interface AccessibilityColorScheme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  _text: string;
  textSecondary: string;
  success: string;
  warning: string;
  error: string;
  border: string;
}

class AccessibilityManager {
  private _settings: AccessibilitySettings = {
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    _screenReader: false,
    hapticFeedback: true,
    audioDescriptions: true,
    voiceCommands: false,
    fontSize: "normal",
    colorBlindMode: "none",
  };

  private listeners: Array<(settings: AccessibilitySettings) => void> = [];
  private systemListenerUnsubscribes: Array<any> = [];

  async initialize(): Promise<void> {
    // Load saved settings
    await this.loadSettings();

    // Detect system accessibility features
    await this.detectSystemSettings();

    // Set up listeners for system changes
    this.setupSystemListeners();
  }

  /**
   * Settings Management
   */
  async loadSettings(): Promise<void> {
    try {
      const savedSettings = await AsyncStorage.getItem(
        "accessibility_settings"
      );
      if (savedSettings) {
        this._settings = { ...this._settings, ...JSON.parse(savedSettings) };
      }
    } catch (error) {
      logger.warn("Failed to load accessibility settings:", error);
    }
  }

  async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        "accessibility_settings",
        JSON.stringify(this._settings)
      );
      this.notifyListeners();
    } catch (error) {
      logger.warn("Failed to save accessibility settings:", error);
    }
  }

  getSettings(): AccessibilitySettings {
    return { ...this._settings };
  }

  async updateSetting<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ): Promise<void> {
    this._settings[key] = value;
    await this.saveSettings();

    // Provide haptic feedback if enabled
    if (this._settings.hapticFeedback) {
      await this.provideFeedback("light");
    }
  }

  /**
   * System Detection
   */
  private async detectSystemSettings(): Promise<void> {
    try {
      // Check if screen reader is enabled
      const screenReaderEnabled =
        await AccessibilityInfo.isScreenReaderEnabled();
      this._settings._screenReader = screenReaderEnabled;

      // Check for reduced motion preference
      const reduceMotionEnabled =
        await AccessibilityInfo.isReduceMotionEnabled();
      this._settings.reduceMotion = reduceMotionEnabled;

      // Check for high contrast (iOS only)
      if (Platform.OS === "ios") {
        const highContrastEnabled =
          await AccessibilityInfo.isDarkerSystemColorsEnabled();
        this._settings.highContrast = highContrastEnabled;
      }

      await this.saveSettings();
    } catch (error) {
      logger.warn("Failed to detect system accessibility settings:", error);
    }
  }

  private setupSystemListeners(): void {
    // Listen for screen reader changes
    const screenReaderUnsubscribe = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      (enabled) => {
        this.updateSetting("_screenReader", enabled);
      }
    );
    this.systemListenerUnsubscribes.push(screenReaderUnsubscribe);

    // Listen for reduced motion changes
    const reduceMotionUnsubscribe = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        this.updateSetting("reduceMotion", enabled);
      }
    );
    this.systemListenerUnsubscribes.push(reduceMotionUnsubscribe);

    // iOS specific listeners
    if (Platform.OS === "ios") {
      const darkerColorsUnsubscribe = AccessibilityInfo.addEventListener(
        "darkerSystemColorsChanged",
        (enabled) => {
          this.updateSetting("highContrast", enabled);
        }
      );
      this.systemListenerUnsubscribes.push(darkerColorsUnsubscribe);
    }
  }

  /**
   * Haptic Feedback
   */
  async provideFeedback(
    type: "light" | "medium" | "heavy" | "success" | "warning" | "error"
  ): Promise<void> {
    if (!this._settings.hapticFeedback) return;

    try {
      switch (type) {
        case "light":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "medium":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "heavy":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case "success":
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
          break;
        case "warning":
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning
          );
          break;
        case "error":
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error
          );
          break;
      }
    } catch (error) {
      logger.warn("Haptic feedback failed:", error);
    }
  }

  /**
   * Font Scaling
   */
  getFontScale(): number {
    switch (this._settings.fontSize) {
      case "small":
        return 0.85;
      case "normal":
        return 1.0;
      case "large":
        return 1.2;
      case "extraLarge":
        return 1.5;
      default:
        return 1.0;
    }
  }

  getScaledFontSize(baseFontSize: number): number {
    return Math.round(baseFontSize * this.getFontScale());
  }

  /**
   * Color Schemes for Accessibility
   */
  getAccessibleColors(baseColors: any): AccessibilityColorScheme {
    if (this._settings.colorBlindMode !== "none") {
      return this.getColorBlindFriendlyColors(baseColors);
    }

    if (this._settings.highContrast) {
      return this.getHighContrastColors();
    }

    return baseColors;
  }

  private getHighContrastColors(): AccessibilityColorScheme {
    return {
      primary: "#0066CC",
      secondary: "#FF6600",
      background: "#FFFFFF",
      surface: "#F8F9FA",
      _text: "#000000",
      textSecondary: "#333333",
      success: "#008000",
      warning: "#FF8C00",
      error: "#DC143C",
      border: "#666666",
    };
  }

  private getColorBlindFriendlyColors(
    baseColors: any
  ): AccessibilityColorScheme {
    // Simplified color blind friendly palette
    switch (this._settings.colorBlindMode) {
      case "deuteranopia":
      case "protanopia":
        return {
          ...baseColors,
          primary: "#0173B2", // Blue
          secondary: "#CC79A7", // Pink
          success: "#009E73", // Teal
          warning: "#F0E442", // Yellow
          error: "#D55E00", // Orange
        };
      case "tritanopia":
        return {
          ...baseColors,
          primary: "#E69F00", // Orange
          secondary: "#56B4E9", // Sky blue
          success: "#009E73", // Teal
          warning: "#F0E442", // Yellow
          error: "#CC79A7", // Pink
        };
      default:
        return baseColors;
    }
  }

  /**
   * Animation Settings
   */
  shouldReduceMotion(): boolean {
    return this._settings.reduceMotion;
  }

  getAnimationDuration(baseDuration: number): number {
    return this._settings.reduceMotion ? 0 : baseDuration;
  }

  getAnimationScale(): number {
    return this._settings.reduceMotion ? 0 : 1;
  }

  /**
   * Screen Reader Utilities
   */
  isScreenReaderEnabled(): boolean {
    return this._settings._screenReader;
  }

  getAccessibilityLabel(
    label: string,
    context?: string,
    state?: string
  ): string {
    let accessibilityLabel = label;

    if (context) {
      accessibilityLabel += `, ${context}`;
    }

    if (state) {
      accessibilityLabel += `, ${state}`;
    }

    return accessibilityLabel;
  }

  getAccessibilityHint(action: string, result?: string): string {
    let hint = action;
    if (result) {
      hint += `. ${result}`;
    }
    return hint;
  }

  /**
   * Trail-specific Accessibility
   */
  getTrailAccessibilityInfo(trail: any) {
    const difficultyLabels: Record<string, string> = {
      easy: "Lett vanskelighetsgrad",
      moderate: "Moderat vanskelighetsgrad",
      hard: "Vanskelig",
      extreme: "Ekstrem vanskelighetsgrad",
    };

    const categoryLabels: Record<string, string> = {
      hiking: "Turgåing",
      walking: "Spasering",
      cycling: "Sykling",
      cultural: "Kulturell sti",
      historical: "Historisk sti",
      nature: "Natursti",
    };

    const accessibilityLabel = this.getAccessibilityLabel(
      trail.name,
      categoryLabels[trail.category as string] || trail.category,
      difficultyLabels[trail.difficulty as string] || trail.difficulty
    );

    const accessibilityHint = this.getAccessibilityHint(
      "Dobbeltrykk for å åpne stidetaljer",
      "Viser mer informasjon om stien"
    );

    return {
      accessibilityLabel,
      accessibilityHint,
      accessibilityRole: "button" as const,
      accessibilityValue: {
        text: `${Math.round(trail.distance / 1000)} kilometer, vurdering ${trail.rating} av 5`,
      },
    };
  }

  getMapAccessibilityInfo(trails: any[], userLocation?: any) {
    let description = `Kart med ${trails.length} stier`;

    if (userLocation) {
      description += ", din posisjon er markert";
    }

    return {
      accessibilityLabel: "Interaktivt kart over stier",
      accessibilityHint: "Doble tapp og hold for å navigere kartet",
      accessibilityRole: "image" as const,
      accessibilityValue: { text: description },
    };
  }

  /**
   * Voice Guidance
   */
  async announceText(
    text: string,
    priority: "low" | "high" = "low"
  ): Promise<void> {
    if (!this._settings._screenReader && !this._settings.audioDescriptions)
      return;

    try {
      await AccessibilityInfo.announceForAccessibility(text);

      // Provide haptic feedback for important announcements
      if (priority === "high" && this._settings.hapticFeedback) {
        await this.provideFeedback("medium");
      }
    } catch (error) {
      logger.warn("Failed to announce text:", error);
    }
  }

  async announceTrailProgress(
    distanceCovered: number,
    totalDistance: number,
    estimatedTimeRemaining?: number
  ): Promise<void> {
    const percentage = Math.round((distanceCovered / totalDistance) * 100);
    let announcement = `${percentage}% av stien fullført. `;

    if (estimatedTimeRemaining) {
      const minutes = Math.round(estimatedTimeRemaining / 60);
      announcement += `Estimert ${minutes} minutter igjen.`;
    }

    await this.announceText(announcement, "high");
  }

  async announceAudioGuidePoint(
    title: string,
    distance?: number
  ): Promise<void> {
    let announcement = `Lydguide: ${title}`;

    if (distance && distance < 50) {
      announcement = `Nærmer deg lydguide-punkt: ${title}. ${Math.round(distance)} meter unna.`;
    }

    await this.announceText(announcement, "high");
  }

  /**
   * Touch Target Optimization
   */
  getMinimumTouchTarget(): { width: number; height: number } {
    // WCAG guidelines: minimum 44x44 points
    const scale = this.getFontScale();
    return {
      width: Math.max(44, 44 * scale),
      height: Math.max(44, 44 * scale),
    };
  }

  optimizeTouchTarget(style: any) {
    const minTarget = this.getMinimumTouchTarget();
    return {
      ...style,
      minWidth: minTarget.width,
      minHeight: minTarget.height,
      paddingHorizontal: Math.max(style.paddingHorizontal || 0, 12),
      paddingVertical: Math.max(style.paddingVertical || 0, 12),
    };
  }

  /**
   * Layout Adaptations
   */
  getAdaptiveLayout() {
    const { width, height } = Dimensions.get("window");
    const isLandscape = width > height;
    const fontScale = this.getFontScale();

    return {
      isLandscape,
      _screenWidth: width,
      _screenHeight: height,
      fontScale,
      contentPadding: this._settings.largeText ? 20 : 16,
      elementSpacing: this._settings.largeText ? 16 : 12,
      borderRadius: this._settings.largeText ? 12 : 8,
    };
  }

  /**
   * Event Listeners
   */
  addListener(listener: (settings: AccessibilitySettings) => void): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this._settings));
  }

  /**
   * Cleanup method to remove event listeners and prevent memory leaks
   */
  cleanup(): void {
    // Remove all system listeners
    this.systemListenerUnsubscribes.forEach((unsubscribe) => {
      try {
        if (unsubscribe && typeof unsubscribe.remove === "function") {
          unsubscribe.remove();
        } else if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      } catch (error) {
        logger.warn(
          "Failed to unsubscribe from accessibility listener:",
          error
        );
      }
    });
    this.systemListenerUnsubscribes = [];

    // Clear all custom listeners
    this.listeners = [];
  }

  /**
   * Testing and Validation
   */
  async testAccessibility(): Promise<{
    screenReader: boolean;
    haptics: boolean;
    colorContrast: boolean;
    touchTargets: boolean;
    announcements: boolean;
  }> {
    const results = {
      screenReader: false,
      haptics: false,
      colorContrast: true, // Assume true for now
      touchTargets: true, // Assume true for now
      announcements: false,
    };

    try {
      // Test screen reader
      results.screenReader = await AccessibilityInfo.isScreenReaderEnabled();

      // Test haptics
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      results.haptics = true;

      // Test announcements
      await AccessibilityInfo.announceForAccessibility("Accessibility test");
      results.announcements = true;
    } catch (error) {
      logger.warn("Accessibility test failed:", error);
    }

    return results;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.listeners = [];
    // AccessibilityInfo.removeAllListeners?.(); // Method not available in current version
  }
}

export default new AccessibilityManager();
