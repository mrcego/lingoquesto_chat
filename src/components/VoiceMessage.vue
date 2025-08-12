<script setup lang="ts">
  import { useVoicePlayer } from '@/composables/useVoicePlayer';

  import type { VoiceMessage } from '@/types/chat';

  import { getInitials, formatTime } from '@/utils';

  const props = defineProps<{ message: VoiceMessage }>();

  // Composable to handle audio playback
  const { currentTime, playbackRate, isMessagePlaying, playAudio, pauseAudio, setPlaybackRate } =
    useVoicePlayer();

  // Generate random waveform bars for visual effect
  const waveformBars = ref(Array.from({ length: 20 }, () => Math.random() * 100));

  // Computed properties to calculate message duration and current play time
  const isPlaying = computed(() => isMessagePlaying(props.message.id));

  const messageDuration = computed(() => {
    const { duration } = props.message;
    if (!duration || isNaN(duration) || !isFinite(duration) || duration <= 0) {
      return 1; // Default duration
    }
    return Math.round(duration);
  });

  // Computed property to calculate current play time
  const currentPlayTime = computed(() => {
    const time = currentTime.value;
    if (!time || isNaN(time) || !isFinite(time) || time < 0) {
      return 0; // Default play time
    }
    return Math.min(time, messageDuration.value);
  });

  // Computed property to calculate progress bars
  const progressBars = computed(() => {
    if (!isPlaying.value || messageDuration.value === 0) return 0; // Default progress
    return Math.floor((currentPlayTime.value / messageDuration.value) * waveformBars.value.length);
  });

  // Computed property to generate audio URL from base64 data
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

  // Clean up the URL when the component is unmounted
  onUnmounted(() => {
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value);
    }
  });

  // Toggle playback
  const togglePlayback = async () => {
    if (isPlaying.value) {
      pauseAudio();
    } else {
      await playAudio(audioUrl.value!, props.message.id);
    }
  };

  // Set playback speed
  const setPlaybackSpeed = (speed: number) => {
    setPlaybackRate(speed);
  };

  // Format timestamp (Date) for message header
  const formatTimestamp = (date: Date): string => {
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
    :class="['voice-message', message.isOwn ? 'align-self-end ml-auto' : 'align-self-start']"
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
          {{ formatTimestamp(new Date(message.timestamp as string)) }}
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
        <div class="d-flex align-center flex-grow-1 mr-3" style="height: 32px">
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
          {{ isPlaying ? `${formatTime(Math.min(currentTime, message.duration))} / ` : ''
          }}{{ message.duration ? formatTime(message.duration) : '-' }}
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
              {{ playbackRate }}x
              <v-icon size="small">mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item
              v-for="speed in [1, 1.5, 2]"
              :key="speed"
              @click="setPlaybackSpeed(speed)"
              :active="playbackRate === speed"
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
