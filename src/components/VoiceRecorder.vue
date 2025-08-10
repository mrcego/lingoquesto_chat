<script setup lang="ts">
  import { useVoiceRecorder } from '@/composables/useVoiceRecorder';

  const voiceRecorder = useVoiceRecorder();

  const showPermissionError = ref(false);
  const showValidationError = ref(false);

  const emit = defineEmits(['on-error']);

  const startRecording = async (e?: Event) => {
    e?.preventDefault();
    
    if (voiceRecorder.isRecording) return;
    
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
      if (voiceRecorder.isRecording) {
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

      <!-- Record Button - SIMPLIFICADO -->
      <v-btn
        :color="voiceRecorder.isRecording ? 'error' : 'primary'"
        :icon="voiceRecorder.isRecording ? 'mdi-stop' : 'mdi-microphone'"
        size="x-large"
        elevation="6"
        class="record-button mt-4"
        @mousedown="startRecording"
        @mouseup="stopRecording"
        @touchstart.prevent="startRecording"
        @touchend.prevent="stopRecording"
      />

      <!-- Instructions -->
      <p class="text-caption text-grey-darken-1 mt-4">
        {{
          voiceRecorder.isRecording
            ? 'Suelta para enviar el mensaje'
            : 'Mantén presionado para grabar'
        }}
      </p>

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