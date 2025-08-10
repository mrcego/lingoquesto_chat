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
    [...messages.value].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
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
    
    // Broadcast to other tabs/windows
    const channel = new BroadcastChannel('voice-chat')
    channel.postMessage({
      type: 'NEW_MESSAGE',
      message: {
        ...message,
        audioBlob: null, // Don't send blob through broadcast
        audioUrl: message.audioUrl
      }
    })
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
  
  const resetRecordingDuration = () => {
    recordingDuration.value = 0
  }
  
  const loadMessages = () => {
    const saved = localStorage.getItem(`messages_${user.value.nickname}`)
    if (saved) {
      const parsedMessages = JSON.parse(saved)
      messages.value = parsedMessages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
        audioBlob: null // Don't store blobs in localStorage
      }))
    }
  }
  
  const saveMessages = () => {
    if (user.value.isLoggedIn) {
      const messagesToSave = messages.value.map(msg => ({
        ...msg,
        audioBlob: null // Don't save blobs
      }))
      localStorage.setItem(`messages_${user.value.nickname}`, JSON.stringify(messagesToSave))
    }
  }
  
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
    sortedMessages,
    
    // Actions
    login,
    logout,
    addMessage,
    setRecordingState,
    updateRecordingDuration,
    resetRecordingDuration,
    loadMessages,
    saveMessages,
    initUser
  }
})