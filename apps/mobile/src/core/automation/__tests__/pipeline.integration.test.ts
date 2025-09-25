/**
 * Integration tests for the full Metro build pipeline workflow
 */

import { MetroBuildPipeline } from '../MetroBuildPipeline';

// Mock all external dependencies
jest.mock('fs/promises');
jest.mock('child_process');
jest.mock('../../utils/Logger');
jest.mock('../../monitoring/MetroPerformanceMonitor');
jest.mock('../../caching/MetroCacheManager');

describe('Pipeline Integration', () => {
  beforeEach(() => {
    // Reset singleton to ensure clean state across tests
    (MetroBuildPipeline as any).instance = undefined;
    jest.clearAllMocks();
  });

  it('instantiates and initializes pipeline without errors', () => {
    const pipeline = MetroBuildPipeline.getInstance();
    expect(pipeline).toBeInstanceOf(MetroBuildPipeline);
    expect(() => pipeline.initialize()).not.toThrow();
  });

  it('maintains singleton behavior across calls', () => {
    const pipeline1 = MetroBuildPipeline.getInstance();
    const pipeline2 = MetroBuildPipeline.getInstance();
    expect(pipeline1).toBe(pipeline2);
  });
});
