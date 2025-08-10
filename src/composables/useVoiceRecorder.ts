import { ref, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat.store'
import type { VoiceMessage } from '@/types/chat'

export const useVoiceRecorder = () => {
  const chatStore = useChatStore()
  
  // Estados
  const mediaRecorder = ref<MediaRecorder | null>(null)
  const audioStream = ref<MediaStream | null>(null)
  const recordingTimer = ref<ReturnType<typeof setInterval> | null>(null)
  const audioChunks = ref<Blob[]>([])
  const isRecordingActive = ref(false)
  
  const startRecording = async (): Promise<boolean> => {
    console.log('=== START RECORDING ===')
    
    // Si ya está grabando, no hacer nada
    if (isRecordingActive.value) {
      console.log('Already recording')
      return false
    }
    
    try {
      // Limpiar estado previo
      await cleanup()
      
      // Solicitar acceso al micrófono
      console.log('Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      console.log('Microphone access granted, tracks:', stream.getTracks().length)
      
      // Configurar estados
      audioStream.value = stream
      audioChunks.value = []
      isRecordingActive.value = true
      
      // Crear MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm'
      
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorder.value = recorder
      
      // Configurar eventos
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && isRecordingActive.value) {
          audioChunks.value.push(event.data)
          console.log('Audio chunk received:', event.data.size, 'bytes')
        }
      }
      
      recorder.onstop = () => {
        console.log('MediaRecorder stopped')
      }
      
      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        stopRecording()
      }
      
      // Iniciar grabación
      recorder.start(100)
      console.log('Recording started, state:', recorder.state)
      
      // Actualizar UI
      chatStore.setRecordingState(true)
      
      // Iniciar timer
      startTimer()
      
      return true
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      await cleanup()
      return false
    }
  }
  
  const forceStop = async (): Promise<void> => {
    console.log('=== FORCE STOP ===')
    
    // Forzar parada sin verificar condiciones
    isRecordingActive.value = false
    
    // Detener timer
    if (recordingTimer.value) {
      clearInterval(recordingTimer.value)
      recordingTimer.value = null
    }
    
    // Actualizar UI
    chatStore.setRecordingState(false)
    
    // Detener audio stream INMEDIATAMENTE
    if (audioStream.value) {
      audioStream.value.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          track.stop()
        }
      })
      audioStream.value = null
    }
    
    // Detener MediaRecorder
    if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
      try {
        mediaRecorder.value.stop()
      } catch (error) {
        console.error('Error force stopping MediaRecorder:', error)
      }
    }
    
    // Procesar lo que tengamos
    setTimeout(async () => {
      await processRecording()
    }, 100)
  }
  
  const stopRecording = async (): Promise<void> => {
    console.log('=== STOP RECORDING CALLED ===')
    console.log('isRecordingActive:', isRecordingActive.value)
    console.log('chatStore.isRecording:', chatStore.isRecording)
    console.log('hasMediaRecorder:', !!mediaRecorder.value)
    console.log('hasAudioStream:', !!audioStream.value)
    
    // Si no está grabando internamente, usar force stop como backup
    if (!isRecordingActive.value) {
      console.log('Not recording internally, trying force stop as backup')
      if (chatStore.isRecording || audioStream.value || (mediaRecorder.value?.state === 'recording')) {
        console.log('But chat store says recording or stream exists, force stopping')
        await forceStop()
      }
      return
    }
    
    // Marcar como inactivo INMEDIATAMENTE para prevenir múltiples llamadas
    isRecordingActive.value = false
    console.log('Set isRecordingActive to false')
    
    // Detener timer INMEDIATAMENTE
    if (recordingTimer.value) {
      clearInterval(recordingTimer.value)
      recordingTimer.value = null
      console.log('Timer stopped')
    }
    
    // Actualizar UI INMEDIATAMENTE
    chatStore.setRecordingState(false)
    console.log('UI updated to not recording')
    
    // Detener pistas de audio INMEDIATAMENTE - ESTO ES LO MÁS CRÍTICO
    if (audioStream.value) {
      const tracks = audioStream.value.getTracks()
      console.log('Stopping audio tracks:', tracks.length)
      
      tracks.forEach((track, index) => {
        if (track.readyState === 'live') {
          console.log(`Stopping track ${index}:`, track.label)
          track.stop()
        }
      })
      
      // Nullificar el stream inmediatamente para evitar que se siga usando
      audioStream.value = null
      
      // Verificar que se detuvieron
      setTimeout(() => {
        tracks.forEach((track, index) => {
          console.log(`Track ${index} final state:`, track.readyState)
        })
      }, 100)
    }
    
    // Detener MediaRecorder
    if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
      console.log('Stopping MediaRecorder...')
      try {
        mediaRecorder.value.stop()
        console.log('MediaRecorder stopped successfully')
      } catch (error) {
        console.error('Error stopping MediaRecorder:', error)
      }
    }
    
    // Procesar grabación después de un breve delay
    setTimeout(async () => {
      await processRecording()
    }, 200)
  }
  
  const startTimer = (): void => {
    let duration = 0
    chatStore.updateRecordingDuration(duration)
    
    recordingTimer.value = setInterval(() => {
      // Verificar si aún debe seguir el timer
      if (!isRecordingActive.value) {
        if (recordingTimer.value) {
          clearInterval(recordingTimer.value)
          recordingTimer.value = null
        }
        return
      }
      
      duration++
      chatStore.updateRecordingDuration(duration)
      console.log('Recording duration:', duration)
      
      // Auto-detener a los 30 segundos
      if (duration >= 30) {
        console.log('30 seconds reached, auto-stopping')
        stopRecording()
      }
    }, 1000)
  }
  
  const processRecording = async (): Promise<void> => {
    console.log('=== PROCESSING RECORDING ===')
    console.log('Audio chunks:', audioChunks.value.length)
    
    if (audioChunks.value.length === 0) {
      console.log('No audio chunks to process')
      await cleanup()
      return
    }
    
    try {
      const audioBlob = new Blob(audioChunks.value, { 
        type: mediaRecorder.value?.mimeType || 'audio/webm' 
      })
      
      console.log('Audio blob created, size:', audioBlob.size, 'bytes')
      
      // Validar audio
      const isValid = await validateAudio(audioBlob)
      console.log('Audio validation result:', isValid)
      
      if (isValid) {
        await createVoiceMessage(audioBlob)
      } else {
        console.log('Audio rejected - insufficient content')
      }
      
    } catch (error) {
      console.error('Error processing recording:', error)
    } finally {
      await cleanup()
    }
  }
  
  const validateAudio = async (audioBlob: Blob): Promise<boolean> => {
    try {
      // Verificar tamaño mínimo
      if (audioBlob.size < 1000) {
        console.log('Audio too small:', audioBlob.size, 'bytes')
        return false
      }
      
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
      await audioContext.close()
      
      const isValid = average > 0.005 || peak > 0.05
      console.log('Audio stats - average:', average, 'peak:', peak, 'valid:', isValid)
      
      return isValid
      
    } catch (error) {
      console.error('Audio validation error:', error)
      return audioBlob.size > 1000 // Fallback
    }
  }
  
  const createVoiceMessage = async (audioBlob: Blob): Promise<void> => {
    try {
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
      console.log('Voice message created successfully')
      
    } catch (error) {
      console.error('Error creating voice message:', error)
    }
  }
  
  const getAudioDuration = (audioBlob: Blob): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio()
      const objectUrl = URL.createObjectURL(audioBlob)
      
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl)
        audio.remove()
      }
      
      const timeout = setTimeout(() => {
        resolve(1)
        cleanup()
      }, 3000)
      
      audio.onloadedmetadata = () => {
        clearTimeout(timeout)
        const duration = Math.round(audio.duration) || 1
        resolve(duration)
        cleanup()
      }
      
      audio.onerror = () => {
        clearTimeout(timeout)
        resolve(1)
        cleanup()
      }
      
      audio.src = objectUrl
    })
  }
  
  const cleanup = async (): Promise<void> => {
    console.log('=== CLEANUP ===')
    
    // Resetear estado
    isRecordingActive.value = false
    
    // Detener timer
    if (recordingTimer.value) {
      clearInterval(recordingTimer.value)
      recordingTimer.value = null
      console.log('Timer cleared')
    }
    
    // Actualizar store
    chatStore.setRecordingState(false)
    chatStore.resetRecordingDuration()
    
    // Detener pistas de audio
    if (audioStream.value) {
      try {
        audioStream.value.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop()
          }
        })
        console.log('Audio tracks stopped')
      } catch (error) {
        console.error('Error stopping audio tracks:', error)
      }
      audioStream.value = null
    }
    
    // Limpiar MediaRecorder
    if (mediaRecorder.value) {
      try {
        if (mediaRecorder.value.state !== 'inactive') {
          mediaRecorder.value.stop()
        }
      } catch (error) {
        console.error('Error stopping MediaRecorder:', error)
      }
      mediaRecorder.value = null
    }
    
    // Limpiar chunks
    audioChunks.value = []
    
    console.log('Cleanup completed')
  }
  
  // Cleanup al desmontar componente
  onUnmounted(() => {
    cleanup()
  })
  
  return {
    startRecording,
    stopRecording,
    forceStop,
    isRecording: chatStore.isRecording,
    recordingDuration: chatStore.recordingDuration
  }
}