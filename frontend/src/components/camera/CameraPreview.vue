<script setup lang="ts">
import { ref, watch } from 'vue';

import type { IdentitySettings } from '@/types/settings';

import {
  CompositionService,
} from '@/services/camera/composition-service';

import type {
  BackgroundSettings,
} from '@/services/camera/composition-service';

import { useCameraFrames } from '@/composables/camera/useCameraFrames';
import { useCameraBackground } from '@/composables/camera/useCameraBackground';
import { useVirtualCamera } from '@/composables/camera/useVirtualCamera';

const props = defineProps<{
  isRunning: boolean;
  backgroundFile: File | null;
  backgroundSettings: BackgroundSettings;
  identitySettings: IdentitySettings | null;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);

const hasFrame = ref(false);
const backgroundError = ref('');

const compositionService = new CompositionService();

const {
  backgroundImage,
  backgroundReady,
  segmenterReady,
  error: backgroundServiceError,
  processFrame,
} = useCameraBackground(() => props.backgroundFile);

const {
  error: cameraError,
} = useCameraFrames(handleFrame);

const {
  isRunning: virtualCameraRunning,
  error: virtualCameraError,
  stop: stopVirtualCamera,
  publishFrame,
} = useVirtualCamera(canvas);

function drawRawFrame(frame: HTMLImageElement): void {
  const element = canvas.value;
  const context = element?.getContext('2d');

  if (!element || !context) return;

  if (
    element.width !== frame.naturalWidth ||
    element.height !== frame.naturalHeight
  ) {
    element.width = frame.naturalWidth;
    element.height = frame.naturalHeight;
  }

  context.drawImage(
    frame,
    0,
    0,
    frame.naturalWidth,
    frame.naturalHeight,
  );

  hasFrame.value = true;

  void publishFrame();
}

async function handleFrame(frame: HTMLImageElement): Promise<void> {
  if (!props.isRunning) return;

  if (
    !props.backgroundFile ||
    !backgroundReady.value ||
    !segmenterReady.value
  ) {
    drawRawFrame(frame);
    return;
  }

  try {
    const result = await processFrame(frame);

    if (!canvas.value) return;

    if (!result || !backgroundReady.value) {
      drawRawFrame(frame);
      return;
    }

    compositionService.render(
      frame,
      backgroundImage,
      result,
      canvas.value,
      props.backgroundSettings,
      props.identitySettings,
    );

    hasFrame.value = true;

    void publishFrame();
  } catch (exception) {
    backgroundError.value = exception instanceof Error
      ? exception.message
      : 'Failed to process background.';

    drawRawFrame(frame);
  }
}

watch(
  () => props.isRunning,
  async (running) => {
    if (!running) {
      hasFrame.value = false;

      try {
        await stopVirtualCamera();
      } catch (exception) {
        console.error(
          'Failed to stop virtual camera:',
          exception,
        );
      }
    }
  },
);

watch(
  backgroundServiceError,
  (message) => {
    backgroundError.value = message;
  },
);
</script>

<template>
  <section class="camera-preview">
    <div v-if="!isRunning" class="camera-placeholder">
      <span>VIS</span>
      <p>Camera is offline</p>
    </div>

    <template v-else>
      <canvas
        ref="canvas"
        v-show="hasFrame"
        class="camera-image"
      />

      <div v-if="!hasFrame" class="camera-placeholder">
        <span>VIS</span>
        <p>Waiting for video stream...</p>
      </div>
    </template>

    <div class="camera-status">
      <span :class="{ active: isRunning }"></span>
      {{ isRunning ? 'LIVE' : 'OFFLINE' }}
    </div>

    <p v-if="cameraError" class="camera-error">
      {{ cameraError }}
    </p>

    <p v-if="backgroundError" class="background-error">
      {{ backgroundError }}
    </p>

    <p v-if="virtualCameraError" class="virtual-camera-error">
      {{ virtualCameraError }}
    </p>
  </section>
</template>

<style scoped>
.camera-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #17191f;
  border: 1px solid #30343d;
  border-radius: 12px;
}

.camera-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.camera-placeholder {
  text-align: center;
  color: #858b98;
}

.camera-placeholder span {
  font-size: 48px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 4px;
}

.camera-placeholder p {
  margin-top: 8px;
  font-size: 14px;
}

.camera-status {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
}

.camera-status span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #777;
}

.camera-status span.active {
  background: #22c55e;
}

.camera-error,
.background-error,
.virtual-camera-error {
  position: absolute;
  bottom: 8px;
  left: 12px;
  right: 12px;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.camera-error {
  color: #ef4444;
}

.background-error {
  bottom: 28px;
  color: #f59e0b;
}

.virtual-camera-error {
  bottom: 48px;
  color: #ef4444;
}
</style>
