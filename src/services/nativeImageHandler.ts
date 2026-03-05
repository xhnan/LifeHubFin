import {NativeModules, DeviceEventEmitter, Platform} from 'react-native';
import type {EmitterSubscription} from 'react-native';

const LINKING_ERROR =
  `The package 'ImageHandler' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ios: "You have run 'pod install'\n", default: ''}) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const ImageHandler = NativeModules.ImageHandler
  ? NativeModules.ImageHandler
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      },
    );

interface ImageHandlerInterface {
  getLastSharedImage(): Promise<string | null>;
  clearSharedImage(): Promise<void>;
  getAllSharedImages(): Promise<string[]>;
  saveSharedImage(uri: string): Promise<void>;
}

export type {EmitterSubscription};

/**
 * Event emitted when an image is shared via Android share sheet
 * @eventType ImageShareReceived
 * @param {string} imagePath - The URI of the shared image
 */
export type ImageShareEvent = {
  imagePath: string;
};

/**
 * Native Image Handler Service
 *
 * Provides functionality to handle images shared from Android's share sheet.
 * This service is only available on Android.
 *
 * @example
 * ```tsx
 * // Listen for shared images
 * const unsubscribe = NativeImageHandler.addListener((imagePath) => {
 *   console.log('Received shared image:', imagePath);
 *   navigation.navigate('ReceiptScreen', { initialImageUri: imagePath });
 * });
 *
 * // Get the last shared image
 * const lastImage = await NativeImageHandler.getLastSharedImage();
 *
 * // Clean up
 * await NativeImageHandler.clearSharedImage();
 * unsubscribe.remove();
 * ```
 */
class NativeImageHandlerService implements ImageHandlerInterface {
  /**
   * Get the last shared image URI
   * @returns Promise<string | null> - The URI of the last shared image, or null if none exists
   */
  getLastSharedImage(): Promise<string | null> {
    return ImageHandler.getLastSharedImage();
  }

  /**
   * Clear the last shared image from cache
   * This should be called after processing the shared image
   * @returns Promise<void>
   */
  clearSharedImage(): Promise<void> {
    return ImageHandler.clearSharedImage();
  }

  /**
   * Get all shared images (currently stored in memory)
   * @returns Promise<string[]> - Array of shared image URIs
   */
  getAllSharedImages(): Promise<string[]> {
    return ImageHandler.getAllSharedImages();
  }

  /**
   * Save a shared image URI to the internal storage
   * This is called automatically by the native share receiver
   * @param uri - The URI of the shared image
   * @returns Promise<void>
   */
  saveSharedImage(uri: string): Promise<void> {
    return ImageHandler.saveSharedImage(uri);
  }

  /**
   * Add a listener for image share events
   * @param callback - Function to call when an image is shared
   * @returns EmitterSubscription - Call `.remove()` to unsubscribe
   */
  addListener(callback: (imagePath: string) => void): EmitterSubscription {
    return DeviceEventEmitter.addListener('ImageShareReceived', callback);
  }

  /**
   * Remove all listeners for image share events
   */
  removeAllListeners(): void {
    DeviceEventEmitter.removeAllListeners('ImageShareReceived');
  }
}

export const NativeImageHandler = new NativeImageHandlerService();

/**
 * Hook to handle shared images in React components
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {lastSharedImage, clearImage, isLoading} = useSharedImage();
 *
 *   useEffect(() => {
 *     if (lastSharedImage) {
 *       // Process the shared image
 *       processImage(lastSharedImage);
 *     }
 *   }, [lastSharedImage]);
 *
 *   return <View>...</View>;
 * }
 * ```
 */
export const useSharedImage = () => {
  const [lastSharedImage, setLastSharedImage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchLastImage = async () => {
    setIsLoading(true);
    try {
      const image = await NativeImageHandler.getLastSharedImage();
      setLastSharedImage(image);
    } catch (error) {
      console.error('Failed to get last shared image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearImage = async () => {
    try {
      await NativeImageHandler.clearSharedImage();
      setLastSharedImage(null);
    } catch (error) {
      console.error('Failed to clear shared image:', error);
    }
  };

  return {
    lastSharedImage,
    clearImage,
    isLoading,
    fetchLastImage,
  };
};

import React from 'react';

export default NativeImageHandler;
