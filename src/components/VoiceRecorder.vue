<script setup lang="ts">
  import { ref, computed } from 'vue';
  import { useVoiceRecorder } from '@/composables/useVoiceRecorder';
  import { useChatStore } from '@/stores/chat.store';

  const voiceRecorder = useVoiceRecorder();
  const chatStore = useChatStore();

  // Estados locales
  const showPermissionError = ref(false);
  const showValidationError = ref(false);

  // Estados reactivos desde el store
  const isRecording = computed(() => chatStore.isRecording);
  const recordingDuration = computed(() => chatStore.recordingDuration);

  const emit = defineEmits(['on-error']);

  const startRecording = async (e?: Event) => {
    e?.preventDefault();

    if (isRecording.value) return;

    console.log('startRecording');
    showPermissionError.value = false;
    showValidationError.value = false;

    const success = await voiceRecorder.startRecording();

    console.log(success);
    if (!success) {
      showPermissionError.value = true;
      emit('on-error');
    }
  };

  const stopRecording = async (e?: Event) => {
    e?.preventDefault();

    console.log('stopRecording');

    // Primero intentar parada normal
    await voiceRecorder.stopRecording();

    // Si después de 500ms aún está grabando, forzar parada
    setTimeout(async () => {
      if (isRecording.value) {
        console.log('Force stopping as backup');
        await voiceRecorder.forceStop();
      }
    }, 500);
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
</script>

<template>
  <div class="voice-recorder-wrapper">
    <v-card class="voice-recorder" color="surface" elevation="4">
      <v-card-text class="recorder-content">
        <!-- Recording Status -->
        <div v-if="!isRecording" class="record-idle">
          <v-icon color="primary" size="40" class="mb-2">mdi-microphone</v-icon>
          <p class="text-subtitle-1 mb-1 font-weight-medium">Listo para grabar</p>
        </div>

        <div v-else class="record-active">
          <div class="recording-animation mb-2">
            <v-icon color="error" size="40" class="pulse-animation">mdi-record</v-icon>
          </div>
          <p class="text-subtitle-1 mb-1 text-error font-weight-medium">Grabando...</p>
          <div class="recording-timer mb-3">
            <v-chip color="error" variant="flat" size="small" class="timer-chip">
              <v-icon start size="small">mdi-timer</v-icon>
              {{ formatRecordingTime(recordingDuration) }} / 0:30
            </v-chip>
          </div>
        </div>

        <!-- Record Button - Optimizado -->
        <div class="button-container">
          <v-btn
            :color="isRecording ? 'error' : 'primary'"
            :icon="isRecording ? 'mdi-stop' : 'mdi-microphone'"
            size="large"
            elevation="4"
            class="record-button"
            @mousedown="startRecording"
            @mouseup="stopRecording"
            @touchstart.prevent="startRecording"
            @touchend.prevent="stopRecording"
          />
        </div>

        <!-- Instructions -->
        <p class="text-caption text-medium-emphasis instruction-text">
          {{ isRecording ? 'Suelta para enviar el mensaje' : 'Mantén presionado para grabar' }}
        </p>

        <!-- Audio Validation Warning -->
        <v-alert
          v-if="showValidationError"
          type="warning"
          variant="tonal"
          class="validation-alert"
          closable
          density="compact"
          @click:close="showValidationError = false"
        >
          <template #prepend>
            <v-icon>mdi-volume-off</v-icon>
          </template>
          El audio grabado está muy silencioso. Intenta hablar más fuerte.
        </v-alert>

        <!-- Permission Error -->
        <v-alert
          v-if="showPermissionError"
          type="error"
          variant="tonal"
          class="validation-alert"
          closable
          density="compact"
          @click:close="showPermissionError = false"
        >
          <template #prepend>
            <v-icon>mdi-microphone-off</v-icon>
          </template>
          No se pudo acceder al micrófono. Verifica los permisos.
        </v-alert>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
  .voice-recorder-wrapper {
    /* Contenedor principal con altura fija */
    height: 230px;
    min-height: 230px;
    max-height: 230px;
    flex-shrink: 0;
    position: sticky;
    bottom: 0;
    z-index: 10;
    background-color: rgb(var(--v-theme-background));
    border-top: 1px solid rgb(var(--v-theme-outline-variant));
  }

  .voice-recorder {
    height: 100% !important;
    display: flex;
    flex-direction: column;
  }

  .recorder-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    text-align: center;
    padding: 12px 16px !important;
    overflow: hidden;
  }

  .record-idle,
  .record-active {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 0;
  }

  .button-container {
    flex-shrink: 0;
    margin: 8px 0;
  }

  .record-button {
    transition: all 0.2s ease !important;
    width: 56px !important;
    height: 56px !important;
  }

  .record-button:hover {
    transform: scale(1.05);
  }

  .record-button:active {
    transform: scale(0.95);
  }

  .instruction-text {
    flex-shrink: 0;
    margin-top: 8px;
    line-height: 1.2;
  }

  .timer-chip {
    font-family: 'Roboto Mono', monospace;
    font-size: 0.75rem;
  }

  .validation-alert {
    position: absolute;
    bottom: 8px;
    left: 8px;
    right: 8px;
    margin: 0;
    z-index: 100;
  }

  .pulse-animation {
    animation: pulse 1s ease-in-out infinite alternate;
  }

  @keyframes pulse {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0.6;
      transform: scale(1.1);
    }
  }

  /* Responsive adjustments */
  @media (max-height: 600px) {
    .voice-recorder-wrapper {
      height: 140px;
      min-height: 140px;
      max-height: 140px;
    }

    .record-button {
      width: 48px !important;
      height: 48px !important;
    }
  }

  @media (max-height: 500px) {
    .voice-recorder-wrapper {
      height: 120px;
      min-height: 120px;
      max-height: 120px;
    }

    .recorder-content {
      padding: 8px 12px !important;
    }

    .record-button {
      width: 44px !important;
      height: 44px !important;
    }

    .text-subtitle-1 {
      font-size: 0.9rem !important;
    }
  }

  /* Para pantallas muy pequeñas, ocultar algunos elementos para ahorrar espacio */
  @media (max-height: 400px) {
    .text-caption:not(.instruction-text) {
      display: none;
    }

    .voice-recorder-wrapper {
      height: 100px;
      min-height: 100px;
      max-height: 100px;
    }
  }
</style>
