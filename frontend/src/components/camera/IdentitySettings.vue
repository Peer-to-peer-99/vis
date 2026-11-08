<script setup lang="ts">
import { ref } from 'vue';
import type {IdentitySettings} from "@/types/settings.ts";

const emit = defineEmits<{
  update: [settings: IdentitySettings];
}>();

const settings = ref<IdentitySettings>({
  lawyerName: '',
  officeName: '',
  logo: null,
  fontFamily: 'Georgia',
  fontSize: 32,
  textColor: '#D4AF72',
  position: 'bottom-left',
});

const logoPreview = ref<string | null>(null);

function updateSettings() {
  emit('update', { ...settings.value });
}

function handleLogoUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
    return;
  }

  const image = new Image();

  image.onload = () => {
    settings.value.logo = image;
    logoPreview.value = URL.createObjectURL(file);
    updateSettings();
  };

  image.src = URL.createObjectURL(file);
}
</script>

<template>
  <section class="identity-settings">
    <header class="identity-header">
      <h2>Identidade visual</h2>
      <p>Personalize a identificação exibida na câmera.</p>
    </header>

    <div class="form-group">
      <label for="lawyerName">Nome do advogado</label>
      <input
        id="lawyerName"
        v-model="settings.lawyerName"
        type="text"
        placeholder="Ex: Camilla Yasmin"
        @input="updateSettings"
      />
    </div>

    <div class="form-group">
      <label for="officeName">Nome do escritório</label>
      <input
        id="officeName"
        v-model="settings.officeName"
        type="text"
        placeholder="Ex: Camilla Yasmin Advocacia"
        @input="updateSettings"
      />
    </div>

    <div class="form-group">
      <label for="logo">Logo do escritório</label>

      <label class="logo-upload" for="logo">
        <img v-if="logoPreview" :src="logoPreview" alt="Logo do escritório" />
        <span v-else>Selecionar imagem da logo</span>
      </label>

      <input
        id="logo"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        hidden
        @change="handleLogoUpload"
      />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="fontFamily">Fonte</label>
        <select
          id="fontFamily"
          v-model="settings.fontFamily"
          @change="updateSettings"
        >
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Arial">Arial</option>
          <option value="serif">Serif</option>
        </select>
      </div>

      <div class="form-group">
        <label for="fontSize">Tamanho</label>
        <input
          id="fontSize"
          v-model.number="settings.fontSize"
          type="number"
          min="12"
          max="80"
          @input="updateSettings"
        />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="textColor">Cor do texto</label>
        <input
          id="textColor"
          v-model="settings.textColor"
          type="color"
          @input="updateSettings"
        />
      </div>

      <div class="form-group">
        <label for="position">Posição</label>
        <select
          id="position"
          v-model="settings.position"
          @change="updateSettings"
        >
          <option value="bottom-left">Inferior esquerdo</option>
          <option value="bottom-center">Inferior centralizado</option>
          <option value="bottom-right">Inferior direito</option>
        </select>
      </div>
    </div>
  </section>
</template>

<style scoped>
.identity-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  background: #17191f;
  border: 1px solid #30333d;
  border-radius: 12px;
  color: #fff;
}

.identity-header h2 {
  margin: 0 0 6px;
  font-size: 18px;
}

.identity-header p {
  margin: 0;
  color: #9296a3;
  font-size: 13px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.form-group label {
  font-size: 13px;
  color: #c4c6ce;
}

.form-group input:not([type="color"]),
.form-group select {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #363a45;
  border-radius: 7px;
  background: #20232c;
  color: #fff;
  outline: none;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #d4af72;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-group input[type="color"] {
  width: 100%;
  height: 42px;
  padding: 4px;
  border: 1px solid #363a45;
  border-radius: 7px;
  background: #20232c;
  cursor: pointer;
}

.logo-upload {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  border: 1px dashed #555b69;
  border-radius: 8px;
  cursor: pointer;
  color: #9296a3;
  overflow: hidden;
}

.logo-upload img {
  max-width: 100%;
  max-height: 80px;
  object-fit: contain;
}
</style>
