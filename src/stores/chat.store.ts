// Import the useRealtimeChat composable here to avoid timing issues
import { useRealtimeChat } from '@/composables/useRealtimeChat'

import type { VoiceMessage, User } from '@/types/chat'

import { getInitials } from '@/utils'


export const useChatStore = defineStore('chat', () => {
  const realtimeChat = useRealtimeChat()


  // State
  /**
   * The user object containing their nickname and initials
   */
  const user = ref<User>({
    nickname: '',
    initials: '',
    isLoggedIn: false
  })

  /**
   * The array of messages in the chat
   */
  const messages = ref<VoiceMessage[]>([])

  /**
   * Whether the user is currently recording a voice message
   */
  const isRecording = ref(false)

  /**
   * The duration of the current recording in seconds
   */
  const recordingDuration = ref(0)

  /**
   * The array of online users in the chat
   */
  const onlineUsers = ref<Array<{
    nickname: string
    online: boolean
    lastChanged?: Date
  }>>([])

  // Getters
  /**
   * Whether the user is currently logged in
   */
  const isUserLoggedIn = computed(() => user.value.isLoggedIn)

  /**
   * The user's nickname
   */
  const userNickname = computed(() => user.value.nickname)

  /**
   * The user's initials
   */
  const userInitials = computed(() => user.value.initials)

  /**
   * The sorted array of messages in the chat
   */
  const sortedMessages = computed(() =>
    [...messages.value].sort((a, b) => {
      const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime();
      const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime();
      return timeA - timeB;
    })
  )

  // Computed property to filter out the current user from the online users list
  const otherOnlineUsers = computed(() =>
    onlineUsers.value.filter(user => user.nickname !== userNickname.value)
  )

  // Actions
  /**
   * Login a user with a given nickname
   * @param nickname The nickname to log in with
   */
  const login = (nickname: string) => {
    user.value = {
      nickname: nickname,
      initials: getInitials(nickname),
      isLoggedIn: true
    }

    localStorage.setItem('user', JSON.stringify(user.value))
    loadMessages()
  }

  /**
   * Logout the user
   */
  const logout = async () => {


    console.log('🔌 Disconnecting user:', user.value.nickname)
    realtimeChat.disconnect()

    // Clear the state
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

  /**
   * Add a new message to the chat
   * @param message The new message to add
   */
  const addMessage = (message: VoiceMessage) => {
    messages.value.push(message)
    saveMessages()
  }

  /**
   * Set the recording state of the user
   * @param recording Whether the user is recording or not
   */
  const setRecordingState = (recording: boolean) => {
    isRecording.value = recording
    if (!recording) {
      recordingDuration.value = 0
    }
  }

  /**
   * Update the recording duration of the user
   * @param duration The new recording duration
   */
  const updateRecordingDuration = (duration: number) => {
    recordingDuration.value = duration
  }

  /**
   * Load the messages from local storage
   */
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

  /**
   * Set the messages in the chat
   * @param newMessages The new messages to set
   */
  const setMessages = (newMessages: VoiceMessage[]) => {
    messages.value = newMessages;
    saveMessages(); // Save to localStorage
  }

  /**
   * Save the messages in the chat to local storage
   */
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

  /**
   * Initialize the user from local storage
   * @return Whether the user was successfully initialized
   */
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

  /**
   * Set the online users in the chat
   * @param users The array of online users
   */
  const setOnlineUsers = (users: Array<{
    nickname: string
    online: boolean
    lastChanged?: Date
  }>) => {
    console.log('📊 Setting online users in store:', users.map(u => `${u.nickname}: ${u.online ? '🟢' : '🔴'}`))
    onlineUsers.value = users
  }

  // Method to get the online status of a specific user
  const isUserOnline = (nickname: string): boolean => {
    const foundUser = onlineUsers.value.find(u => u.nickname === nickname)
    return foundUser?.online || false
  }

  // Computed property to get the number of online users
  const getOnlineUsersCount = computed(() =>
    onlineUsers.value.filter(user => user.online).length
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