const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable package.json `exports` so Firebase uses its browser build instead of Node.js (gRPC).
config.resolver.unstable_enablePackageExports = true;

// For web, use browser condition so Firebase picks ./dist/index.cjs.js (not gRPC Node build).
// Keep 'require' and 'default' as fallbacks for other packages.
config.resolver.unstable_conditionNames = ['browser', 'require', 'default'];

module.exports = config;
