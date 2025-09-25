/**
 * Production-ready Babel Configuration for EchoTrail Mobile
 * 
 * Focused configuration supporting:
 * - TypeScript compilation with export type support
 * - React Native and Expo SDK compatibility
 * - Metro bundler optimization integration
 * - Minimal plugin conflicts
 * - Enterprise-grade reliability
 */

module.exports = function (api) {
  // Enable config caching for better performance
  api.cache.using(() => process.env.NODE_ENV);
  
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // TypeScript support with export type handling
          typescript: {
            allowNamespaces: true,
            allowDeclareFields: true,
            onlyRemoveTypeImports: true,
          },
          // Let Metro handle modules
          modules: false,
        },
      ],
    ],
    
    // Environment-specific optimizations
    env: {
      test: {
        presets: [
          [
            'babel-preset-expo',
            {
              typescript: {
                allowNamespaces: true,
                allowDeclareFields: true,
                onlyRemoveTypeImports: true,
              },
              modules: 'commonjs', // Jest compatibility
            },
          ],
        ],
      },
    },
  };
};
