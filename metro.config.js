const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

// Axios v1+ sets `"main"` to the Node build (requires `crypto`, `http`, ...).
// Enabling package "exports" lets Metro pick the `"react-native"` condition,
// which points to the browser/RN build.
const config = {
  resolver: {
    unstable_enablePackageExports: true,
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(defaultConfig, config);

