import { useChatStore } from '@/stores/chat.store'
import { useRealtimeChat } from '@/composables/useRealtimeChat'
import type { VoiceMessage } from '@/types/chat'

/**
 * Voice Recording Composable
 * 
 * Provides comprehensive voice recording functionality with advanced audio processing,
 * validation, and integration with chat systems. Features include noise suppression,
 * echo cancellation, dynamic compression, and automatic quality validation.
 */
export const useVoiceRecorder = () => {
  const chatStore = useChatStore()

  const { setRecordingState, updateRecordingDuration, addMessage } = chatStore
  const { isRecording } = storeToRefs(chatStore)

  const { sendVoiceMessage } = useRealtimeChat()


  // ========== REACTIVE STATE ==========
  const mediaRecorder = ref<MediaRecorder | null>(null)        // MediaRecorder instance for audio capture
  const audioStream = ref<MediaStream | null>(null)            // Raw audio stream from microphone
  const recordingTimer = ref<ReturnType<typeof setInterval> | null>(null)  // Timer for recording duration
  const audioChunks = ref<Blob[]>([])                         // Array to store audio data chunks
  const isRecordingActive = ref(false)                        // Internal recording state flag
  const audioContext = ref<AudioContext | null>(null)        // Web Audio API context for processing
  const gainNode = ref<GainNode | null>(null)                // Audio gain/amplification node
  const compressorNode = ref<DynamicsCompressorNode | null>(null)  // Audio compression node

  /**
   * Starts voice recording with enhanced audio settings and processing
   * 
   * @returns Promise<boolean> - true if recording started successfully, false otherwise
   */
  const startRecording = async (): Promise<boolean> => {
    console.log('=== START RECORDING ===')

    // Prevent multiple simultaneous recordings
    if (isRecordingActive.value) {
      console.log('Already recording')
      return false
    }

    try {
      // Clear any previous recording state
      await cleanup()

      // Request microphone access with high-quality audio settings
      console.log('Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Audio enhancement features
          echoCancellation: true,      // Remove echo feedback
          noiseSuppression: true,      // Reduce background noise
          autoGainControl: true,       // Automatic volume normalization
          sampleRate: 48000,           // High quality sample rate (48kHz)
          channelCount: 1,             // Mono recording for smaller file size
          sampleSize: 16,              // 16-bit audio for good quality/size balance
        }
      })

      console.log('Microphone access granted, tracks:', stream.getTracks().length)

      // Apply additional audio processing (compression, gain)
      await setupAudioProcessing(stream)

      // Initialize recording state
      audioStream.value = stream
      audioChunks.value = []
      isRecordingActive.value = true

      // Select best available audio codec based on browser support
      const preferredMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4'
      ]
      const mimeType = preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type))
        || 'audio/webm'  // Default fallback MIME type if none of the above are supported

      console.log('Using MIME type:', mimeType)

      // Create MediaRecorder with optimal settings
      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000  // 128kbps for good quality/size balance
      })
      mediaRecorder.value = recorder

      // Set up MediaRecorder event handlers
      recorder.ondataavailable = (event) => {
        // Collect audio data chunks as they become available
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

      // Start recording with frequent data chunks (every 250ms) for better responsiveness
      recorder.start(250)
      console.log('Recording started, state:', recorder.state)

      // Update UI to show recording state
      setRecordingState(true)

      // Start recording timer
      startTimer()

      return true

    } catch (error) {
      console.error('Failed to start recording:', error)
      await cleanup()
      return false
    }
  }

  /**
   * Sets up advanced audio processing pipeline for enhanced recording quality
   * Creates: Input → Compressor → Gain → Output chain
   * 
   * @param stream - Raw audio stream from microphone
   */
  const setupAudioProcessing = async (stream: MediaStream): Promise<void> => {
    try {
      // Create Web Audio API context (cross-browser compatible)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioContextClass()
      audioContext.value = ctx

      // Create audio processing nodes
      const source = ctx.createMediaStreamSource(stream)  // Input from microphone
      const compressor = ctx.createDynamicsCompressor()   // Volume compression/normalization
      const gain = ctx.createGain()                       // Volume amplification
      const destination = ctx.createMediaStreamDestination() // Output stream

      // Configure dynamic range compressor for consistent volume levels
      compressor.threshold.value = -24      // Start compression at -24dB
      compressor.knee.value = 30            // Smooth compression transition (30dB)
      compressor.ratio.value = 12           // 12:1 compression ratio (aggressive)
      compressor.attack.value = 0.01        // Fast attack (0.01s) for quick response
      compressor.release.value = 0.25       // Medium release (0.25s) for natural sound

      // Configure gain amplification
      gain.gain.value = 2.5                 // Amplify signal by 2.5x

      // Connect audio processing chain: source → compressor → gain → destination
      source.connect(compressor)
      compressor.connect(gain)
      gain.connect(destination)

      // Replace original stream tracks with processed audio
      const processedTracks = destination.stream.getTracks()
      if (processedTracks.length > 0) {
        // Remove original audio tracks
        const originalTracks = stream.getAudioTracks()
        originalTracks.forEach(track => stream.removeTrack(track))

        // Add processed audio tracks
        processedTracks.forEach(track => stream.addTrack(track))

        console.log('Audio processing setup completed')
        compressorNode.value = compressor
        gainNode.value = gain
      }

    } catch (error) {
      console.warn('Audio processing setup failed, using original stream:', error)
    }
  }

  /**
   * Forcefully stops recording without standard checks - used as emergency fallback
   * Immediately terminates all recording operations and processes available audio
   */
  const forceStop = async (): Promise<void> => {
    console.log('=== FORCE STOP ===')

    // Immediately disable recording state
    isRecordingActive.value = false

    // Stop recording timer immediately
    if (recordingTimer.value) {
      clearInterval(recordingTimer.value)
      recordingTimer.value = null
    }

    // Update UI immediately
    setRecordingState(false)

    // Stop all audio tracks immediately - critical for microphone release
    if (audioStream.value) {
      audioStream.value.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          track.stop()
        }
      })
      audioStream.value = null
    }

    // Close audio processing context
    await closingAudioContext()

    // Stop MediaRecorder
    if (mediaRecorder.value?.state !== 'inactive') {
      try {
        mediaRecorder.value?.stop()
      } catch (error) {
        console.error('Error force stopping MediaRecorder:', error)
      }
    }

    // Process any recorded audio data after brief delay
    setTimeout(async () => {
      await processRecording()
    }, 100)
  }

  /**
   * Stops recording gracefully with proper cleanup sequence
   * Ensures all resources are released and audio is processed
   */
  const stopRecording = async (): Promise<void> => {
    console.log('=== STOP RECORDING CALLED ===')
    console.log('isRecordingActive:', isRecordingActive.value)
    console.log('chatStore.isRecording:', isRecording.value)
    console.log('hasMediaRecorder:', !!mediaRecorder.value)
    console.log('hasAudioStream:', !!audioStream.value)

    // Handle case where internal state says not recording but UI/streams suggest otherwise
    if (!isRecordingActive.value) {
      console.log('Not recording internally, trying force stop as backup')
      if (isRecording.value || audioStream.value || (mediaRecorder.value?.state === 'recording')) {
        console.log('But chat store says recording or stream exists, force stopping')
        await forceStop()
      }

      return
    }

    // CRITICAL: Set inactive state immediately to prevent multiple stop calls
    isRecordingActive.value = false
    console.log('Set isRecordingActive to false')

    // Stop timer immediately to prevent UI updates
    if (recordingTimer.value) {
      clearInterval(recordingTimer.value)
      recordingTimer.value = null
      console.log('Timer stopped')
    }

    // Update UI state immediately
    setRecordingState(false)
    console.log('UI updated to not recording')

    // MOST CRITICAL: Stop microphone access immediately
    if (audioStream.value) {
      const tracks = audioStream.value.getTracks()
      console.log('Stopping audio tracks:', tracks.length)

      tracks.forEach((track, index) => {
        if (track.readyState === 'live') {
          console.log(`Stopping track ${index}:`, track.label)
          track.stop()  // This releases the microphone
        }
      })

      // Nullify stream reference immediately
      audioStream.value = null

      // Verify tracks were stopped (for debugging)
      setTimeout(() => {
        tracks.forEach((track, index) => {
          console.log(`Track ${index} final state:`, track.readyState)
        })
      }, 100)
    }

    // Close audio processing context and clean up nodes
    await closingAudioContext()

    // Stop MediaRecorder if still active
    if (mediaRecorder.value?.state === 'recording') {
      console.log('Stopping MediaRecorder...')
      try {
        mediaRecorder.value?.stop()
        console.log('MediaRecorder stopped successfully')
      } catch (error) {
        console.error('Error stopping MediaRecorder:', error)
      }
    }

    // Process the recorded audio after brief delay to ensure MediaRecorder has finished
    setTimeout(async () => {
      await processRecording()
    }, 200)
  }

  /**
   * Manages recording timer with duration updates and auto-stop functionality
   * Updates UI every second and enforces 30-second maximum recording limit
   */
  const startTimer = (): void => {
    let duration = 0
    updateRecordingDuration(duration)

    recordingTimer.value = setInterval(() => {
      // Safety check: stop timer if recording is no longer active
      if (!isRecordingActive.value) {
        if (recordingTimer.value) {
          clearInterval(recordingTimer.value)
          recordingTimer.value = null
        }
        return
      }

      duration++
      updateRecordingDuration(duration)
      console.log('Recording duration:', duration)

      // Auto-stop at 30 seconds to prevent excessively long recordings
      if (duration > 30) {
        console.log('30 seconds reached, auto-stopping')
        stopRecording()
      }
    }, 1000)
  }

  /**
   * Processes recorded audio chunks into a complete audio file
   * Validates audio quality and creates voice message if acceptable
   */
  const processRecording = async (): Promise<void> => {
    console.log('=== PROCESSING RECORDING ===')
    console.log('Audio chunks:', audioChunks.value.length)

    // Check if we have any recorded audio data
    if (audioChunks.value.length === 0) {
      console.log('No audio chunks to process')
      await cleanup()
      return
    }

    try {
      // Combine all audio chunks into single blob
      const audioBlob = new Blob(audioChunks.value, {
        type: mediaRecorder.value?.mimeType || 'audio/webm'
      })

      console.log('Audio blob created, size:', audioBlob.size, 'bytes')

      // Validate audio quality and content (with permissive thresholds)
      const isValid = await validateAudio(audioBlob)
      console.log('Audio validation result:', isValid)

      if (isValid) {
        // Create and send voice message
        await createVoiceMessage(audioBlob)
      } else {
        // Inform user of insufficient audio quality
        alert('No detectamos audio. Intente hablar más cerca del micrófono.')
        console.log('Audio rejected - insufficient content')
      }

    } catch (error) {
      console.error('Error processing recording:', error)
    } finally {
      // Always clean up resources
      await cleanup()
    }
  }

  /**
   * Validates recorded audio for sufficient content and quality
   * Uses multiple criteria to determine if audio contains meaningful content
   * 
   * @param audioBlob - Recorded audio data
   * @returns Promise<boolean> - true if audio passes validation
   */
  const validateAudio = async (audioBlob: Blob): Promise<boolean> => {
    try {
      // PERMISSIVE: Reduced minimum size threshold to 500 bytes
      if (audioBlob.size < 500) {
        console.log('Audio too small:', audioBlob.size, 'bytes')
        return false
      }

      // Decode audio for detailed analysis
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioContextClass()
      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // Analyze audio content
      const channelData = audioBuffer.getChannelData(0)  // Get mono channel data
      let sum = 0          // Sum of all sample amplitudes
      let peak = 0         // Maximum amplitude found
      let nonZeroSamples = 0  // Count of samples with meaningful content

      // Process each audio sample
      for (let i = 0; i < channelData.length; i++) {
        const sample = Math.abs(channelData[i])  // Get absolute amplitude
        sum += sample
        peak = Math.max(peak, sample)
        if (sample > 0.001) nonZeroSamples++  // Count samples above noise floor
      }

      // Calculate audio statistics
      const average = sum / channelData.length               // Average amplitude
      const nonZeroRatio = nonZeroSamples / channelData.length  // Content ratio

      await audioContext.close()

      // PERMISSIVE: Reduced validation thresholds for better acceptance
      const hasAverage = average > 0.001    // Reduced from 0.005 to 0.001
      const hasPeak = peak > 0.01           // Reduced from 0.05 to 0.01
      const hasContent = nonZeroRatio > 0.1 // At least 10% contains audio content
      const hasMinDuration = audioBuffer.duration > 0.5  // At least 0.5 seconds long

      // Audio is valid if it has content AND minimum duration
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
      // Fallback validation: use basic size and duration estimation
      const estimatedDuration = audioBlob.size / 16000  // Rough duration estimate
      const isValid = audioBlob.size > 500 && estimatedDuration > 0.5
      console.log('Using fallback validation:', { size: audioBlob.size, estimatedDuration, isValid })
      return isValid
    }
  }

  /**
   * Creates a voice message object from validated audio and sends it
   * Converts audio to base64, calculates duration, and integrates with chat system
   * 
   * @param audioBlob - Validated audio data
   */
  const createVoiceMessage = async (audioBlob: Blob): Promise<void> => {
    try {
      // Get accurate audio duration
      const duration = await getAudioDuration(audioBlob);
      const validatedDuration = Math.max(1, Math.min(30, duration)); // Clamp between 1-30 seconds

      // Convert audio blob to base64 string for storage/transmission
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1]; // Remove data URL prefix
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Create structured voice message object
      const message: VoiceMessage = {
        id: Date.now().toString(),           // Unique message identifier
        type: 'VOICE_MESSAGE',               // Message type discriminator
        nickname: chatStore.userNickname,    // Sender's nickname
        audioData: base64Data,               // Base64 encoded audio data
        mimeType: audioBlob.type || 'audio/webm',  // Audio format
        duration: validatedDuration,         // Audio length in seconds
        timestamp: new Date(),               // When message was created
        isOwn: true                         // Marks as sent by current user
      };

      console.log('✅ Sending voice message:', {
        size: audioBlob.size,
        duration: validatedDuration,
        mimeType: audioBlob.type
      })

      // Add to local chat store and send via realtime connection
      addMessage(message);
      sendVoiceMessage(message);
    } catch (error) {
      console.error('Error creating voice message:', error);
    }
  };

  /**
   * Calculates accurate audio duration with multiple fallback methods
   * Uses HTML Audio element for precise duration, with timeout and fallback estimation
   * 
   * @param audioBlob - Audio data to analyze
   * @returns Promise<number> - Duration in seconds
   */
  const getAudioDuration = (audioBlob: Blob): Promise<number> => {
    return new Promise((resolve) => {
      // Create temporary audio element for duration detection
      const audio = new Audio()
      const objectUrl = URL.createObjectURL(audioBlob)

      // Cleanup function to prevent memory leaks
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl)
        audio.remove()
      }

      // Timeout fallback in case audio loading fails
      const timeout = setTimeout(() => {
        console.log('Audio duration timeout, using fallback')
        resolve(Math.max(1, Math.floor(audioBlob.size / 16000))) // Size-based estimation
        cleanup()
      }, 3000)

      // Primary method: get duration from audio metadata
      audio.onloadedmetadata = () => {
        clearTimeout(timeout)
        let { duration } = audio

        // Validate duration value
        if (!duration || isNaN(duration) || !isFinite(duration) || duration <= 0) {
          console.log('Invalid audio duration:', duration, 'using fallback')
          duration = Math.max(1, Math.floor(audioBlob.size / 16000)) // Fallback estimation
        } else {
          duration = Math.round(duration)  // Round to nearest second
        }

        console.log('Audio duration calculated:', duration, 'seconds')
        resolve(duration)
        cleanup()
      }

      // Error fallback
      audio.onerror = (error) => {
        console.error('Error loading audio for duration:', error)
        clearTimeout(timeout)
        resolve(Math.max(1, Math.floor(audioBlob.size / 16000))) // Size-based fallback
        cleanup()
      }

      // Start loading audio
      audio.src = objectUrl
    })
  }

  /**
   * Safely closes the active audio context and associated nodes
   * Ensures all Web Audio API resources are released after use
   * @returns Promise<void> - resolves when audio context is closed
   */
  const closingAudioContext = async (): Promise<void> => {
    if (audioContext.value?.state !== 'closed') {
      try {
        await audioContext.value?.close()
        audioContext.value = null
        gainNode.value = null
        compressorNode.value = null
        console.log('Audio context closed')
      } catch (error) {
        console.error('Error closing audio context:', error)
      }
    }
  }

  /**
   * Comprehensive cleanup function that releases all recording resources
   * Ensures microphone access is released and all timers/contexts are closed
   */
  const cleanup = async (): Promise<void> => {
    console.log('=== CLEANUP ===')

    // Reset recording state
    isRecordingActive.value = false

    // Clear recording timer
    if (recordingTimer.value) {
      clearInterval(recordingTimer.value)
      recordingTimer.value = null
      console.log('Timer cleared')
    }

    // Update UI state
    setRecordingState(false)

    // Stop and release microphone access
    if (audioStream.value) {
      try {
        audioStream.value.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop()  // Release microphone
          }
        })
        console.log('Audio tracks stopped')
      } catch (error) {
        console.error('Error stopping audio tracks:', error)
      }
      audioStream.value = null
    }

    // Close Web Audio API context and nodes
    await closingAudioContext()

    // Clean up MediaRecorder
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

    // Clear audio data chunks
    audioChunks.value = []

    console.log('Cleanup completed')
  }

  // Ensure cleanup when component is unmounted
  onUnmounted(async () => {
    await cleanup()
  })

  // Return public interface
  return {
    startRecording,  // Start voice recording
    stopRecording,   // Stop recording gracefully
    forceStop,       // Emergency stop
  }
}