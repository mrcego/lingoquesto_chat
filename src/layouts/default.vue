<script lang="ts" setup>
  import { useAppTheme } from '@/composables/useAppTheme';
  import { useChatStore } from '@/stores/chat.store';
  import { useRealtimeChat } from '@/composables/useRealtimeChat';
  import { getInitials } from '@/utils';

  const chatStore = useChatStore();
  const realtimeChat = useRealtimeChat();

  const drawer = ref(true);
  const snackbar = ref(false);
  const isConnected = ref(false);

  let unsubscribe: (() => void) | null = null;

  const { currentThemeName, toggleTheme } = useAppTheme();

  // Configurar el listener de usuarios
  const setupUsersListener = () => {
    if (unsubscribe) {
      unsubscribe();
    }

    console.log('🎧 Setting up users listener...');
    unsubscribe = realtimeChat.onOnlineUsersUpdated((users) => {
      console.log(
        '👥 Users update received:',
        users.map((u) => `${u.nickname}: ${u.online ? '🟢' : '🔴'}`)
      );
      chatStore.setOnlineUsers(users);
    });
  };

  // Conectar al usuario
  const connectUser = async () => {
    if (!chatStore.userNickname) {
      console.log('❌ No user nickname available for connection');
      return;
    }

    try {
      console.log('🔌 Connecting user:', chatStore.userNickname);

      // Configurar listener ANTES de conectar
      setupUsersListener();

      // Conectar
      await realtimeChat.connect();
      isConnected.value = true;

      console.log('✅ User connected successfully');
    } catch (error) {
      console.error('❌ Connection failed:', error);
      isConnected.value = false;
    }
  };

  // Observar cambios en el estado de login
  watch(
    () => chatStore.isUserLoggedIn,
    (isLoggedIn) => {
      console.log('👤 User login status changed:', isLoggedIn);
      if (isLoggedIn && chatStore.userNickname) {
        connectUser();
      } else if (!isLoggedIn) {
        isConnected.value = false;
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      }
    },
    { immediate: true }
  );

  // Observar el estado de conexión
  watch(
    () => realtimeChat.connectionStatus.value,
    (status) => {
      console.log('🔗 Connection status changed:', status);
      isConnected.value = status === 'connected';
    }
  );

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
</script>

<template>
  <v-layout>
    <v-navigation-drawer v-model="drawer" color="background">
      <v-list density="compact" nav>
        <v-list-subheader>Usuarios en línea</v-list-subheader>
        <v-list-item
          v-for="user in chatStore.onlineUsers"
          :key="user.nickname"
          :title="user.nickname"
          :subtitle="user.online ? 'En línea' : 'Desconectado'"
          :class="{ 'bg-grey-lighten-4': user.nickname === chatStore.userNickname }"
        >
          <template v-slot:prepend>
            <v-badge color="green" dot :model-value="user.online" offset-x="-3" offset-y="-3">
              <v-avatar size="40" color="accent">
                <span class="text-white">
                  {{ getInitials(user.nickname) }}
                </span>
              </v-avatar>
            </v-badge>
          </template>
        </v-list-item>
      </v-list>

      <template #prepend>
        <v-sheet class="pa-6 ga-1 align-center justify-center d-flex flex-column">
          <v-badge color="green" dot :model-value="isConnected">
            <v-avatar size="64" color="secondary">
              <span class="text-h5 text-background">{{ getInitials(chatStore.userNickname) }}</span>
            </v-avatar>
          </v-badge>
          <span class="text-subtitle-1 font-weight-medium">{{ chatStore.userNickname }}</span>
          <span class="text-caption text-medium-emphasis">
            {{
              isConnected
                ? 'En línea'
                : realtimeChat.connectionStatus.value === 'connecting'
                  ? 'Conectando...'
                  : 'Desconectado'
            }}
          </span>
        </v-sheet>
      </template>

      <template #append>
        <v-list-item
          class="ma-2"
          link
          nav
          prepend-icon="mdi-logout"
          title="Cerrar sesión"
          @click="chatStore.logout()"
        />
      </template>
    </v-navigation-drawer>

    <v-app-bar border="b" class="ps-4" flat color="background">
      <v-app-bar-nav-icon @click="drawer = !drawer" />

      <v-app-bar-title>LingoQuesto Chat</v-app-bar-title>

      <template #append>
        <v-btn plain icon @click="toggleTheme">
          <v-icon v-if="currentThemeName === 'customDark'">mdi-white-balance-sunny</v-icon>
          <v-icon v-else>mdi-moon-waning-crescent</v-icon>
        </v-btn>
      </template>
    </v-app-bar>
    <v-main>
      <router-view @on-error="snackbar = true" />
    </v-main>

    <AppFooter />
  </v-layout>

  <v-snackbar v-model="snackbar" location="top center" variant="elevated" color="info">
    <div class="text-subtitle-1 pb-2">¡Ups!</div>

    <p>Algo salió mal</p>

    <template v-slot:actions>
      <v-btn color="white" variant="text" @click="snackbar = false"> Close </v-btn>
    </template>
  </v-snackbar>
</template>
