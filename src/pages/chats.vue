<script setup lang="ts">
  import { useChatStore } from '@/stores/chat.store';
  import { useRealtimeChat } from '@/composables/useRealtimeChat';
  import VoiceMessage from '@/components/VoiceMessage.vue';
  import VoiceRecorder from '@/components/VoiceRecorder.vue';

  const chatStore = useChatStore();
  const messagesContainer = ref<HTMLElement>();

  // Initialize realtime connection
  useRealtimeChat();

  // Auto-scroll to bottom when new messages arrive
  watch(
    () => chatStore.messages.length,
    async () => {
      await nextTick();
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
      }
    },
    { flush: 'post' }
  );
</script>

<template>
  <div class="chat-interface d-flex flex-column" style="height: calc(100vh - 100px)">
    <!-- Messages Container -->
    <div class="messages-container flex-grow-1" ref="messagesContainer">
      <v-container class="py-4">
        <div v-if="chatStore.sortedMessages.length === 0" class="empty-state">
          <div class="text-center">
            <v-icon color="grey-lighten-1" size="64">mdi-chat-outline</v-icon>
            <h3 class="text-h6 mt-4 text-grey-darken-1">No hay mensajes aún</h3>
            <p class="text-body-2 text-grey-darken-1">¡Envía tu primer mensaje de voz!</p>
          </div>
        </div>

        <div v-else class="messages-list">
          <VoiceMessage
            v-for="message in chatStore.sortedMessages"
            :key="message.id"
            :message="message"
            class="message-item"
          />
        </div>
      </v-container>
    </div>

    <VoiceRecorder @on-error="$emit('on-error')" />
  </div>
</template>

<style scoped>
  .chat-interface {
    background: linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 100%);
  }

  .messages-container {
    overflow-y: auto;
    padding-top: 64px; /* Account for fixed header */
    scroll-behavior: smooth;
  }

  .messages-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-bottom: 20px;
  }

  .message-item {
    animation: fadeInUp 0.3s ease-out;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 50vh;
  }

  /* Scrollbar styling */
  .messages-container::-webkit-scrollbar {
    width: 8px;
  }

  .messages-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .messages-container::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .messages-container::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.3);
  }
</style>
