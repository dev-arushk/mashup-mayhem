// tslint:disable
/* eslint-disable */
import {useEffect, useRef, useState} from 'react';
import {syncDocumentLocaleDirection} from './utils/usePlayground';

/**
 * @fileoverview Hook for interacting with the Playground SDK in multiplayer games.
 */

/**
 * Hook to interact with Playground SDK features.
 * Dynamically loads the script and initializes the SDK.
 * Please ensure you keep this script exactly the same when you use it in your
 *  project. It is important to make the SDK work both for preview and
 *  production.
 */
export function usePlaygroundMultiplayer() {
  const [isReady, setIsReady] = useState(false);
  const sdkRef = useRef<any>(null);

  // Use refs for callbacks to ensure they always have access to the latest React state
  const onGameEventRef = useRef<((event: any) => void) | null>(null);
  const onPresenceEventRef = useRef<((presence: any) => void) | null>(null);
  const onLobbyStatusRef = useRef<((status: any) => void) | null>(null);

  useEffect(() => {
    syncDocumentLocaleDirection();
  }, []);

  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (sdkRef.current) return;

    const loadScript = () => {
      return new Promise<void>((resolve, reject) => {
        if ((window as any).PlaygroundSDK) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src =
          'https://www.gstatic.com/play/games/playground/sdk/v1/playground.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error('Failed to load Playground SDK script'));
        document.head.appendChild(script);
      });
    };

    const initSDK = async () => {
      try {
        const isPlaygroundPreview =
          (window as any).__PLAYGROUND_PREVIEW__ === true;
        const isLobbyIdNotSet =
          (window as any).PLAYGROUND_LOBBY_ID === undefined ||
          (window as any).PLAYGROUND_LOBBY_ID === null ||
          (window as any).PLAYGROUND_LOBBY_ID === '';

        // Multiplayer preview routing
        const isLocalOrPreview = isPlaygroundPreview || isLobbyIdNotSet;

        if (isLocalOrPreview) {
          console.log(
            '🔌 [usePlaygroundMultiplayer] Local or Preview environment. Loading Split-Screen Fake SDK...',
          );
          // Opt this game into the fake SDK's split-screen orchestration.
          // Single-player games never set this, so they are never hijacked.
          (window as any).__PLAYGROUND_MULTIPLAYER__ = true;
          // @ts-ignore - Dynamic import
          const module = await import('./utils/playground-fake');
          (window as any).PlaygroundSDK = module.FakePlaygroundSDK;
        } else {
          await loadScript();
        }

        if ((window as any).PlaygroundSDK) {
          sdkRef.current = new (window as any).PlaygroundSDK();

          // Wrap callbacks to fire whatever function is currently in the Ref
          await sdkRef.current.init(
            (event: any) => onGameEventRef.current?.(event),
            (presence: any) => onPresenceEventRef.current?.(presence),
            (status: any) => onLobbyStatusRef.current?.(status),
          );

          setIsReady(true);
        } else {
          console.error('Playground SDK class not found after script load.');
        }
      } catch (error) {
        console.error('Playground SDK initialization failed:', error);
      }
    };

    initSDK();
  }, []);

  return {
    sdk: sdkRef.current,
    isReady,
    onGameEventRef,
    onPresenceEventRef,
    onLobbyStatusRef,
  };
}
