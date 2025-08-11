import {
  onValue,
  ref as dbRef,
  serverTimestamp,
  onDisconnect as onDisconnectRef,
  push,
  off,
  orderByChild,
  query,
  set
} from 'firebase/database'
import { db } from '@/firebase'
import { useChatStore } from '@/stores/chat.store'
import type { VoiceMessage } from '@/types/chat'

export const useRealtimeChat = () => {
  const chatStore = useChatStore()
  const connectionStatus = ref<'connected' | 'disconnected' | 'connecting'>('disconnected')
  const isOnlineRef = dbRef(db, '.info/connected')
  const onlineUsers = ref<{ [key: string]: string }>({})
  const userStatusRef = dbRef(db, 'status')

  const updateUserStatus = async (isOnline: boolean) => {
    if (!chatStore.userNickname) {
      console.log('No user nickname available')
      return
    }

    const userStatusPath = `status/${chatStore.userNickname.replace('.', ',')}`
    const userStatusRef = dbRef(db, userStatusPath)

    try {
      if (isOnline) {
        await push(userStatusRef, {
          status: 'online',
          lastChanged: serverTimestamp(),
          nickname: chatStore.userNickname
        })

        onDisconnectRef(userStatusRef).set({
          status: 'offline',
          lastChanged: serverTimestamp(),
          nickname: chatStore.userNickname
        })
      } else {
        await push(userStatusRef, {
          status: 'offline',
          lastChanged: serverTimestamp(),
          nickname: chatStore.userNickname
        })
      }
    } catch (error) {
      console.error('Error updating user status:', error)
    }
  }

  const onOnlineUsersUpdated = (callback: (users: Array<{
    nickname: string
    online: boolean
    lastChanged?: Date
  }>) => void) => {
    const statusRef = dbRef(db, 'status')
    console.log('Setting up online users listener...')

    const listener = onValue(statusRef, (snapshot) => {
      const statusData = snapshot.val() || {}
      console.log('Raw status data:', statusData)

      const users = Object.entries(statusData)
        .map(([_, data]: [string, any]) => {
          if (!data || typeof data !== 'object') {
            return null
          }

          // Use stored nickname if available, otherwise use the key
          const nickname = data.nickname || data.nickname
          if (!nickname) {
            console.warn('User data missing nickname:', data)
            return null
          }

          return {
            nickname: nickname,
            online: data.state === 'online',
            lastChanged: data.lastChanged ? new Date(data.lastChanged) : undefined
          }
        })
        .filter(Boolean)

      console.log('Processed users:', users)
      callback(users)
    })

    return () => {
      console.log('Cleaning up online users listener')
      off(statusRef, 'value', listener)
    }
  }

  const connect = async () => {
    connectionStatus.value = 'connecting'

    try {
      // Make sure we have a valid nickname
      const nickname = chatStore.userNickname
      if (!nickname) {
        throw new Error('No nickname provided')
      }

      // Normalize the nickname for Firebase key
      const normalizedNickname = nickname.replace(/\./g, ',')
      const userStatusRef = dbRef(db, `status/${normalizedNickname}`)
      const userStatusDatabaseRef = dbRef(db, '.info/connected')

      console.log('Connecting with nickname:', nickname, 'Normalized:', normalizedNickname)

      // Set up the onDisconnect first
      await set(userStatusRef, {
        state: 'online',
        nickname: nickname,
        lastChanged: serverTimestamp()
      });

      // Then set up the onDisconnect handler
      onDisconnectRef(userStatusRef).set({
        state: 'offline',
        nickname: nickname,
        lastChanged: serverTimestamp()
      });

      // Monitor connection state
      onValue(userStatusDatabaseRef, (snapshot) => {
        if (snapshot.val() === false) {
          connectionStatus.value = 'disconnected';
          return;
        }

        // When we connect, set our online status
        set(userStatusRef, {
          state: 'online',
          nickname: nickname,
          lastChanged: serverTimestamp()
        });
      });

      connectionStatus.value = 'connected';
      setupMessageListener()
    } catch (error) {
      console.error('Connection error:', error);
      connectionStatus.value = 'disconnected';
    }

  }

  const setupMessageListener = () => {
    try {
      const messagesRef = query(
        dbRef(db, 'messages'),
        orderByChild('timestamp')
      );

      return onValue(messagesRef, (snapshot) => {
        const messagesList: VoiceMessage[] = [];

        snapshot.forEach((childSnapshot) => {
          const msg = childSnapshot.val();

          messagesList.push({
            id: childSnapshot.key || Date.now().toString(),
            type: msg.type,
            nickname: msg.nickname,
            audioData: msg.audioData || '',
            mimeType: msg.mimeType || 'audio/webm',
            duration: msg.duration || 0,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            isOwn: msg.nickname === chatStore.userNickname
          });
        });

        chatStore.setMessages(messagesList);
      });
    } catch (error) {
      console.error('Error setting up message listener:', error);
    }
  }

  const sendVoiceMessage = async (voiceMessage: VoiceMessage) => {
    try {
      await push(dbRef(db, 'messages'), {
        type: 'VOICE_MESSAGE',
        nickname: voiceMessage.nickname,
        audioData: voiceMessage.audioData,
        mimeType: voiceMessage.mimeType,
        duration: voiceMessage.duration,
        timestamp: serverTimestamp(),
        isOwn: chatStore.userNickname === voiceMessage.nickname
      })
    } catch (error) {
      console.error('Error sending voice message:', error)
      throw error
    }
  }

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    try {
      const byteCharacters = atob(base64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      return new Blob([new Uint8Array(byteNumbers)], { type: mimeType })
    } catch (error) {
      console.error('Error converting base64 to blob:', error)
      throw error
    }
  }

  const disconnect = () => {
    updateUserStatus(false)
    off(userStatusRef)
    off(isOnlineRef)
    connectionStatus.value = 'disconnected'
  }

  const cleanup = () => {
    if (userStatusRef) {
      set(userStatusRef, {
        state: 'offline',
        lastChanged: serverTimestamp()
      });
    }

    disconnect()
  }

  onUnmounted(() => {
    cleanup()
  })

  return {
    connect,
    disconnect,
    sendVoiceMessage,
    connectionStatus,
    onlineUsers: computed(() => Object.values(onlineUsers.value)),
    onOnlineUsersUpdated,
    base64ToBlob,
    cleanup,
  }
}
