const { getDefaultConfig } = require("expo/metro-config");

/**
 * Metro configuration for standalone Expo app with SDK 54.
 * Uses Expo's default config with minimal customizations.
 */
const config = getDefaultConfig(__dirname);

// Add support for additional asset types
config.resolver.assetExts.push(
  // 3D model formats
  "glb",
  "gltf",
  "mtl",
  "obj"
);

module.exports = config;
