<template>
  <v-card class="voice-recorder" color="surface" elevation="4">
    <v-card-text class="text-center py-6">
      <!-- Recording Status -->
      <div v-if="!voiceRecorder.isRecording" class="record-idle">
        <v-icon color="primary" size="48" class="mb-3">mdi-microphone</v-icon>
        <p class="text-h6 mb-2">Listo para grabar</p>
        <p class="text-body-2 text-grey-darken-1 mb-4">
          Mantén presionado para grabar hasta 30 segundos
        </p>
      </div>

      <div v-else class="record-active">
        <div class="recording-animation mb-3">
          <v-icon color="error" size="48" class="pulse-animation">mdi-record</v-icon>
        </div>
        <p class="text-h6 mb-2 text-error">Grabando...</p>
        <div class="recording-timer">
          <v-chip color="error" variant="flat" size="large">
            <v-icon left>mdi-timer</v-icon>
            {{ formatRecordingTime(voiceRecorder.recordingDuration) }} / 0:30
          </v-chip>
        </div>
      </div>

      <!-- Record Button -->
      <v-btn
        :color="voiceRecorder.isRecording ? 'error' : 'primary'"
        :icon="voiceRecorder.isRecording ? 'mdi-stop' : 'mdi-microphone'"
        size="x-large"
        elevation="6"
        class="record-button mt-4"
        @mousedown="startRecording"
        @mouseup="stopRecording"
        @mouseleave="stopRecording"
        @touchstart="startRecording"
        @touchend="stopRecording"
      />

      <!-- Instructions -->
      <p class="text-caption text-grey-darken-1 mt-4">
        {{
          voiceRecorder.isRecording
            ? 'Suelta para enviar el mensaje'
            : 'Mantén presionado para grabar'
        }}
      </p>

      <!-- Permission Warning -->
      <v-alert v-if="showPermissionError" type="error" variant="tonal" class="mt-4">
        <v-icon>mdi-alert</v-icon>
        Error al acceder al micrófono. Verifica los permisos.
      </v-alert>

      <!-- Audio Validation Warning -->
      <v-alert
        v-if="showValidationError"
        type="warning"
        variant="tonal"
        class="mt-4"
        closable
        @click:close="showValidationError = false"
      >
        <v-icon>mdi-volume-off</v-icon>
        El audio grabado está muy silencioso. Intenta hablar más fuerte.
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  import { useVoiceRecorder } from '@/composables/useVoiceRecorder';

  const voiceRecorder = useVoiceRecorder();
  const showPermissionError = ref(false);
  const showValidationError = ref(false);

  const startRecording = async () => {
    showPermissionError.value = false;
    showValidationError.value = false;

    const success = await voiceRecorder.startRecording();
    if (!success) {
      showPermissionError.value = true;
    }
  };

  const stopRecording = () => {
    if (voiceRecorder.isRecording) {
      voiceRecorder.stopRecording();
    }
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
</script>

<style scoped>
  .voice-recorder {
    position: sticky;
    bottom: 0;
    z-index: 100;
    border-radius: 24px 24px 0 0 !important;
  }

  .record-button {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .record-button:hover {
    transform: scale(1.05);
  }

  .record-button:active {
    transform: scale(0.95);
  }

  .pulse-animation {
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.7;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .recording-animation {
    position: relative;
  }

  .recording-animation::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80px;
    height: 80px;
    border: 2px solid rgb(var(--v-theme-error));
    border-radius: 50%;
    animation: ripple 2s infinite;
  }

  @keyframes ripple {
    0% {
      transform: translate(-50%, -50%) scale(0.8);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) scale(1.8);
      opacity: 0;
    }
  }
</style>
