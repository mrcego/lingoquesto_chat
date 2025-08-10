<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { VoiceMessage } from '@/types/chat';
import { useVoicePlayer } from '@/composables/useVoicePlayer';

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

const togglePlayback = async () => {
  if (isPlaying.value) {
    voicePlayer.pauseAudio();
  } else {
    await voicePlayer.playAudio(props.message.audioUrl, props.message.id);
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

// Función para formatear duración en mm:ss
const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) {
    return '0:01';
  }
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    :color="message.isOwn ? 'secondary' : 'surface'"
    :variant="message.isOwn ? 'flat' : 'outlined'"
    elevation="2"
  >
    <v-card-text class="py-3">
      <!-- Message Header -->
      <div class="d-flex justify-space-between align-center mb-2">
        <div class="d-flex align-center">
          <v-avatar :color="message.isOwn ? 'surface' : 'primary'" size="24" class="mr-2">
            <span :class="message.isOwn ? 'text-primary' : 'text-white'" style="font-size: 12px">
              {{ message.nickname.charAt(0).toUpperCase() }}
            </span>
          </v-avatar>
          <span
            :class="[
              'text-caption font-weight-medium',
              message.isOwn ? 'text-surface' : 'text-primary',
            ]"
          >
            {{ message.isOwn ? 'Tú' : message.nickname }}
          </span>
        </div>
        <span
          :class="['text-caption', message.isOwn ? 'text-surface' : 'text-accent']"
        >
          {{ formatTime(message.timestamp) }}
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
        <span
          :class="[
            'text-caption mr-2',
            message.isOwn ? 'text-surface' : 'text-grey-darken-1',
          ]"
        >
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
