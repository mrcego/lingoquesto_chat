import { ref, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat.store'
import type { VoiceMessage } from '@/types/chat'

export const useRealtimeChat = () => {
  const chatStore = useChatStore()
  const socket = ref<WebSocket | null>(null)
  const connectionStatus = ref<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = ref(1000)
  
  const connect = () => {
    if (socket.value?.readyState === WebSocket.OPEN) {
      return
    }
    
    connectionStatus.value = 'connecting'
    
    // For demo purposes, we'll use a mock WebSocket server URL
    // In production, replace with your actual WebSocket server
    const wsUrl = 'wss://echo.websocket.org' // Mock server for demo
    
    try {
      socket.value = new WebSocket(wsUrl)
      
      socket.value.onopen = () => {
        console.log('WebSocket connected')
        connectionStatus.value = 'connected'
        reconnectAttempts.value = 0
        reconnectDelay.value = 1000
        
        // Send user join message
        sendMessage({
          type: 'USER_JOIN',
          nickname: chatStore.userNickname,
          timestamp: new Date().toISOString()
        })
      }
      
      socket.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleIncomingMessage(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
      
      socket.value.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        connectionStatus.value = 'disconnected'
        socket.value = null
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttempts.value < maxReconnectAttempts) {
          scheduleReconnect()
        }
      }
      
      socket.value.onerror = (error) => {
        console.error('WebSocket error:', error)
        connectionStatus.value = 'error'
      }
      
    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
      connectionStatus.value = 'error'
      scheduleReconnect()
    }
  }
  
  const scheduleReconnect = () => {
    if (reconnectAttempts.value >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached')
      return
    }
    
    reconnectAttempts.value++
    console.log(`Attempting to reconnect in ${reconnectDelay.value}ms (attempt ${reconnectAttempts.value}/${maxReconnectAttempts})`)
    
    setTimeout(() => {
      connect()
    }, reconnectDelay.value)
    
    // Exponential backoff
    reconnectDelay.value = Math.min(reconnectDelay.value * 2, 30000)
  }
  
  const handleIncomingMessage = (data: any) => {
    switch (data.type) {
      case 'VOICE_MESSAGE':
        // Don't add own messages
        if (data.message.nickname !== chatStore.userNickname) {
          const incomingMessage: VoiceMessage = {
            ...data.message,
            timestamp: new Date(data.message.timestamp),
            isOwn: false,
            audioBlob: null // Audio will be loaded from URL
          }
          
          chatStore.messages.push(incomingMessage)
          chatStore.saveMessages()
        }
        break
        
      case 'USER_JOIN':
        console.log(`${data.nickname} joined the chat`)
        break
        
      case 'USER_LEAVE':
        console.log(`${data.nickname} left the chat`)
        break
        
      case 'TYPING':
        // Handle typing indicators if needed
        break
        
      default:
        console.log('Unknown message type:', data.type)
    }
  }
  
  const sendMessage = (message: any) => {
    if (socket.value?.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message)
    }
  }
  
  const sendVoiceMessage = async (voiceMessage: VoiceMessage) => {
    if (socket.value?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected. Voice message not sent.')
      return
    }
    
    try {
      // Convert audio blob to base64 for transmission
      const audioBase64 = await blobToBase64(voiceMessage.audioBlob!)
      
      const messageData = {
        type: 'VOICE_MESSAGE',
        message: {
          id: voiceMessage.id,
          nickname: voiceMessage.nickname,
          audioData: audioBase64,
          duration: voiceMessage.duration,
          timestamp: voiceMessage.timestamp.toISOString(),
          isOwn: false // Will be set to false for recipients
        }
      }
      
      sendMessage(messageData)
    } catch (error) {
      console.error('Error sending voice message:', error)
    }
  }
  
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix to get just the base64 data
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
  
  const base64ToBlob = (base64: string, mimeType: string = 'audio/wav'): Blob => {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }
  
  const disconnect = () => {
    if (socket.value) {
      // Send user leave message
      sendMessage({
        type: 'USER_LEAVE',
        nickname: chatStore.userNickname,
        timestamp: new Date().toISOString()
      })
      
      socket.value.close(1000, 'User disconnected')
      socket.value = null
    }
    connectionStatus.value = 'disconnected'
  }
  
  const cleanup = () => {
    disconnect()
    reconnectAttempts.value = 0
  }
  
  onMounted(() => {
    if (chatStore.isUserLoggedIn) {
      connect()
    }
  })
  
  onUnmounted(() => {
    cleanup()
  })
  
  return {
    connect,
    disconnect,
    sendVoiceMessage,
    sendMessage,
    connectionStatus,
    reconnectAttempts,
    cleanup
  }
}