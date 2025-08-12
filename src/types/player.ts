import { type Ref } from 'vue';

export interface VoicePlayerReturn {
  /**
   * The currently playing audio element, or null if no audio is playing.
   */
  currentAudio: Ref<HTMLAudioElement | null>;
  /**
   * Whether the audio is currently playing.
   */
  isPlaying: Ref<boolean>;
  /**
   * The ID of the message that is currently playing, or null if no message is playing.
   */
  currentMessageId: Ref<string | null>;
  /**
   * The playback rate of the audio, 1 being normal speed.
   */
  playbackRate: Ref<number>;
  /**
   * The current time of the audio, in seconds.
   */
  currentTime: Ref<number>;
  /**
   * The duration of the audio, in seconds.
   */
  duration: Ref<number>;
  /**
   * Starts playing an audio file.
   * @param audioUrl The URL of the audio file to play.
   * @param messageId The ID of the message associated with the audio.
   */
  playAudio: (audioUrl: string, messageId: string) => Promise<void>;
  /**
   * Pauses the audio.
   */
  pauseAudio: () => void;
  /**
   * Stops the audio and resets the current time to 0.
   */
  stopAudio: () => void;
  /**
   * Resumes playing the audio from the current time.
   */
  resumeAudio: () => Promise<void>;
  /**
   * Sets the playback rate of the audio.
   * @param rate The new playback rate.
   */
  setPlaybackRate: (rate: number) => void;
  /**
   * Checks if a message is currently playing.
   * @param messageId The ID of the message to check.
   */
  isMessagePlaying: (messageId: string) => boolean;
}
