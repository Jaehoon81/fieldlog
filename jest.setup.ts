jest.mock("@/modules/proximity-sensor", () => ({
  __esModule: true,
  default: {
    isAvailableAsync: jest.fn(),
    addListener: jest.fn(),
  },
}));
