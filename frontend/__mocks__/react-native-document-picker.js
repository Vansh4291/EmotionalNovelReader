module.exports = {
  pick: jest.fn(() => Promise.resolve([])),
  pickMultiple: jest.fn(() => Promise.resolve([])),
  pickDirectory: jest.fn(() => Promise.resolve(null)),
  types: {},
};
