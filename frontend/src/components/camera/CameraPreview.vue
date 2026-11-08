<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

import type { UnlistenFn } from '@tauri-apps/api/event';

import { CameraService } from '@/services/camera/camera-service';
import { BackgroundService } from '@/services/camera/background-service';
import { CompositionService } from '@/services/camera/composition-service';

import type { BackgroundSettings } from '@/services/camera/composition-service';

const props = defineProps<{
  isRunning: boolean;
  backgroundFile: File | null;
  backgroundSettings: BackgroundSettings;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);

const hasFrame = ref(false);
const cameraError = ref('');
const backgroundError = ref('');
const segmenterReady = ref(false);

const backgroundService = new BackgroundService();
const compositionService = new CompositionService();

const frameImage = new Image();
const backgroundImage = new Image();

let unlistenFrame: UnlistenFn | undefined;
let unlistenError: UnlistenFn | undefined;

let backgroundUrl: string | null = null;
let backgroundReady = false;
let processing = false;
let mounted = true;

function drawRawFrame(frame: HTMLImageElement): void {
  const context = canvas.value?.getContext('2d');

  if (!context || !canvas.value) return;

  if (
    canvas.value.width !== frame.naturalWidth ||
    canvas.value.height !== frame.naturalHeight
  ) {
    canvas.value.width = frame.naturalWidth;
    canvas.value.height = frame.naturalHeight;
  }

  context.drawImage(
    frame,
    0,
    0,
    frame.naturalWidth,
    frame.naturalHeight,
  );

  hasFrame.value = true;
}

function handleFrame(frame: string): void {
  if (processing || !mounted) return;

  processing = true;

  frameImage.onload = () => {
    if (!mounted) {
      processing = false;
      return;
    }

    if (!props.backgroundFile || !backgroundReady || !segmenterReady.value) {
      drawRawFrame(frameImage);
      processing = false;
      return;
    }

    try {
      backgroundService.processFrame(frameImage, (result) => {
        if (!mounted) {
          processing = false;
          return;
        }

        try {
          if (result && backgroundReady && canvas.value) {
            compositionService.render(
              frameImage,
              backgroundImage,
              result,
              canvas.value,
              props.backgroundSettings,
            );

            hasFrame.value = true;
          } else {
            drawRawFrame(frameImage);
          }
        } catch (error) {
          backgroundError.value = error instanceof Error
            ? error.message
            : 'Failed to compose background.';

          drawRawFrame(frameImage);
        }

        processing = false;
      });
    } catch (error) {
      backgroundError.value = error instanceof Error
        ? error.message
        : 'Failed to process camera frame.';

      drawRawFrame(frameImage);
      processing = false;
    }
  };

  frameImage.onerror = () => {
    processing = false;
    cameraError.value = 'Failed to decode camera frame.';
  };

  frameImage.src = `data:image/jpeg;base64,${frame}`;
}

function loadBackground(file: File | null): void {
  backgroundReady = false;
  backgroundError.value = '';

  if (backgroundUrl) {
    URL.revokeObjectURL(backgroundUrl);
    backgroundUrl = null;
  }

  if (!file) return;

  backgroundUrl = URL.createObjectURL(file);

  backgroundImage.onload = () => {
    backgroundReady = true;
  };

  backgroundImage.onerror = () => {
    backgroundError.value = 'Failed to load background image.';
  };

  backgroundImage.src = backgroundUrl;
}

watch(
  () => props.backgroundFile,
  (file) => {
    loadBackground(file);
  },
  { immediate: true },
);

onMounted(async () => {
  unlistenFrame = await CameraService.onFrame(handleFrame);

  unlistenError = await CameraService.onError((error) => {
    cameraError.value = error;
  });

  try {
    await backgroundService.initialize();

    if (mounted) {
      segmenterReady.value = true;
    } else {
      backgroundService.dispose();
    }
  } catch (error) {
    backgroundError.value = error instanceof Error
      ? error.message
      : 'Failed to initialize background segmentation.';
  }
});

onUnmounted(() => {
  mounted = false;

  unlistenFrame?.();
  unlistenError?.();

  backgroundService.dispose();

  if (backgroundUrl) {
    URL.revokeObjectURL(backgroundUrl);
  }
});
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
.background-error {
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
</style>
