import {
  onValue,
  ref as dbRef,
  serverTimestamp,
  onDisconnect as onDisconnectRef,
  push,
  off,
  orderByChild,
  query
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

  const connect = () => {
    connectionStatus.value = 'connecting'

    onValue(isOnlineRef, (snapshot) => {
      const isConnected = snapshot.val() === true
      connectionStatus.value = isConnected ? 'connected' : 'disconnected'
      updateUserStatus(isConnected)
    })

    onValue(userStatusRef, (snapshot) => {
      const users = snapshot.val() || {}
      const online: { [key: string]: string } = {}

      Object.entries(users).forEach(([userId, userData]: [string, any]) => {
        if (typeof userData === 'object' && userData !== null) {
          if (userData.status === 'online') {
            online[userId] = userData.nickname || userId
          }
        } else if (userData === 'online') {
          online[userId] = userId
        }
      })

      onlineUsers.value = online
    })

    setupMessageListener()

    connectionStatus.value = 'connected'
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

  const sendMessage = async (message: any) => {
    try {
      await push(dbRef(db, 'messages'), {
        ...message,
        timestamp: serverTimestamp()
      })
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const sendVoiceMessage = async (voiceMessage: VoiceMessage) => {
    try {
      await push(dbRef(db, 'messages'), {
        type: 'VOICE_MESSAGE',
        nickname: voiceMessage.nickname,
        audioData: voiceMessage.audioData,       // Solo el base64 puro
        mimeType: voiceMessage.mimeType,                // Tipo de audio
        duration: voiceMessage.duration,
        timestamp: serverTimestamp(),
        isOwn: chatStore.userNickname === voiceMessage.nickname
      })
    } catch (error) {
      console.error('Error sending voice message:', error)
      throw error
    }
  }

  const blobToBase64 = (blob: Blob): Promise<{ base64: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const [prefix, data] = result.split(',') // "data:audio/webm;codecs=opus;base64", "<base64>"
        const mimeType = prefix.match(/data:(.*);base64/)?.[1] || 'audio/webm'
        resolve({ base64: data, mimeType })
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
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
    disconnect()
  }

  onUnmounted(() => {
    cleanup()
  })

  return {
    connect,
    disconnect,
    sendMessage,
    sendVoiceMessage,
    connectionStatus,
    onlineUsers: computed(() => Object.values(onlineUsers.value)),
    base64ToBlob,
    cleanup,
  }
}
