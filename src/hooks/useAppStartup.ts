import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, InteractionManager} from 'react-native';
import SplashScreen from 'react-native-splash-screen';

import {restoreSessionToken} from '../services/auth';
import {
  handleTokenExpired,
  registerTokenExpiredCallback,
} from '../services/navigationService';
import {cleanupUpdateCache} from '../services/updateManager';
import {checkForUpdatesAuto} from '../services/versionCheck';
import type {VersionCheckResponse} from '../types/version';

type InteractionTask = ReturnType<typeof InteractionManager.runAfterInteractions>;

export function useAppStartup() {
  const [token, setToken] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionCheckResponse | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const isMountedRef = useRef(true);
  const versionCheckTaskRef = useRef<InteractionTask | null>(null);

  const cancelPendingVersionCheck = useCallback(() => {
    versionCheckTaskRef.current?.cancel();
    versionCheckTaskRef.current = null;
  }, []);

  const runVersionCheck = useCallback(() => {
    cancelPendingVersionCheck();

    versionCheckTaskRef.current = InteractionManager.runAfterInteractions(() => {
      versionCheckTaskRef.current = null;

      checkForUpdatesAuto()
        .then(info => {
          if (info && isMountedRef.current) {
            setVersionInfo(info);
            setShowUpdateModal(true);
          }
        })
        .catch(err => {
          console.warn('[App] automatic version check failed:', err);
        });
    });
  }, [cancelPendingVersionCheck]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cancelPendingVersionCheck();
    };
  }, [cancelPendingVersionCheck]);

  useEffect(() => {
    cleanupUpdateCache().catch(err => {
      console.warn('[App] cleanup update cache failed:', err);
    });

    const unregisterTokenExpiredCallback = registerTokenExpiredCallback(() => {
      setToken(null);
      setShowUpdateModal(false);
    });

    restoreSessionToken()
      .then(nextToken => {
        if (!isMountedRef.current) {
          return;
        }

        setToken(nextToken);

        if (nextToken) {
          runVersionCheck();
        }
      })
      .catch(async error => {
        console.warn('[App] failed to restore auth session:', error);
        await handleTokenExpired();
      })
      .finally(() => {
        if (!isMountedRef.current) {
          return;
        }

        setAuthInitialized(true);
        SplashScreen.hide();
      });

    return () => {
      unregisterTokenExpiredCallback();
    };
  }, [runVersionCheck]);

  useEffect(() => {
    if (!token) {
      cancelPendingVersionCheck();
      return;
    }

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        runVersionCheck();
      }
    });

    return () => subscription.remove();
  }, [cancelPendingVersionCheck, runVersionCheck, token]);

  const handleLoginSuccess = useCallback(
    (nextToken: string) => {
      setToken(nextToken);
      runVersionCheck();
    },
    [runVersionCheck],
  );

  return {
    authInitialized,
    token,
    versionInfo,
    showUpdateModal,
    handleLoginSuccess,
    closeUpdateModal: () => setShowUpdateModal(false),
  };
}
