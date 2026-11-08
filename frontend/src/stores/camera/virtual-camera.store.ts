import { defineStore } from 'pinia';
import { ref } from 'vue';
import { VirtualCameraService } from '@/services/camera/virtual-camera-service.ts';

export const useVirtualCameraStore = defineStore('virtualCamera', () => {
  const isRunning = ref(false);
  const error = ref<string | null>(null);

  let startingPromise: Promise<void> | null = null;
  let stoppingPromise: Promise<void> | null = null;

  async function start(width: number, height: number): Promise<void> {
    if (isRunning.value) return;

    if (stoppingPromise) {
      await stoppingPromise;
    }

    if (startingPromise) {
      return startingPromise;
    }

    const task = (async () => {
      try {
        error.value = null;

        await VirtualCameraService.start(width, height);

        isRunning.value = true;
      } catch (exception) {
        error.value = exception instanceof Error
          ? exception.message
          : 'Failed to start virtual camera.';

        throw exception;
      }
    })();

    startingPromise = task;

    try {
      await task;
    } finally {
      startingPromise = null;
    }
  }

  async function stop(): Promise<void> {
    if (stoppingPromise) {
      return stoppingPromise;
    }

    if (startingPromise) {
      await startingPromise.catch(() => undefined);
    }

    if (!isRunning.value) return;

    const task = (async () => {
      try {
        await VirtualCameraService.stop();

        isRunning.value = false;
        error.value = null;
      } catch (exception) {
        error.value = exception instanceof Error
          ? exception.message
          : 'Failed to stop virtual camera.';

        throw exception;
      }
    })();

    stoppingPromise = task;

    try {
      await task;
    } finally {
      stoppingPromise = null;
    }
  }

  async function writeFrame(frame: Uint8Array): Promise<void> {
    if (!isRunning.value) return;

    try {
      await VirtualCameraService.writeFrame(frame);
    } catch (exception) {
      error.value = exception instanceof Error
        ? exception.message
        : 'Failed to publish virtual camera frame.';

      throw exception;
    }
  }

  return {
    isRunning,
    error,
    start,
    stop,
    writeFrame,
  };
});
