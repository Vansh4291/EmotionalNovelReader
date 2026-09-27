const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');

/**
 * Metro configuration
 *
 * Env resolution: if `src/config/Env.local.js` exists (gitignored), Metro
 * resolves `src/config/Env` to it first, letting developers keep local
 * secrets out of the repo.
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {};

const envLocalPath = path.resolve(__dirname, 'src/config/Env.local.js');
const hasEnvLocal = fs.existsSync(envLocalPath);

const finalConfig = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [path.resolve(__dirname, '../shared')],
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (hasEnvLocal && context.originModulePath && context.originModulePath.match(/config[\\/]api\.js$/) && moduleName === './Env') {
        return { filePath: envLocalPath, type: 'sourceFile' };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
});

module.exports = finalConfig;
