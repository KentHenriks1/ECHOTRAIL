/**
 * Theme utilities for safe casting of React Native style properties
 */

import { TextStyle } from "react-native";
import { ThemeConfig } from "../config";

/**
 * Safely cast font weight to React Native compatible type
 */
export function getFontWeight(
  weight: keyof typeof ThemeConfig.typography.fontWeight
): TextStyle["fontWeight"] {
  const fontWeights = ThemeConfig.typography.fontWeight;

  switch (weight) {
    case "light":
      return fontWeights.light as TextStyle["fontWeight"];
    case "normal":
      return fontWeights.normal as TextStyle["fontWeight"];
    case "medium":
      return fontWeights.medium as TextStyle["fontWeight"];
    case "bold":
      return fontWeights.bold as TextStyle["fontWeight"];
    default:
      return fontWeights.normal as TextStyle["fontWeight"];
  }
}

