jest.mock('../src/services/api', () => ({
  authFetch: jest.fn(),
}));

import {
  consumeAutoCheckWindow,
  resetAutoCheckWindowForTesting,
} from '../src/services/versionCheck';

describe('versionCheck', () => {
  beforeEach(() => {
    resetAutoCheckWindowForTesting();
  });

  it('throttles automatic checks within the configured interval', () => {
    expect(consumeAutoCheckWindow(1_000)).toBe(true);
    expect(consumeAutoCheckWindow(2_000)).toBe(false);
    expect(consumeAutoCheckWindow(1_000 + 30 * 60 * 1000 + 1)).toBe(true);
  });
});
