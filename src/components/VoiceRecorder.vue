<script setup lang="ts">
  import { useChatStore } from '@/stores/chat.store';

  import { useVoiceRecorder } from '@/composables/useVoiceRecorder';

  import { formatTime } from '@/utils';

  const chatStore = useChatStore();
  const { isRecording, recordingDuration } = storeToRefs(chatStore);

  const { startRecording, stopRecording, forceStop } = useVoiceRecorder();

  // Local states
  const showPermissionError = ref(false);
  const showValidationError = ref(false);

  const emit = defineEmits<{ onError: [] }>();

  /**
   * Starts recording audio
   * @param {Event} e - Optional event parameter
   */
  const onStartRecording = async (e?: Event) => {
    e?.preventDefault();

    if (isRecording.value) return;

    console.log('startRecording');
    showPermissionError.value = false;
    showValidationError.value = false;

    const success = await startRecording();

    console.log(success);
    if (!success) {
      showPermissionError.value = true;
      emit('onError');
    }
  };

  /**
   * Stops recording audio
   * @param {Event} e - Optional event parameter
   */
  const onStopRecording = async (e?: Event) => {
    e?.preventDefault();

    console.log('stopRecording');

    // Try to stop recording normally
    await stopRecording();

    // If recording is still active after 500ms, force stop it
    setTimeout(async () => {
      if (isRecording.value) {
        console.log('Force stopping as backup');
        await forceStop();
      }
    }, 500);
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
              {{ formatTime(recordingDuration) }} / 0:30
            </v-chip>
          </div>
        </div>

        <!-- Record Button -->
        <div class="button-container">
          <v-btn
            :color="isRecording ? 'error' : 'primary'"
            :icon="isRecording ? 'mdi-stop' : 'mdi-microphone'"
            size="large"
            elevation="4"
            class="record-button"
            @mousedown="onStartRecording"
            @mouseup="onStopRecording"
            @touchstart.prevent="onStartRecording"
            @touchend.prevent="onStopRecording"
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
    /* Main container with fixed height */
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

  /* For very small screens, hide some elements to save space */
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
