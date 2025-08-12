import { useChatStore } from '@/stores/chat.store'

import { useRealtimeChat } from '@/composables/useRealtimeChat'

import type { VoiceMessage } from '@/types/chat'

export const useVoiceRecorder = () => {
  const chatStore = useChatStore()
  const realtimeChat = useRealtimeChat()

  // Estados
  const mediaRecorder = ref<MediaRecorder | null>(null)
  const audioStream = ref<MediaStream | null>(null)
  const recordingTimer = ref<ReturnType<typeof setInterval> | null>(null)
  const audioChunks = ref<Blob[]>([])
  const isRecordingActive = ref(false)
  const audioContext = ref<AudioContext | null>(null)
  const gainNode = ref<GainNode | null>(null)
  const compressorNode = ref<DynamicsCompressorNode | null>(null)

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
          // Habilitar mejoras de audio
          echoCancellation: true,      // Habilitar cancelación de eco
          noiseSuppression: true,      // Habilitar supresión de ruido
          autoGainControl: true,       // Habilitar control automático de ganancia
          sampleRate: 48000,           // Tasa de muestreo más alta para mejor calidad
          channelCount: 1,             // Mono recording
          sampleSize: 16,              // 16-bit samples para buena calidad
        }
      })

      console.log('Microphone access granted, tracks:', stream.getTracks().length)

      // Configurar procesamiento de audio adicional
      await setupAudioProcessing(stream)

      // Configurar estados
      audioStream.value = stream
      audioChunks.value = []
      isRecordingActive.value = true

      // Crear MediaRecorder con la configuración más compatible
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus'
      }

      console.log('Using MIME type:', mimeType)

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000  // Bitrate más alto para mejor calidad
      })
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

      // Iniciar grabación con chunks más frecuentes para mejor detección
      recorder.start(250)
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

  const setupAudioProcessing = async (stream: MediaStream): Promise<void> => {
    try {
      // Crear contexto de audio para procesamiento adicional
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioContextClass()
      audioContext.value = ctx

      // Crear nodos de procesamiento
      const source = ctx.createMediaStreamSource(stream)
      const compressor = ctx.createDynamicsCompressor()
      const gain = ctx.createGain()
      const destination = ctx.createMediaStreamDestination()

      // Configurar compresor para normalizar el volumen
      compressor.threshold.value = -24      // Umbral de compresión
      compressor.knee.value = 30            // Suavidad de la compresión
      compressor.ratio.value = 12           // Ratio de compresión
      compressor.attack.value = 0.01        // Tiempo de ataque
      compressor.release.value = 0.25       // Tiempo de liberación

      // Configurar ganancia (amplificación)
      gain.gain.value = 2.5                 // Amplificar el audio 2.5x

      // Conectar nodos: source -> compressor -> gain -> destination
      source.connect(compressor)
      compressor.connect(gain)
      gain.connect(destination)

      // Reemplazar el stream original con el procesado
      const processedTracks = destination.stream.getTracks()
      if (processedTracks.length > 0) {
        // Reemplazar las pistas de audio originales
        const originalTracks = stream.getAudioTracks()
        originalTracks.forEach(track => stream.removeTrack(track))
        processedTracks.forEach(track => stream.addTrack(track))

        console.log('Audio processing setup completed')
        compressorNode.value = compressor
        gainNode.value = gain
      }

    } catch (error) {
      console.warn('Audio processing setup failed, using original stream:', error)
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

    // Detener contexto de audio
    if (audioContext.value && audioContext.value.state !== 'closed') {
      try {
        await audioContext.value.close()
        audioContext.value = null
        gainNode.value = null
        compressorNode.value = null
      } catch (error) {
        console.error('Error closing audio context:', error)
      }
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

    // Cerrar contexto de audio
    if (audioContext.value && audioContext.value.state !== 'closed') {
      try {
        await audioContext.value.close()
        audioContext.value = null
        gainNode.value = null
        compressorNode.value = null
        console.log('Audio context closed')
      } catch (error) {
        console.error('Error closing audio context:', error)
      }
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

      // Validar audio con umbrales MÁS PERMISIVOS
      const isValid = await validateAudio(audioBlob)
      console.log('Audio validation result:', isValid)

      if (isValid) {
        await createVoiceMessage(audioBlob)
      } else {
        alert('No detectamos audio. Intente hablar más cerca del micrófono.')
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
      // CAMBIO IMPORTANTE: Reducir el umbral mínimo de tamaño
      if (audioBlob.size < 500) {  // Reducido de 1000 a 500 bytes
        console.log('Audio too small:', audioBlob.size, 'bytes')
        return false
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioContextClass()
      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      const channelData = audioBuffer.getChannelData(0)
      let sum = 0
      let peak = 0
      let nonZeroSamples = 0

      for (let i = 0; i < channelData.length; i++) {
        const sample = Math.abs(channelData[i])
        sum += sample
        peak = Math.max(peak, sample)
        if (sample > 0.001) nonZeroSamples++  // Contar samples con contenido
      }

      const average = sum / channelData.length
      const nonZeroRatio = nonZeroSamples / channelData.length

      await audioContext.close()

      // CAMBIO IMPORTANTE: Umbrales MÁS PERMISIVOS
      const hasAverage = average > 0.001    // Reducido de 0.005 a 0.001
      const hasPeak = peak > 0.01           // Reducido de 0.05 a 0.01
      const hasContent = nonZeroRatio > 0.1 // Al menos 10% del audio tiene contenido
      const hasMinDuration = audioBuffer.duration > 0.5  // Al menos 0.5 segundos

      const isValid = (hasAverage || hasPeak || hasContent) && hasMinDuration

      console.log('Audio validation stats:', {
        size: audioBlob.size,
        duration: audioBuffer.duration,
        average: average.toFixed(6),
        peak: peak.toFixed(6),
        nonZeroRatio: nonZeroRatio.toFixed(3),
        hasAverage,
        hasPeak,
        hasContent,
        hasMinDuration,
        isValid
      })

      return isValid

    } catch (error) {
      console.error('Audio validation error:', error)
      // Fallback más permisivo: si hay error, validar solo por tamaño y duración estimada
      const estimatedDuration = audioBlob.size / 16000  // Estimación básica
      const isValid = audioBlob.size > 500 && estimatedDuration > 0.5
      console.log('Using fallback validation:', { size: audioBlob.size, estimatedDuration, isValid })
      return isValid
    }
  }

  const createVoiceMessage = async (audioBlob: Blob): Promise<void> => {
    try {
      const duration = await getAudioDuration(audioBlob);
      const validatedDuration = Math.max(1, Math.min(30, duration));

      // Convert Blob to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1]; // Remove data URL prefix
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const message: VoiceMessage = {
        id: Date.now().toString(),
        type: 'VOICE_MESSAGE',
        nickname: chatStore.userNickname,
        audioData: base64Data,  // Store the base64 string
        mimeType: audioBlob.type || 'audio/webm',
        duration: validatedDuration,
        timestamp: new Date(),
        isOwn: true
      };

      console.log('✅ Sending voice message:', {
        size: audioBlob.size,
        duration: validatedDuration,
        mimeType: audioBlob.type
      })

      chatStore.addMessage(message);
      realtimeChat.sendVoiceMessage(message);
    } catch (error) {
      console.error('Error creating voice message:', error);
    }
  };

  const getAudioDuration = (audioBlob: Blob): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio()
      const objectUrl = URL.createObjectURL(audioBlob)

      const cleanup = () => {
        URL.revokeObjectURL(objectUrl)
        audio.remove()
      }

      const timeout = setTimeout(() => {
        console.log('Audio duration timeout, using fallback')
        resolve(Math.max(1, Math.floor(audioBlob.size / 16000))) // Estimación basada en tamaño
        cleanup()
      }, 3000)

      audio.onloadedmetadata = () => {
        clearTimeout(timeout)
        let duration = audio.duration

        // Verificar que la duración es válida
        if (!duration || isNaN(duration) || !isFinite(duration) || duration <= 0) {
          console.log('Invalid audio duration:', duration, 'using fallback')
          duration = Math.max(1, Math.floor(audioBlob.size / 16000)) // Estimación
        } else {
          duration = Math.round(duration)
        }

        console.log('Audio duration calculated:', duration, 'seconds')
        resolve(duration)
        cleanup()
      }

      audio.onerror = (error) => {
        console.error('Error loading audio for duration:', error)
        clearTimeout(timeout)
        resolve(Math.max(1, Math.floor(audioBlob.size / 16000))) // Estimación basada en tamaño
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

    // Cerrar contexto de audio
    if (audioContext.value && audioContext.value.state !== 'closed') {
      try {
        await audioContext.value.close()
        console.log('Audio context closed')
      } catch (error) {
        console.error('Error closing audio context:', error)
      }
      audioContext.value = null
      gainNode.value = null
      compressorNode.value = null
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
  }
}