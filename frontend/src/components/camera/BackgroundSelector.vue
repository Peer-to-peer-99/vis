<script setup lang="ts">
import { ref } from 'vue';

interface BackgroundSettings {
  zoom: number;
  positionX: number;
  positionY: number;
  fit: 'cover' | 'contain';
}

const emit = defineEmits<{
  select: [file: File];
  update: [settings: BackgroundSettings];
}>();

const backgroundUrl = ref('');
const backgroundName = ref('');

const settings = ref<BackgroundSettings>({
  zoom: 1,
  positionX: 50,
  positionY: 50,
  fit: 'cover',
});

function updateSettings() {
  emit('update', { ...settings.value });
}

function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file || !file.type.startsWith('image/')) return;

  if (backgroundUrl.value) {
    URL.revokeObjectURL(backgroundUrl.value);
  }

  backgroundUrl.value = URL.createObjectURL(file);
  backgroundName.value = file.name;

  emit('select', file);
}
</script>

<template>
  <section class="background-selector">
    <h2>Background</h2>

    <label class="upload-button">
      <input
        type="file"
        accept="image/*"
        @change="handleImageUpload"
      />
      Choose image
    </label>

    <div v-if="backgroundUrl" class="background-preview">
      <div class="preview-frame">
        <img
          :src="backgroundUrl"
          :style="{
            objectFit: settings.fit,
            transform: `translate(${(settings.positionX - 50) * 0.02}%, ${(settings.positionY - 50) * 0.02}%) scale(${settings.zoom})`,
          }"
          alt="Background preview"
        />
      </div>

      <span>{{ backgroundName }}</span>

      <label>
        Zoom: {{ settings.zoom.toFixed(2) }}

        <input
          v-model.number="settings.zoom"
          type="range"
          min="1"
          max="3"
          step="0.05"
          @input="updateSettings"
        />
      </label>

      <label>
        Horizontal: {{ settings.positionX }}%

        <input
          v-model.number="settings.positionX"
          type="range"
          min="0"
          max="100"
          @input="updateSettings"
        />
      </label>

      <label>
        Vertical: {{ settings.positionY }}%

        <input
          v-model.number="settings.positionY"
          type="range"
          min="0"
          max="100"
          @input="updateSettings"
        />
      </label>

      <label>
        Enquadramento

        <select
          v-model="settings.fit"
          @change="updateSettings"
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
        </select>
      </label>
    </div>

    <p v-else>No background selected.</p>
  </section>
</template>

<style scoped>
.background-selector {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-button {
  padding: 14px;
  text-align: center;
  border: 1px dashed #50545f;
  border-radius: 8px;
  cursor: pointer;
}

.upload-button input {
  display: none;
}

.background-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-frame {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 8px;
  background: #171717;
}

.preview-frame img {
  width: 100%;
  height: 100%;
}

.background-preview label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.background-preview input,
.background-preview select {
  width: 100%;
}
</style>
