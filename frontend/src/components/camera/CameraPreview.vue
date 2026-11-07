<script setup lang="ts">
defineProps<{
  isRunning: boolean;
}>();
</script>

<template>
  <section class="camera-preview">
    <div v-if="!isRunning" class="camera-placeholder">
      <span>VIS</span>
      <p>Camera is offline</p>
    </div>

    <div v-else class="camera-placeholder">
      <span>VIS</span>
      <p>Waiting for video stream...</p>
    </div>

    <div class="camera-status">
      <span :class="{ active: isRunning }"></span>
      {{ isRunning ? 'LIVE' : 'OFFLINE' }}
    </div>
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
</style>
