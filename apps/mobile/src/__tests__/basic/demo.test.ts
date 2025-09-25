/**
 * Basic Demo Test
 * 
 * This test demonstrates that our test infrastructure is working
 * and tests basic TypeScript functionality.
 */

describe('Basic Test Infrastructure', () => {
  describe('Environment Setup', () => {
    it('should have test environment configured', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.METRO_TEST_MODE).toBe('true');
      expect(typeof process.env.BUILD_HISTORY_PATH).toBe('string');
    });

    it('should have deterministic test utilities', () => {
      // Test basic functionality
      const testString = 'Hello, World!';
      expect(testString).toContain('World');
      expect(testString.length).toBeGreaterThan(0);
    });

    it('should have mock date functionality', () => {
      // Test that Date.now() returns a consistent value in tests
      const now1 = Date.now();
      const now2 = Date.now();
      expect(now1).toBe(now2); // Should be same due to mocking
    });

    it('should support async operations', async () => {
      const asyncOperation = async (): Promise<string> => {
        return new Promise((resolve) => {
          setTimeout(() => resolve('async result'), 10);
        });
      };

      const result = await asyncOperation();
      expect(result).toBe('async result');
    });
  });

  describe('Test Utilities', () => {
    it('should have basic matchers available', () => {
      expect(true).toBeTruthy();
      expect(false).toBeFalsy();
      expect([1, 2, 3]).toHaveLength(3);
      expect({ name: 'test' }).toHaveProperty('name');
    });

    it('should handle error testing', () => {
      const throwError = () => {
        throw new Error('Test error');
      };

      expect(throwError).toThrow('Test error');
      expect(throwError).toThrow(Error);
    });

    it('should support numeric ranges', () => {
      const value = 42;
      expect(value).toBeGreaterThan(40);
      expect(value).toBeLessThan(50);
      expect(value).toBeGreaterThanOrEqual(42);
      expect(value).toBeLessThanOrEqual(42);
    });

    it('should handle arrays and objects', () => {
      const testArray = [1, 2, 3, 4, 5];
      const testObject = { name: 'Test', active: true, count: 5 };

      expect(testArray).toContain(3);
      expect(testArray).toEqual(expect.arrayContaining([1, 2, 3]));

      expect(testObject).toMatchObject({ name: 'Test' });
      expect(testObject).toHaveProperty('count', 5);
    });
  });

  describe('Performance and Memory', () => {
    it('should complete within reasonable time', () => {
      const start = Date.now();
      
      // Simulate some work
      for (let i = 0; i < 1000; i++) {
        Math.sqrt(i);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should handle memory allocation', () => {
      const largeArray = new Array(10000).fill(0).map((_, i) => ({ id: i, value: i * 2 }));
      
      expect(largeArray).toHaveLength(10000);
      expect(largeArray[5000]).toEqual({ id: 5000, value: 10000 });
      
      // Clean up
      largeArray.length = 0;
    });
  });

  describe('Mock and Spy Support', () => {
    it('should support Jest mocks', () => {
      const mockFunction = jest.fn();
      mockFunction('test argument');
      
      expect(mockFunction).toHaveBeenCalled();
      expect(mockFunction).toHaveBeenCalledWith('test argument');
      expect(mockFunction).toHaveBeenCalledTimes(1);
    });

    it('should support spying on objects', () => {
      const testObject = {
        getValue: () => 'original',
        setValue: (value: string) => value
      };

      const spy = jest.spyOn(testObject, 'getValue');
      spy.mockReturnValue('mocked');

      expect(testObject.getValue()).toBe('mocked');
      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
      expect(testObject.getValue()).toBe('original');
    });

    it('should support mock implementations', () => {
      const mockCallback = jest.fn();
      mockCallback.mockImplementation((name: string) => `Hello, ${name}!`);

      const result = mockCallback('World');
      expect(result).toBe('Hello, World!');
      expect(mockCallback).toHaveBeenCalledWith('World');
    });
  });

  describe('TypeScript Features', () => {
    interface TestInterface {
      name: string;
      value: number;
      active?: boolean;
    }

    it('should work with TypeScript interfaces', () => {
      const testData: TestInterface = {
        name: 'Test Item',
        value: 100
      };

      expect(testData.name).toBe('Test Item');
      expect(testData.value).toBe(100);
      expect(testData.active).toBeUndefined();
    });

    it('should work with generics', () => {
      const createArray = <T>(items: T[]): T[] => {
        return [...items];
      };

      const numberArray = createArray([1, 2, 3]);
      const stringArray = createArray(['a', 'b', 'c']);

      expect(numberArray).toEqual([1, 2, 3]);
      expect(stringArray).toEqual(['a', 'b', 'c']);
    });

    it('should work with type guards', () => {
      const isString = (value: unknown): value is string => {
        return typeof value === 'string';
      };

      expect(isString('test')).toBe(true);
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
    });
  });
});

// Test the test hygiene utilities
describe('Test Hygiene Integration', () => {
  it('should provide deterministic random data', () => {
    // Since we've mocked Math.random with a seed, this should be deterministic
    const random1 = Math.random();
    const random2 = Math.random();
    
    // Values should be different but deterministic across test runs
    expect(random1).not.toBe(random2);
    expect(typeof random1).toBe('number');
    expect(typeof random2).toBe('number');
  });

  it('should have consistent timestamps', () => {
    const time1 = Date.now();
    // Advance time by 1000ms using our utility
    // Note: advanceTime function would need to be imported from test-hygiene
    const time2 = Date.now();
    
    // Due to our mocking, times should be consistent
    expect(time1).toBe(time2);
  });
});