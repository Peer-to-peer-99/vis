import { computed, ref, type Ref } from 'vue';
import { useVirtualCameraStore } from '@/stores/camera/virtual-camera.store';

const VIRTUAL_FPS = 15;
const FRAME_INTERVAL = 1000 / VIRTUAL_FPS;

export function useVirtualCamera(
  canvas: Ref<HTMLCanvasElement | null>,
) {
  const store = useVirtualCameraStore();

  const framePending = ref(false);

  const isRunning = computed(() => store.isRunning);
  const error = computed(() => store.error);

  let lastFrameAt = 0;

  async function start(): Promise<void> {
    const element = canvas.value;

    if (!element) {
      throw new Error('Camera canvas is not available.');
    }

    if (element.width <= 0 || element.height <= 0) {
      throw new Error('Invalid canvas dimensions.');
    }

    if (element.width % 2 !== 0) {
      throw new Error(
        'Virtual camera requires an even canvas width.',
      );
    }

    await store.start(element.width, element.height);
  }

  async function stop(): Promise<void> {
    await store.stop();
  }

  async function publishFrame(): Promise<void> {
    const element = canvas.value;

    if (!element || framePending.value) return;

    const now = performance.now();

    if (now - lastFrameAt < FRAME_INTERVAL) {
      return;
    }

    const context = element.getContext('2d');

    if (!context) return;

    framePending.value = true;
    lastFrameAt = now;

    try {
      if (!store.isRunning) {
        await start();
      }

      const imageData = context.getImageData(
        0,
        0,
        element.width,
        element.height,
      );

      const frame = new Uint8Array(imageData.data);

      await store.writeFrame(frame);
    } catch (exception) {
      console.error(
        'Failed to publish virtual camera frame:',
        exception,
      );
    } finally {
      framePending.value = false;
    }
  }

  return {
    isRunning,
    error,
    framePending,
    start,
    stop,
    publishFrame,
  };
}
