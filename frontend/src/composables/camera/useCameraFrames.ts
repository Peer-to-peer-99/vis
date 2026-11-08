import { onMounted, onUnmounted, ref } from 'vue';
import type { UnlistenFn } from '@tauri-apps/api/event';

import { CameraService } from '@/services/camera/camera-service';

type FrameCallback = (
  frame: HTMLImageElement,
) => Promise<void>;

export function useCameraFrames(
  onFrame: FrameCallback,
) {
  const error = ref('');

  let unlistenFrame: UnlistenFn | undefined;
  let unlistenError: UnlistenFn | undefined;

  let processing = false;
  let mounted = true;

  async function decodeFrame(
    frame: string,
  ): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);

      image.onerror = () => {
        reject(new Error('Failed to decode camera frame.'));
      };

      image.src = `data:image/jpeg;base64,${frame}`;
    });
  }

  async function handleFrame(payload: string): Promise<void> {
    if (processing || !mounted) return;

    processing = true;

    try {
      const image = await decodeFrame(payload);

      if (!mounted) return;

      await onFrame(image);
    } catch (exception) {
      error.value = exception instanceof Error
        ? exception.message
        : 'Failed to process camera frame.';
    } finally {
      processing = false;
    }
  }

  onMounted(async () => {
    try {
      const frameListener = await CameraService.onFrame(handleFrame);

      if (!mounted) {
        frameListener();
        return;
      }

      unlistenFrame = frameListener;

      const errorListener = await CameraService.onError(
        (message) => {
          error.value = message;
        },
      );

      if (!mounted) {
        errorListener();
        return;
      }

      unlistenError = errorListener;
    } catch (exception) {
      error.value = exception instanceof Error
        ? exception.message
        : 'Failed to initialize camera listeners.';
    }
  });

  onUnmounted(() => {
    mounted = false;

    unlistenFrame?.();
    unlistenError?.();
  });

  return {
    error,
  };
}
