import {
  onMounted,
  onUnmounted,
  ref,
  watch,
  type MaybeRefOrGetter,
  toValue,
} from 'vue';

import { BackgroundService } from '@/services/camera/background-service';

type SegmentationResult = Parameters<
  Parameters<BackgroundService['processFrame']>[1]
>[0];

export function useCameraBackground(
  backgroundFile: MaybeRefOrGetter<File | null>,
) {
  const backgroundService = new BackgroundService();

  const backgroundImage = new Image();

  const backgroundReady = ref(false);
  const segmenterReady = ref(false);
  const error = ref('');

  let backgroundUrl: string | null = null;
  let mounted = true;

  function loadBackground(file: File | null): void {
    backgroundReady.value = false;
    error.value = '';

    if (backgroundUrl) {
      URL.revokeObjectURL(backgroundUrl);
      backgroundUrl = null;
    }

    if (!file) return;

    backgroundUrl = URL.createObjectURL(file);

    backgroundImage.onload = () => {
      if (mounted) {
        backgroundReady.value = true;
      }
    };

    backgroundImage.onerror = () => {
      if (mounted) {
        error.value = 'Failed to load background image.';
      }
    };

    backgroundImage.src = backgroundUrl;
  }

  function processFrame(
    frame: HTMLImageElement,
  ): Promise<SegmentationResult> {
    return new Promise((resolve) => {
      backgroundService.processFrame(frame, resolve);
    });
  }

  watch(
    () => toValue(backgroundFile),
    loadBackground,
    { immediate: true },
  );

  onMounted(async () => {
    try {
      await backgroundService.initialize();

      if (mounted) {
        segmenterReady.value = true;
      }
    } catch (exception) {
      error.value = exception instanceof Error
        ? exception.message
        : 'Failed to initialize background segmentation.';
    }
  });

  onUnmounted(() => {
    mounted = false;

    backgroundService.dispose();

    if (backgroundUrl) {
      URL.revokeObjectURL(backgroundUrl);
      backgroundUrl = null;
    }
  });

  return {
    backgroundImage,
    backgroundReady,
    segmenterReady,
    error,
    processFrame,
  };
}
