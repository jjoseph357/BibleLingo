const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Intercept Zustand imports to force Metro to use the CJS files instead of the ESM files.
// The ESM files contain 'import.meta' which causes SyntaxErrors on Web/Hermes.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('zustand')) {
    if (moduleName === 'zustand/vanilla') {
      return {
        filePath: path.resolve(__dirname, 'node_modules/zustand/vanilla.js'),
        type: 'sourceFile',
      };
    }
    if (moduleName === 'zustand/middleware') {
      return {
        filePath: path.resolve(__dirname, 'node_modules/zustand/middleware.js'),
        type: 'sourceFile',
      };
    }
    if (moduleName === 'zustand') {
      return {
        filePath: path.resolve(__dirname, 'node_modules/zustand/index.js'),
        type: 'sourceFile',
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
