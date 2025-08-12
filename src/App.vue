<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
  import { useChatStore } from '@/stores/chat.store';
  import { useRealtimeChat } from '@/composables/useRealtimeChat';

  const chatStore = useChatStore();

  const realtimeChat = useRealtimeChat();

  const isUserLoggedIn = computed(() => chatStore.isUserLoggedIn);

  const router = useRouter();

  watch(
    isUserLoggedIn,
    (isLoggedIn) => {
      router.push(isLoggedIn ? '/chats' : '/');
    },
    { immediate: true }
  );

  onMounted(async () => {
    // Initialize user from localStorage
    const userInitialized = chatStore.initUser();

    if (userInitialized) {
      // Reconnect to Firebase
      await realtimeChat.connect();
    }
  });

  onBeforeUnmount(() => {
    realtimeChat.cleanup();
  });
</script>

<style>
  html {
    overflow-y: auto;
  }

  body {
    margin: 0;
    font-family: 'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif;
  }

  .v-application {
    font-family: 'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif !important;
  }

  /* Custom scrollbar for webkit browsers */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.3);
  }
</style>
