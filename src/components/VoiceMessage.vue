<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import type { VoiceMessage } from '@/types/chat';
  import { useVoicePlayer } from '@/composables/useVoicePlayer';
  import { getInitials } from '@/utils';

  interface Props {
    message: VoiceMessage;
  }

  const props = defineProps<Props>();
  const voicePlayer = useVoicePlayer();

  const { currentTime } = voicePlayer;

  // Generate random waveform bars for visual effect
  const waveformBars = ref(Array.from({ length: 20 }, () => Math.random() * 100));

  const isPlaying = computed(() => voicePlayer.isMessagePlaying(props.message.id));

  // Validar y normalizar la duración del mensaje
  const messageDuration = computed(() => {
    const dur = props.message.duration;
    if (!dur || isNaN(dur) || !isFinite(dur) || dur <= 0) {
      return 1; // Duración mínima por defecto
    }
    return Math.round(dur);
  });

  // Validar y normalizar el tiempo actual
  const currentPlayTime = computed(() => {
    const time = currentTime.value;
    if (!time || isNaN(time) || !isFinite(time) || time < 0) {
      return 0;
    }
    return Math.min(time, messageDuration.value);
  });

  const progressBars = computed(() => {
    if (!isPlaying.value || messageDuration.value === 0) return 0;
    return Math.floor((currentPlayTime.value / messageDuration.value) * waveformBars.value.length);
  });

  const audioUrl = computed(() => {
    if (!props.message.audioData || typeof props.message.audioData !== 'string') {
      console.error('Invalid audio data:', props.message.audioData);
      return null;
    }
    try {
      const mimeType = props.message.mimeType || 'audio/webm';
      // Convert base64 back to Blob
      const byteCharacters = atob(props.message.audioData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error creating audio URL:', error);
      return null;
    }
  });

  // Don't forget to clean up the URL when the component is unmounted
  onUnmounted(() => {
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value);
    }
  });

  const togglePlayback = async () => {
    if (isPlaying.value) {
      voicePlayer.pauseAudio();
    } else {
      await voicePlayer.playAudio(audioUrl.value!, props.message.id);
    }
  };

  const setPlaybackSpeed = (speed: number) => {
    voicePlayer.setPlaybackRate(speed);
  };

  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Watch for message changes to regenerate waveform
  watch(
    () => props.message.id,
    () => {
      waveformBars.value = Array.from({ length: 20 }, () => Math.random() * 100);
    }
  );
</script>

<template>
  <v-card
    :class="['voice-message', { 'own-message': message.isOwn, 'other-message': !message.isOwn }]"
    :color="message.isOwn ? 'secondary' : 'accent'"
    :variant="message.isOwn ? 'flat' : 'outlined'"
    elevation="2"
  >
    <v-card-text class="py-3">
      <!-- Message Header -->
      <div class="d-flex justify-space-between align-center mb-2">
        <div class="d-flex align-center">
          <v-avatar :color="message.isOwn ? 'surface' : 'accent'" size="24" class="mr-2">
            <span :class="message.isOwn ? 'text-primary' : 'text-white'" style="font-size: 12px">
              {{ getInitials(message.nickname) }}
            </span>
          </v-avatar>
          <span
            :class="[
              'text-caption font-weight-medium',
              message.isOwn ? 'text-surface' : 'text-accent',
            ]"
          >
            {{ message.isOwn ? 'Tú' : message.nickname }}
          </span>
        </div>
        <span :class="['text-caption', message.isOwn ? 'text-surface' : 'text-accent']">
          {{ formatTime(message.timestamp as Date) }}
        </span>
      </div>

      <!-- Audio Controls -->
      <div class="d-flex align-center">
        <!-- Play/Pause Button -->
        <v-btn
          :icon="isPlaying ? 'mdi-pause' : 'mdi-play'"
          :color="message.isOwn ? 'surface' : 'accent'"
          variant="flat"
          size="small"
          class="mr-3"
          @click="togglePlayback"
        />

        <!-- Waveform Placeholder -->
        <div class="waveform-container flex-grow-1 mr-3">
          <div class="waveform">
            <div
              v-for="(bar, index) in waveformBars"
              :key="index"
              :class="['waveform-bar', { active: isPlaying && index < progressBars }]"
              :style="{ height: bar + '%' }"
            />
          </div>
        </div>

        <!-- Duration -->
        <span :class="['text-caption mr-2', message.isOwn ? 'text-surface' : 'text-accent']">
          {{
            isPlaying
              ? `${voicePlayer.formatTime(Math.min(voicePlayer.currentTime.value, message.duration))} / `
              : ''
          }}{{ message.duration ? voicePlayer.formatTime(message.duration) : '-' }}
        </span>

        <!-- Speed Control -->
        <v-menu>
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              :color="message.isOwn ? 'surface' : 'accent'"
              variant="text"
              size="small"
              class="text-caption"
            >
              {{ voicePlayer.playbackRate }}x
              <v-icon size="small">mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item
              v-for="speed in [1, 1.5, 2]"
              :key="speed"
              @click="setPlaybackSpeed(speed)"
              :active="voicePlayer.playbackRate.value === speed"
            >
              <v-list-item-title>{{ speed }}x</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
  .voice-message {
    margin-bottom: 12px;
    max-width: 85%;
    border-radius: 16px !important;
  }

  .own-message {
    align-self: flex-end;
    margin-left: auto;
  }

  .other-message {
    align-self: flex-start;
  }

  .waveform-container {
    height: 32px;
    display: flex;
    align-items: center;
  }

  .waveform {
    display: flex;
    align-items: center;
    height: 100%;
    gap: 2px;
  }

  .waveform-bar {
    width: 3px;
    background-color: currentColor;
    opacity: 0.3;
    border-radius: 2px;
    transition: all 0.2s ease;
  }

  .waveform-bar.active {
    opacity: 0.8;
    transform: scaleY(1.2);
  }

  .own-message .waveform-bar {
    background-color: rgb(var(--v-theme-surface));
  }

  .other-message .waveform-bar {
    background-color: rgb(var(--v-theme-accent));
  }
</style>
