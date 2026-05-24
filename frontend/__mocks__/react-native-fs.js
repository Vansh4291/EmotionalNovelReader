module.exports = {
  DocumentDirectoryPath: '',
  CachesDirectoryPath: '',
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  exists: jest.fn(() => Promise.resolve(false)),
  mkdir: jest.fn(),
  readDir: jest.fn(() => Promise.resolve([])),
  stat: jest.fn(() => Promise.resolve({})),
};
