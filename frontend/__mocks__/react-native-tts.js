module.exports = {
  speak: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  voices: jest.fn(() => Promise.resolve([])),
  setDefaultLanguage: jest.fn(),
  setDefaultRate: jest.fn(),
  setDefaultPitch: jest.fn(),
  setIgnoreSilentSwitch: jest.fn(),
};
