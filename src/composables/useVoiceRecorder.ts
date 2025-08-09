import { ref, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat.store'
import type { VoiceMessage } from '@/types/chat'

export const useVoiceRecorder = () => {
  const chatStore = useChatStore()
  
  const mediaRecorder = ref<MediaRecorder | null>(null)
  const audioStream = ref<MediaStream | null>(null)
  const recordingTimer = ref<NodeJS.Timeout | null>(null)
  const audioChunks = ref<Blob[]>([])
  
  const startRecording = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStream.value = stream
      
      const recorder = new MediaRecorder(stream)
      mediaRecorder.value = recorder
      audioChunks.value = []
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.value.push(event.data)
        }
      }
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.value, { type: 'audio/wav' })
        
        // Validate audio is not silent
        const isValid = await validateAudio(audioBlob)
        if (isValid) {
          await createVoiceMessage(audioBlob)
        } else {
          console.warn('Audio validation failed: audio is too quiet or silent')
        }
        
        cleanup()
      }
      
      recorder.start()
      chatStore.setRecordingState(true)
      
      // Start timer
      let duration = 0
      recordingTimer.value = setInterval(() => {
        duration++
        chatStore.updateRecordingDuration(duration)
        
        // Auto-stop after 30 seconds
        if (duration >= 30) {
          stopRecording()
        }
      }, 1000)
      
      return true
    } catch (error) {
      console.error('Error starting recording:', error)
      return false
    }
  }
  
  const stopRecording = () => {
    if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
      mediaRecorder.value.stop()
    }
    chatStore.setRecordingState(false)
    
    if (recordingTimer.value) {
      clearInterval(recordingTimer.value)
      recordingTimer.value = null
    }
  }
  
  const validateAudio = async (audioBlob: Blob): Promise<boolean> => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      const channelData = audioBuffer.getChannelData(0)
      let sum = 0
      let peak = 0
      
      for (let i = 0; i < channelData.length; i++) {
        const sample = Math.abs(channelData[i])
        sum += sample
        peak = Math.max(peak, sample)
      }
      
      const average = sum / channelData.length
      const threshold = 0.01 // Minimum average amplitude
      const peakThreshold = 0.1 // Minimum peak amplitude
      
      await audioContext.close()
      
      return average > threshold && peak > peakThreshold
    } catch (error) {
      console.error('Error validating audio:', error)
      return true // If validation fails, assume audio is valid
    }
  }
  
  const createVoiceMessage = async (audioBlob: Blob) => {
    const audioUrl = URL.createObjectURL(audioBlob)
    const duration = await getAudioDuration(audioBlob)
    
    const message: VoiceMessage = {
      id: Date.now().toString(),
      nickname: chatStore.userNickname,
      audioBlob,
      audioUrl,
      duration,
      timestamp: new Date(),
      isOwn: true
    }
    
    chatStore.addMessage(message)
  }
  
  const getAudioDuration = (audioBlob: Blob): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio()
      audio.onloadedmetadata = () => {
        resolve(Math.round(audio.duration))
        audio.remove()
      }
      audio.src = URL.createObjectURL(audioBlob)
    })
  }
  
  const cleanup = () => {
    if (audioStream.value) {
      audioStream.value.getTracks().forEach(track => track.stop())
      audioStream.value = null
    }
    
    if (recordingTimer.value) {
      clearInterval(recordingTimer.value)
      recordingTimer.value = null
    }
    
    mediaRecorder.value = null
    audioChunks.value = []
  }
  
  onUnmounted(() => {
    cleanup()
  })
  
  return {
    startRecording,
    stopRecording,
    isRecording: chatStore.isRecording,
    recordingDuration: chatStore.recordingDuration
  }
}