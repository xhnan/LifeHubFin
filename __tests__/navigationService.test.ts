import {ROUTES} from '../src/constants/routes';

const mockNavigationRef = {
  isReady: jest.fn(),
  navigate: jest.fn(),
  resetRoot: jest.fn(),
  canGoBack: jest.fn(),
  goBack: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: jest.fn(() => mockNavigationRef),
}));

jest.mock('../src/services/auth', () => ({
  removeAuthTokens: jest.fn(() => Promise.resolve()),
}));

describe('navigationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigationRef.isReady.mockReturnValue(true);
    mockNavigationRef.canGoBack.mockReturnValue(true);
  });

  it('navigates, resets and goes back only when the container is ready', () => {
    const service = require('../src/services/navigationService') as typeof import('../src/services/navigationService');

    service.navigate(ROUTES.receipt);
    service.reset(ROUTES.home);
    service.goBack();

    expect(mockNavigationRef.navigate).toHaveBeenCalledWith(ROUTES.receipt, undefined);
    expect(mockNavigationRef.resetRoot).toHaveBeenCalledWith({
      index: 0,
      routes: [{name: ROUTES.home, params: undefined}],
    });
    expect(mockNavigationRef.goBack).toHaveBeenCalledTimes(1);

    mockNavigationRef.isReady.mockReturnValue(false);
    service.navigate(ROUTES.receipt);
    service.reset(ROUTES.home);
    service.goBack();

    expect(mockNavigationRef.navigate).toHaveBeenCalledTimes(1);
    expect(mockNavigationRef.resetRoot).toHaveBeenCalledTimes(1);
    expect(mockNavigationRef.goBack).toHaveBeenCalledTimes(1);
  });

  it('clears auth state and invokes the registered expiration callback', async () => {
    const {removeAuthTokens} = require('../src/services/auth') as {
      removeAuthTokens: jest.Mock;
    };
    const service = require('../src/services/navigationService') as typeof import('../src/services/navigationService');
    const expiredCallback = jest.fn();

    service.registerTokenExpiredCallback(expiredCallback);

    await service.handleTokenExpired();
    await service.logout();

    expect(removeAuthTokens).toHaveBeenCalledTimes(2);
    expect(expiredCallback).toHaveBeenCalledTimes(2);
  });
});
