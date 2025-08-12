import type { VoicePlayerReturn } from '@/types/player';

/**
 * Composable to handle audio playback for voice messages
 * @returns A VoicePlayerReturn object with the following properties:
 * - currentAudio: The current HTMLAudioElement being played
 * - isPlaying: A boolean indicating whether an audio is currently playing
 * - currentMessageId: The id of the voice message currently playing
 * - playbackRate: The current playback rate (1 is normal speed)
 * - currentTime: The current time of the audio in seconds
 * - duration: The total duration of the audio in seconds
 * - playAudio: A function to play an audio with the given url and messageId
 * - stopAudio: A function to stop the current audio
 * - pauseAudio: A function to pause the current audio
 * - resumeAudio: A function to resume the current audio
 * - setPlaybackRate: A function to set the playback rate
 * - isMessagePlaying: A function to check if a message is currently playing
 */
export const useVoicePlayer = (): VoicePlayerReturn => {
  // Refs
  const currentAudio = ref<HTMLAudioElement | null>(null);
  const isPlaying = ref(false);
  const currentMessageId = ref<string | null>(null);
  const playbackRate = ref(1);
  const currentTime = ref(0);
  const duration = ref(0);

  /**
   * Play an audio with the given url and messageId
   * @param audioUrl The url of the audio to play
   * @param messageId The id of the voice message to play
   */
  const playAudio = async (audioUrl: string, messageId: string) => {
    // Stop current audio if playing
    if (currentAudio.value) {
      stopAudio();
    }

    const audio = new Audio(audioUrl);
    currentAudio.value = audio;
    currentMessageId.value = messageId;

    audio.playbackRate = playbackRate.value;

    audio.onloadedmetadata = () => {
      duration.value = Math.round(audio.duration);
    };

    audio.ontimeupdate = () => {
      currentTime.value = Math.round(audio.currentTime);
    };

    audio.onended = () => {
      isPlaying.value = false;
      currentMessageId.value = null;
      currentTime.value = 0;
    };

    audio.onerror = () => {
      console.error('Error playing audio');
      isPlaying.value = false;
      currentMessageId.value = null;
    };

    try {
      await audio.play();
      isPlaying.value = true;
    } catch (error) {
      console.error('Error starting playback:', error);
    }
  };

  /**
   * Stop the current audio
   */
  const stopAudio = () => {
    if (currentAudio.value) {
      currentAudio.value.pause();
      currentAudio.value.currentTime = 0;
      currentAudio.value = null;
    }
    isPlaying.value = false;
    currentMessageId.value = null;
    currentTime.value = 0;
  };

  /**
   * Pause the current audio
   */
  const pauseAudio = () => {
    if (currentAudio.value) {
      currentAudio.value.pause();
      isPlaying.value = false;
    }
  };

  /**
   * Resume the current audio
   */
  const resumeAudio = async () => {
    if (currentAudio.value) {
      try {
        await currentAudio.value.play();
        isPlaying.value = true;
      } catch (error) {
        console.error('Error resuming playback:', error);
      }
    }
  };

  /**
   * Set the playback rate
   * @param rate The new playback rate
   */
  const setPlaybackRate = (rate: number) => {
    playbackRate.value = rate;
    if (currentAudio.value) {
      currentAudio.value.playbackRate = rate;
    }
  };

  /**
   * Check if a message is currently playing
   * @param messageId The id of the voice message to check
   * @returns A boolean indicating whether the message is currently playing
   */
  const isMessagePlaying = (messageId: string) => {
    return currentMessageId.value === messageId && isPlaying.value;
  };

  return {
    currentAudio,
    isPlaying,
    currentMessageId,
    playbackRate,
    currentTime,
    duration,
    playAudio,
    stopAudio,
    pauseAudio,
    resumeAudio,
    setPlaybackRate,
    isMessagePlaying,
  };
};
