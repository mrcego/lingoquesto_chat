import { onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat.store'
import type { VoiceMessage } from '@/types/chat'

export const useRealtimeChat = () => {
  const chatStore = useChatStore()
  let channel: BroadcastChannel | null = null
  
  const initRealtimeConnection = () => {
    channel = new BroadcastChannel('voice-chat')
    
    channel.onmessage = (event) => {
      const { type, message } = event.data
      
      if (type === 'NEW_MESSAGE') {
        // Don't add own messages
        if (message.nickname !== chatStore.userNickname) {
          const incomingMessage: VoiceMessage = {
            ...message,
            timestamp: new Date(message.timestamp),
            isOwn: false,
            audioBlob: null // Will be null for incoming messages
          }
          
          chatStore.messages.push(incomingMessage)
          chatStore.saveMessages()
        }
      }
    }
  }
  
  const sendMessage = (message: VoiceMessage) => {
    if (channel) {
      channel.postMessage({
        type: 'NEW_MESSAGE',
        message: {
          ...message,
          audioBlob: null // Don't send blob through broadcast
        }
      })
    }
  }
  
  const cleanup = () => {
    if (channel) {
      channel.close()
      channel = null
    }
  }
  
  onMounted(() => {
    if (chatStore.isUserLoggedIn) {
      initRealtimeConnection()
    }
  })
  
  onUnmounted(() => {
    cleanup()
  })
  
  return {
    initRealtimeConnection,
    sendMessage,
    cleanup
  }
}