module.exports = {
  haste: {
    defaultPlatform: 'ios',
    platforms: ['android', 'ios', 'native'],
  },
  setupFiles: [require.resolve('react-native/jest/setup.js'), './jest.setup.js'],
  moduleNameMapper: {
    '^realm$': '<rootDir>/__mocks__/realm.js',
    '^react-native-fs$': '<rootDir>/__mocks__/react-native-fs.js',
    '^react-native-document-picker$': '<rootDir>/__mocks__/react-native-document-picker.js',
    '^react-native-tts$': '<rootDir>/__mocks__/react-native-tts.js',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': require.resolve(
      'react-native/jest/assetFileTransformer.js',
    ),
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|react-native-gesture-handler|react-native-reanimated|react-native-screens|react-native-safe-area-context|react-native-tts|react-native-fs|react-native-document-picker|@react-native-community)/)',
  ],
  testEnvironment: require.resolve('react-native/jest/react-native-env.js'),
};
