import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { VoiceMessage, User } from '@/types/chat'

export const useChatStore = defineStore('chat', () => {
  // State
  const user = ref<User>({
    nickname: '',
    initials: '',
    isLoggedIn: false
  })

  const messages = ref<VoiceMessage[]>([])
  const isRecording = ref(false)
  const recordingDuration = ref(0)
  const onlineUsers = ref<Array<{
    nickname: string
    online: boolean
    lastChanged?: Date
  }>>([])

  // Getters
  const isUserLoggedIn = computed(() => user.value.isLoggedIn)
  const userNickname = computed(() => user.value.nickname)
  const userInitials = computed(() => user.value.initials)
  const sortedMessages = computed(() =>
    [...messages.value].sort((a, b) => {
      const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime();
      const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime();
      return timeA - timeB;
    })
  )

  // Computed para filtrar usuarios online (excluyendo al usuario actual)
  const otherOnlineUsers = computed(() =>
    onlineUsers.value.filter(u => u.nickname !== userNickname.value)
  )

  // Actions
  const login = (nickname: string) => {
    const trimmedNickname = nickname.trim()
    const nameParts = trimmedNickname.split(' ')

    user.value = {
      nickname: trimmedNickname,
      initials: nameParts.length >= 2
        ? `${nameParts[0].charAt(0).toUpperCase()}${nameParts[1].charAt(0).toUpperCase()}`
        : `${nameParts[0].charAt(0).toUpperCase()}${nameParts[0].charAt(1)?.toUpperCase() || ''}`,
      isLoggedIn: true
    }

    localStorage.setItem('user', JSON.stringify(user.value))
    loadMessages()
  }

  const logout = async () => {
    // Importar useRealtimeChat aquí para evitar problemas de timing
    const { useRealtimeChat } = await import('@/composables/useRealtimeChat')
    const realtimeChat = useRealtimeChat()

    console.log('🔌 Disconnecting user:', user.value.nickname)
    realtimeChat.disconnect()

    // Limpiar estado
    user.value = {
      nickname: '',
      initials: '',
      isLoggedIn: false
    }
    messages.value = []
    onlineUsers.value = []

    localStorage.removeItem('user')
    console.log('✅ User logged out and disconnected')
  }

  const addMessage = (message: VoiceMessage) => {
    messages.value.push(message)
    saveMessages()
  }

  const setRecordingState = (recording: boolean) => {
    isRecording.value = recording
    if (!recording) {
      recordingDuration.value = 0
    }
  }

  const updateRecordingDuration = (duration: number) => {
    recordingDuration.value = duration
  }

  const loadMessages = () => {
    try {
      const savedMessages = localStorage.getItem(`chat_messages_${user.value.nickname}`);
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        // Ensure messages are properly formatted with Date objects
        messages.value = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp), // Convert string timestamp back to Date
          audioData: msg.audioData || '',     // Ensure audioData exists
          isOwn: msg.nickname === user.value.nickname // Ensure isOwn is set correctly
        }));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }

  const setMessages = (newMessages: VoiceMessage[]) => {
    messages.value = newMessages;
    saveMessages(); // Save to localStorage
  }

  const saveMessages = () => {
    try {
      const messagesToSave = messages.value.map(msg => {
        // Create a clean copy without any Vue reactivity
        const { id, type, nickname, audioData, mimeType, duration, timestamp, isOwn } = msg;
        return {
          id,
          type,
          nickname,
          audioData,  // This should be the base64 string
          mimeType,
          duration,
          timestamp: timestamp.toString(), // Convert Date to string
          isOwn
        };
      });
      localStorage.setItem(`chat_messages_${userNickname.value}`, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  };

  const initUser = () => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        user.value = JSON.parse(savedUser)
        if (user.value.isLoggedIn && user.value.nickname) {
          console.log('🔄 Restoring user session:', user.value.nickname)
          // Load messages from localStorage first for instant display
          loadMessages()
          return true
        }
      } catch (error) {
        console.error('Error parsing saved user:', error)
        localStorage.removeItem('user')
      }
    }
    return false
  }

  const setOnlineUsers = (users: Array<{
    nickname: string
    online: boolean
    lastChanged?: Date
  }>) => {
    console.log('📊 Setting online users in store:', users.map(u => `${u.nickname}: ${u.online ? '🟢' : '🔴'}`))
    onlineUsers.value = users
  }

  // Método para obtener el estado de conexión de un usuario específico
  const isUserOnline = (nickname: string): boolean => {
    const foundUser = onlineUsers.value.find(u => u.nickname === nickname)
    return foundUser?.online || false
  }

  // Método para obtener la cantidad de usuarios online
  const getOnlineUsersCount = computed(() =>
    onlineUsers.value.filter(u => u.online).length
  )

  return {
    // State
    user,
    messages,
    isRecording,
    recordingDuration,
    onlineUsers: otherOnlineUsers,

    // Getters
    isUserLoggedIn,
    userNickname,
    userInitials,
    sortedMessages,
    getOnlineUsersCount,

    // Actions
    login,
    logout,
    addMessage,
    setRecordingState,
    updateRecordingDuration,
    loadMessages,
    setMessages,
    initUser,
    setOnlineUsers,
    isUserOnline
  }
})