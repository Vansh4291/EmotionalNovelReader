module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  // Do NOT babel-transform node_modules by default: transforming the bundled
  // pdf.js inside pdf-parse breaks its xref parsing ("bad XRef entry").
  transformIgnorePatterns: ['/node_modules/'],
  // string-strip-html resolves to an ESM-only build under Node; map jest to
  // its UMD build which is CommonJS-compatible.
  moduleNameMapper: {
    '^string-strip-html$':
      '<rootDir>/node_modules/string-strip-html/dist/string-strip-html.umd.js',
  },
  testTimeout: 30000,
  // Isolate test data (books_db.json, progress_db.json, uploads) per test
  // FILE so parallel workers never contend on the same files (Windows EPERM
  // on rename) and never touch the developer's real database.
  setupFiles: ['./tests/setupEnv.js'],
};
