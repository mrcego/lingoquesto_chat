import type { VoicePlayerReturn } from "@/types/player"

export const useVoicePlayer = (): VoicePlayerReturn => {
  // Refs
  const currentAudio = ref<HTMLAudioElement | null>(null)
  const isPlaying = ref(false)
  const currentMessageId = ref<string | null>(null)
  const playbackRate = ref(1)
  const currentTime = ref(0)
  const duration = ref(0)

  const playAudio = async (audioUrl: string, messageId: string) => {
    // Stop current audio if playing
    if (currentAudio.value) {
      stopAudio()
    }

    const audio = new Audio(audioUrl)
    currentAudio.value = audio
    currentMessageId.value = messageId

    audio.playbackRate = playbackRate.value

    audio.onloadedmetadata = () => {
      duration.value = Math.round(audio.duration)
    }

    audio.ontimeupdate = () => {
      currentTime.value = Math.round(audio.currentTime)
    }

    audio.onended = () => {
      isPlaying.value = false
      currentMessageId.value = null
      currentTime.value = 0
    }

    audio.onerror = () => {
      console.error('Error playing audio')
      isPlaying.value = false
      currentMessageId.value = null
    }

    try {
      await audio.play()
      isPlaying.value = true
    } catch (error) {
      console.error('Error starting playback:', error)
    }
  }

  const stopAudio = () => {
    if (currentAudio.value) {
      currentAudio.value.pause()
      currentAudio.value.currentTime = 0
      currentAudio.value = null
    }
    isPlaying.value = false
    currentMessageId.value = null
    currentTime.value = 0
  }

  const pauseAudio = () => {
    if (currentAudio.value) {
      currentAudio.value.pause()
      isPlaying.value = false
    }
  }

  const resumeAudio = async () => {
    if (currentAudio.value) {
      try {
        await currentAudio.value.play()
        isPlaying.value = true
      } catch (error) {
        console.error('Error resuming playback:', error)
      }
    }
  }

  const setPlaybackRate = (rate: number) => {
    playbackRate.value = rate
    if (currentAudio.value) {
      currentAudio.value.playbackRate = rate
    }
  }

  const isMessagePlaying = (messageId: string) => {
    return currentMessageId.value === messageId && isPlaying.value
  }

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
    isMessagePlaying
  }
}