<script setup lang="ts">
  import { useChatStore } from '@/stores/chat.store';

  const chatStore = useChatStore();

  const handleLogout = () => {
    chatStore.logout();
  };
</script>

<template>
  <v-app-bar color="primary" dark elevation="4" class="chat-header">
    <template #prepend>
      <v-icon size="32">mdi-microphone</v-icon>
    </template>

    <v-app-bar-title class="font-weight-bold"> MiniChat Voz </v-app-bar-title>

    <template #append>
      <div class="d-flex align-center mr-4">
        <v-chip color="success" variant="flat" class="mr-3">
          <v-icon left size="small">mdi-account</v-icon>
          {{ chatStore.userNickname }}
        </v-chip>

        <v-btn icon="mdi-logout" @click="handleLogout" variant="text" size="small" />
      </div>
    </template>
  </v-app-bar>
</template>

<style scoped>
  .chat-header {
    position: fixed !important;
    top: 0;
    z-index: 1000;
  }
</style>
