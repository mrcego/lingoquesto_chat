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

  // Actions
  const login = (nickname: string) => {
    user.value = {
      nickname: nickname.trim(),
      initials: `${nickname.trim().split(' ')[0].charAt(0).toUpperCase()}${nickname.trim().split(' ')[1].charAt(0).toUpperCase()}`,
      isLoggedIn: true
    }
    localStorage.setItem('user', JSON.stringify(user.value))
    loadMessages()
  }

  const logout = () => {
    user.value = {
      nickname: '',
      initials: '',
      isLoggedIn: false
    }
    localStorage.removeItem('user')
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

  // In your chat store
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
      user.value = JSON.parse(savedUser)
      if (user.value.isLoggedIn) {
        loadMessages()
      }
    }
  }

  return {
    // State
    user,
    messages,
    isRecording,
    recordingDuration,

    // Getters
    isUserLoggedIn,
    userNickname,
    userInitials,
    sortedMessages,

    // Actions
    login,
    logout,
    addMessage,
    setRecordingState,
    updateRecordingDuration,
    loadMessages,
    setMessages,
    initUser
  }
})