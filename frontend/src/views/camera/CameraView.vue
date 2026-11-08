<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useCameraStore } from '@/stores/camera/camera.store';
import CameraPreview from '@/components/camera/CameraPreview.vue';
import BackgroundSelector from '@/components/camera/BackgroundSelector.vue';

import type { BackgroundSettings } from '@/services/camera/composition-service';
const camera = useCameraStore();
const selectedBackground = ref<File | null>(null);

const backgroundSettings = ref<BackgroundSettings>({
  zoom: 1,
  positionX: 50,
  positionY: 50,
  fit: 'cover',
});

function handleBackgroundSelect(file: File) {
  selectedBackground.value = file;
}

function handleBackgroundUpdate(settings: BackgroundSettings) {
  backgroundSettings.value = settings;
}

onMounted(() => {
  camera.loadDevices();
});
</script>
<template>
  <main class="camera-view">
    <header>
      <h1>VIS</h1>

      <span :class="{ active: camera.isRunning }">
        {{ camera.isRunning ? 'Camera active' : 'Camera inactive' }}
      </span>
    </header>

    <section class="workspace">
      <CameraPreview
        :is-running="camera.isRunning"
        :background-file="selectedBackground"
        :background-settings="backgroundSettings"
      />
      <div class="controls">
        <label for="camera">Select camera</label>
        <BackgroundSelector
          @select="handleBackgroundSelect"
          @update="handleBackgroundUpdate"
        />
        <select
          id="camera"
          v-model="camera.selectedDeviceId"
        >
          <option value="" disabled>
            Select a camera
          </option>

          <option
            v-for="device in camera.devices"
            :key="device.id"
            :value="device.id"
          >
            {{ device.name }}
          </option>
        </select>

        <button
          :disabled="camera.loading || camera.isRunning"
          @click="camera.startCamera"
        >
          {{ camera.loading ? 'Starting...' : 'Start camera' }}
        </button>

        <button
          :disabled="!camera.isRunning"
          @click="camera.stopCamera"
        >
          Stop camera
        </button>

        <button @click="camera.loadDevices">
          Refresh cameras
        </button>

        <p v-if="camera.error" class="error">
          {{ camera.error }}
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.camera-view {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30px;
}

header h1 {
  margin: 0;
  font-size: 32px;
}

header span {
  color: #999;
}

header span.active {
  color: #22c55e;
}

.workspace {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

select,
button {
  padding: 12px;
  border-radius: 8px;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.error {
  color: #ef4444;
}

@media (max-width: 700px) {
  .workspace {
    grid-template-columns: 1fr;
  }
}
</style>
