/**
 * Global type definitions for React Native and Expo modules
 */

// Node.js global types for Buffer and NodeJS namespace
declare global {
  // Buffer API (available in Node.js environment during builds)
  interface BufferConstructor {
    from(_array: any[], _encoding?: BufferEncoding): Buffer;
    from(_data: Uint8Array): Buffer;
    from(_data: readonly number[]): Buffer;
    from(_data: string, _encoding?: BufferEncoding): Buffer;
    alloc(_size: number, _fill?: string | Buffer | number, _encoding?: BufferEncoding): Buffer;
    allocUnsafe(_size: number): Buffer;
    byteLength(_string: string | Buffer | Uint8Array, _encoding?: BufferEncoding): number;
  }
  
  interface Buffer extends Uint8Array {
    toString(_encoding?: BufferEncoding, _start?: number, _end?: number): string;
    byteLength: number;
  }
  
  var Buffer: BufferConstructor;
  
  // NodeJS namespace
  namespace NodeJS {
    interface Timeout {
      hasRef(): boolean;
      ref(): this;
      refresh(): this;
      unref(): this;
    }
    
    interface Immediate {
      hasRef(): boolean;
      ref(): this;
      unref(): this;
    }
    
    interface Timer extends Timeout {}
  }
}

// React Native ErrorUtils (available in React Native environment)
declare global {
  interface Global {
    ErrorUtils?: {
      getGlobalHandler?: () => Function;
      setGlobalHandler?: (_handler: Function) => void;
    };
  }

  // Extend globalThis with ErrorUtils
  var ErrorUtils:
    | {
        getGlobalHandler?: () => Function;
        setGlobalHandler?: (_handler: Function) => void;
      }
    | undefined;
}

// Performance API extensions
declare global {
  interface Performance {
    timeOrigin?: number;
  }
}

// Expo FileSystem extensions
declare module "expo-file-system" {
  export const documentDirectory: string | null;
  export const EncodingType: {
    UTF8: "utf8";
    Base64: "base64";
  };
}

// Expo AV extensions
declare module "expo-av" {
  export namespace Audio {
    export const INTERRUPTION_MODE_IOS_DO_NOT_MIX: number;
    export const INTERRUPTION_MODE_ANDROID_DO_NOT_MIX: number;

    export interface AudioStatus {
      isLoaded: boolean;
      isPlaying?: boolean;
      positionMillis?: number;
      durationMillis?: number;
      volume?: number;
    }

    export class Sound {
      loadAsync(
        _uri: string,
        _initialStatus?: any
      ): Promise<{ status: AudioStatus }>;
      playAsync(): Promise<{ status: AudioStatus }>;
      pauseAsync(): Promise<{ status: AudioStatus }>;
      stopAsync(): Promise<{ status: AudioStatus }>;
      unloadAsync(): Promise<{ status: AudioStatus }>;
      setVolumeAsync(_volume: number): Promise<{ status: AudioStatus }>;
      getStatusAsync(): Promise<{ status: AudioStatus }>;
      setOnPlaybackStatusUpdate(
        _onPlaybackStatusUpdate: (_status: AudioStatus) => void
      ): void;
    }

    export function setAudioModeAsync(_mode: {
      interruptionModeIOS?: number;
      interruptionModeAndroid?: number;
      allowsRecordingIOS?: boolean;
      playsInSilentModeIOS?: boolean;
      staysActiveInBackground?: boolean;
      shouldDuckAndroid?: boolean;
      playThroughEarpieceAndroid?: boolean;
    }): Promise<void>;
  }
}

// PerformanceMonitor metric types
declare module "../core/utils/PerformanceMonitor" {
  export type MetricUnit = "ms" | "bytes" | "count" | "percent" | "custom";
}

export {};
