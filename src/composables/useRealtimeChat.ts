import {
  onValue,
  ref as dbRef,
  serverTimestamp,
  onDisconnect as onDisconnectRef,
  push,
  off,
  orderByChild,
  query,
  set,
} from 'firebase/database';
import { db } from '@/firebase';

import { useChatStore } from '@/stores/chat.store';

import type { VoiceMessage } from '@/types/chat';

/**
 * Composable to handle real-time features for the chat
 */
export const useRealtimeChat = () => {
  const chatStore = useChatStore();
  /**
   * Connection status (connected, disconnected, connecting)
   */
  const connectionStatus = ref<'connected' | 'disconnected' | 'connecting'>('disconnected');
  /**
   * Reference to the Realtime Database's `.info/connected` path which indicates
   * whether the client is connected or not.
   */
  const isOnlineRef = dbRef(db, '.info/connected');
  /**
   * Online users (nickname, online status, last changed timestamp)
   */
  const onlineUsers = ref<{ [key: string]: string }>({});

  let messageListener: (() => void) | null = null;
  let statusListener: (() => void) | null = null;

  /**
   * Update user status (online/offline) in the database
   * @param isOnline true if the user is online, false otherwise
   */
  const updateUserStatus = async (isOnline: boolean) => {
    if (!chatStore.userNickname) {
      console.log('No user nickname available');
      return;
    }

    const normalizedNickname = chatStore.userNickname.replace(/\./g, ',');
    const userStatusPath = `status/${normalizedNickname}`;
    /**
     * User status ref (status/{nickname})
     */
    const userStatusRef = dbRef(db, userStatusPath);

    try {
      const statusData = {
        state: isOnline ? 'online' : 'offline',
        lastChanged: serverTimestamp(),
        nickname: chatStore.userNickname,
      };

      console.log(
        `Setting user status to ${isOnline ? 'online' : 'offline'} for:`,
        chatStore.userNickname
      );

      await set(userStatusRef, statusData);

      if (isOnline) {
        // Only set onDisconnect when going online
        onDisconnectRef(userStatusRef).set({
          state: 'offline',
          lastChanged: serverTimestamp(),
          nickname: chatStore.userNickname,
        });
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  };

  /**
   * Set up a listener for online users
   * @param callback function to call when online users change
   */
  const onOnlineUsersUpdated = (
    callback: (
      users: Array<{
        nickname: string;
        online: boolean;
        lastChanged?: Date;
      }>
    ) => void
  ) => {
    const statusRef = dbRef(db, 'status');
    console.log('Setting up online users listener...');

    statusListener = onValue(
      statusRef,
      (snapshot) => {
        const statusData = snapshot.val() || {};
        console.log('Raw status data received:', statusData);

        const users = Object.entries(statusData)
          .map(([key, data]: [string, any]) => {
            if (!data || typeof data !== 'object') {
              console.warn('Invalid data for key:', key, data);
              return null;
            }

            // Use the nickname stored in the data
            const { nickname } = data;
            if (!nickname) {
              console.warn('User data missing nickname:', key, data);
              return null;
            }

            const isOnline = data.state === 'online';
            console.log(
              `User ${nickname}: ${isOnline ? 'ONLINE' : 'OFFLINE'} (state: ${data.state})`
            );

            return {
              nickname: nickname,
              online: isOnline,
              lastChanged: data.lastChanged ? new Date(data.lastChanged) : undefined,
            };
          })
          .filter(Boolean) as Array<{
          nickname: string;
          online: boolean;
          lastChanged?: Date;
        }>;

        console.log(
          'Final processed users:',
          users.map((u) => `${u.nickname}: ${u.online ? 'ONLINE' : 'OFFLINE'}`)
        );
        callback(users);
      },
      (error) => {
        console.error('Error listening to status updates:', error);
      }
    );

    return () => {
      console.log('Cleaning up online users listener');
      if (statusListener) {
        off(statusRef, 'value', statusListener);
        statusListener = null;
      }
    };
  };

  /**
   * Connect to the real-time database and set up listeners
   */
  const connect = async () => {
    connectionStatus.value = 'connecting';

    try {
      // Make sure we have a valid nickname
      const nickname = chatStore.userNickname;
      if (!nickname) {
        throw new Error('No nickname provided');
      }

      console.log('Connecting with nickname:', nickname);

      // First, set up the connection state monitoring
      const userStatusDatabaseRef = dbRef(db, '.info/connected');

      // Set up connection monitoring BEFORE setting status
      const connectionListener = onValue(userStatusDatabaseRef, async (snapshot) => {
        const isConnected = snapshot.val();
        console.log('Firebase connection status:', isConnected);

        if (isConnected) {
          console.log('Connected to Firebase, setting online status...');
          try {
            await updateUserStatus(true);
            connectionStatus.value = 'connected';
            console.log('Successfully set online status');
          } catch (error) {
            console.error('Error setting online status:', error);
          }
        } else {
          console.log('Disconnected from Firebase');
          connectionStatus.value = 'disconnected';
        }
      });

      // Wait a bit for the connection to establish, then explicitly set status
      setTimeout(async () => {
        try {
          await updateUserStatus(true);
          console.log('Explicitly set user status to online after timeout');
        } catch (error) {
          console.error('Error in timeout status update:', error);
        }
      }, 1000);

      setupMessageListener();
    } catch (error) {
      console.error('Connection error:', error);
      connectionStatus.value = 'disconnected';
    }
  };

  /**
   * Set up a listener for messages
   */
  const setupMessageListener = () => {
    try {
      const messagesRef = query(dbRef(db, 'messages'), orderByChild('timestamp'));

      // Remove any existing listener first
      if (messageListener) {
        off(messagesRef, 'value', messageListener);
      }

      messageListener = onValue(
        messagesRef,
        (snapshot) => {
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
              isOwn: msg.nickname === chatStore.userNickname,
            });
          });
          chatStore.setMessages(messagesList);
        },
        (error) => {
          console.error('Error in message listener:', error);
        }
      );
    } catch (error) {
      console.error('Error setting up message listener:', error);
    }
  };

  /**
   * Send a voice message to the real-time database
   * @param voiceMessage voice message to send
   */
  const sendVoiceMessage = async (voiceMessage: VoiceMessage) => {
    try {
      await push(dbRef(db, 'messages'), {
        type: 'VOICE_MESSAGE',
        nickname: voiceMessage.nickname,
        audioData: voiceMessage.audioData,
        mimeType: voiceMessage.mimeType,
        duration: voiceMessage.duration,
        timestamp: serverTimestamp(),
        isOwn: chatStore.userNickname === voiceMessage.nickname,
      });
    } catch (error) {
      console.error('Error sending voice message:', error);
      throw error;
    }
  };

  /**
   * Convert a base64 string to a blob
   * @param base64 base64 string
   * @param mimeType mime type of the blob
   */
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
    } catch (error) {
      console.error('Error converting base64 to blob:', error);
      throw error;
    }
  };

  /**
   * Disconnect from the real-time database and clean up listeners
   */
  const disconnect = () => {
    console.log('Disconnecting...');

    // Update status to offline using the dedicated function
    updateUserStatus(false);

    // Clean up listeners
    if (messageListener) {
      const messagesRef = dbRef(db, 'messages');
      off(messagesRef, 'value', messageListener);
      messageListener = null;
    }

    if (statusListener) {
      const statusRef = dbRef(db, 'status');
      off(statusRef, 'value', statusListener);
      statusListener = null;
    }

    off(isOnlineRef);
    connectionStatus.value = 'disconnected';
  };

  /**
   * Clean up resources when the component is unmounted
   */
  const cleanup = () => {
    disconnect();
  };

  onUnmounted(() => {
    cleanup();
  });

  return {
    connect,
    disconnect,
    sendVoiceMessage,
    connectionStatus,
    onlineUsers: computed(() => Object.values(onlineUsers.value)),
    onOnlineUsersUpdated,
    base64ToBlob,
    cleanup,
  };
};
