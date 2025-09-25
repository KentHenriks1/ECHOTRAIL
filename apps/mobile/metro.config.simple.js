const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Simplified config to avoid Metro issues
module.exports = {
  ...config,
  maxWorkers: 2,
  transformer: {
    ...config.transformer,
    minifierPath: require.resolve('metro-minify-terser'),
  },
};