import { type Ref } from 'vue'

export interface VoicePlayerReturn {
    currentAudio: Ref<HTMLAudioElement | null>
    isPlaying: Ref<boolean>
    currentMessageId: Ref<string | null>
    playbackRate: Ref<number>
    currentTime: Ref<number>
    duration: Ref<number>
    playAudio: (audioUrl: string, messageId: string) => Promise<void>
    pauseAudio: () => void
    stopAudio: () => void
    resumeAudio: () => Promise<void>
    setPlaybackRate: (rate: number) => void
    isMessagePlaying: (messageId: string) => boolean
}