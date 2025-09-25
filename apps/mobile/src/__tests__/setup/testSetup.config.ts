/**
 * Additional Test Configuration
 * Extra setup for specific test requirements
 */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to silence logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
}

// Global test utilities
global.testUtils = {
  waitForAsync: (_ms: number = 0) => new Promise(resolve => {
    setTimeout(resolve, _ms);
  }),
  mockDateTime: (_date: string) => {
    const mockDate = new Date(_date)
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any)
  },
  restoreDateTime: () => {
    ;(global.Date as any).mockRestore?.()
  },
}

// Declare global test utilities type
declare global {
  var testUtils: {
    waitForAsync: (_ms?: number) => Promise<void>
    mockDateTime: (_date: string) => void
    restoreDateTime: () => void
  }
}

// Basic test to prevent Jest errors
describe('Test Setup Config', () => {
  it('should have global test utils', () => {
    expect(global.testUtils).toBeDefined();
    expect(global.testUtils.waitForAsync).toBeDefined();
  });
});

export {}
